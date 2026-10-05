import { and, asc, eq, gt, ne, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { BancoServidor } from '../db';
import { blobSync, chaveSync } from '../db/schema';
import type { Variaveis } from '../tipos';

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_BLOB = 1024 * 1024;

const Push = z.object({
  dispositivo: z.string().min(4).max(64),
  blobs: z
    .array(
      z
        .string()
        .regex(BASE64, 'blob deve estar em base64')
        .max(Math.ceil((MAX_BLOB * 4) / 3)),
    )
    .min(1)
    .max(100),
});

const Chave = z.object({
  sal: z.string().regex(BASE64).max(64),
  verificador: z.string().regex(BASE64).max(512),
});

/**
 * Relay cego: guarda e devolve blobs opacos por conta. Não decifra, não
 * interpreta e não mescla nada — a lógica de convergência vive no aparelho.
 */
export function rotasSync(db: BancoServidor, cotaBytes: number) {
  const app = new Hono<{ Variables: Variaveis }>();

  app.get('/chave', async (c) => {
    const [ch] = await db.select().from(chaveSync).where(eq(chaveSync.userId, c.var.usuario.id));
    if (!ch) return c.json({ erro: 'sem-chave' }, 404);
    return c.json({ sal: ch.sal, verificador: ch.verificador });
  });

  app.put('/chave', async (c) => {
    const corpo = Chave.safeParse(await c.req.json().catch(() => null));
    if (!corpo.success)
      return c.json({ erro: 'corpo-invalido', detalhes: corpo.error.issues }, 400);
    const inserido = await db
      .insert(chaveSync)
      .values({ userId: c.var.usuario.id, ...corpo.data })
      .onConflictDoNothing()
      .returning();
    if (!inserido.length) return c.json({ erro: 'chave-ja-existe' }, 409);
    return c.json({ ok: true }, 201);
  });

  app.post('/push', async (c) => {
    const corpo = Push.safeParse(await c.req.json().catch(() => null));
    if (!corpo.success)
      return c.json({ erro: 'corpo-invalido', detalhes: corpo.error.issues }, 400);
    const userId = c.var.usuario.id;
    const [{ usado } = { usado: 0 }] = await db
      .select({ usado: sql<number>`coalesce(sum(${blobSync.tamanho}), 0)::int` })
      .from(blobSync)
      .where(eq(blobSync.userId, userId));
    const novos = corpo.data.blobs.map((b) => ({
      userId,
      dispositivo: corpo.data.dispositivo,
      conteudo: b,
      tamanho: Math.floor((b.length * 3) / 4),
    }));
    const total = novos.reduce((s, b) => s + b.tamanho, 0);
    if (novos.some((b) => b.tamanho > MAX_BLOB)) return c.json({ erro: 'blob-grande-demais' }, 413);
    if (Number(usado) + total > cotaBytes) return c.json({ erro: 'cota-excedida' }, 413);
    const ids = await db.insert(blobSync).values(novos).returning({ id: blobSync.id });
    return c.json({ cursor: Math.max(...ids.map((i) => i.id)) }, 201);
  });

  app.get('/pull', async (c) => {
    const desde = Number(c.req.query('desde') ?? 0);
    const limite = Math.min(500, Math.max(1, Number(c.req.query('limite') ?? 200)));
    const dispositivo = c.req.query('dispositivo');
    if (!Number.isFinite(desde) || desde < 0) return c.json({ erro: 'cursor-invalido' }, 400);
    const filtros = [eq(blobSync.userId, c.var.usuario.id), gt(blobSync.id, desde)];
    // O próprio aparelho já tem o que enviou; pular economiza banda.
    if (dispositivo) filtros.push(ne(blobSync.dispositivo, dispositivo));
    const linhas = await db
      .select({ id: blobSync.id, conteudo: blobSync.conteudo })
      .from(blobSync)
      .where(and(...filtros))
      .orderBy(asc(blobSync.id))
      .limit(limite + 1);
    const pagina = linhas.slice(0, limite);
    // Cursor avança até o maior id visto, inclusive os pulados do próprio aparelho.
    const [{ maximo } = { maximo: desde }] = await db
      .select({ maximo: sql<number>`coalesce(max(${blobSync.id}), ${desde})::bigint` })
      .from(blobSync)
      .where(eq(blobSync.userId, c.var.usuario.id));
    const temMais = linhas.length > limite;
    return c.json({
      blobs: pagina,
      cursor: temMais ? pagina.at(-1)!.id : Number(maximo),
      temMais,
    });
  });

  /** Recomeçar: apaga blobs e chave (os dados locais dos aparelhos ficam). */
  app.delete('/', async (c) => {
    await db.delete(blobSync).where(eq(blobSync.userId, c.var.usuario.id));
    await db.delete(chaveSync).where(eq(chaveSync.userId, c.var.usuario.id));
    return c.body(null, 204);
  });

  return app;
}
