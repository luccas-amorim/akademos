import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Auth } from './auth';
import type { BancoServidor } from './db';
import { user } from './db/schema';
import type { Env } from './env';
import { rotasEstatisticas } from './rotas/estatisticas';
import { rotasRegistro } from './rotas/registro';
import { rotasSync } from './rotas/sync';
import type { Variaveis } from './tipos';

export interface Dependencias {
  db: BancoServidor;
  auth: Auth;
  env: Env;
  /** Desliga o log de requisições (testes). */
  silencioso?: boolean;
}

/** Monta a API. Separada de index.ts para ser testada com app.request(). */
export function criarApp({ db, auth, env, silencioso }: Dependencias) {
  const origens = env.ORIGENS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const app = new Hono();

  if (!silencioso) app.use(logger());
  app.use(secureHeaders());
  app.use(
    '*',
    cors({
      origin: origens,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      credentials: true,
      maxAge: 600,
    }),
  );

  app.get('/saude', (c) => c.json({ ok: true }));
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  const exigirConta = createMiddleware<{ Variables: Variaveis }>(async (c, next) => {
    const sessao = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!sessao) throw new HTTPException(401, { message: 'sessao-necessaria' });
    c.set('usuario', { id: sessao.user.id, email: sessao.user.email, name: sessao.user.name });
    await next();
  });

  const sync = new Hono<{ Variables: Variaveis }>();
  sync.use(exigirConta);
  sync.route('/', rotasSync(db, env.COTA_SYNC));
  app.route('/sync', sync);

  /** LGPD: apagar a conta remove sessões, chaves e blobs (cascata). */
  const conta = new Hono<{ Variables: Variaveis }>();
  conta.use(exigirConta);
  conta.delete('/', async (c) => {
    await db.delete(user).where(eq(user.id, c.var.usuario.id));
    return c.body(null, 204);
  });
  app.route('/conta', conta);

  app.route('/stats', rotasEstatisticas(db, { k: env.K_MINIMO, epsilon: env.EPSILON }));
  app.route('/registry', rotasRegistro());

  app.onError((erro, c) => {
    if (erro instanceof HTTPException) return c.json({ erro: erro.message }, erro.status);
    console.error(erro);
    return c.json({ erro: 'erro-interno' }, 500);
  });
  return app;
}
