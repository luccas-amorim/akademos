import type {
  Colecao,
  Disciplina,
  Matriz,
  PacoteInstituicao,
  Prerequisito,
  Repositorios,
} from '@akademos/core';
import { and, eq, getTableColumns, gt, sql } from 'drizzle-orm';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { Mutex, type SqlDriver } from './driver';
import { migrar } from './migrar';
import * as schema from './schema';
import { TABELAS_SINCRONIZADAS, type TabelaSincronizada } from './schema';

export type DrizzleDb = SqliteRemoteDatabase<typeof schema>;

/** Fonte de carimbos HLC (implementada em `@akademos/sync`). */
export interface Relogio {
  tick(): string;
  receber(hlc: string): void;
}

/** Uma escrita numa célula: o átomo da sincronização. */
export interface Op {
  hlc: string;
  tabela: TabelaSincronizada;
  linhaId: string;
  /** Nome SQL da coluna. */
  coluna: string;
  valor: unknown;
}

export interface LogDeOps {
  /** Ops geradas neste aparelho com carimbo posterior a `cursor`. */
  locaisDesde(cursor: string | null): Promise<Op[]>;
  /** Aplica ops de outro aparelho (último a escrever vence, por célula). */
  aplicarRemotas(ops: readonly Op[]): Promise<number>;
  lerMeta(chave: string): Promise<string | null>;
  gravarMeta(chave: string, valor: string): Promise<void>;
}

export interface Banco {
  db: DrizzleDb;
  repos: Repositorios;
  ops: LogDeOps;
  /**
   * Executa leituras sem intercalar com transações em andamento (a conexão é
   * única: sem isto, uma leitura poderia ver uma escrita pela metade).
   */
  consistente<R>(fn: () => Promise<R>): Promise<R>;
  /** Exporta todas as tabelas como objetos simples (LGPD: portabilidade). */
  exportar(): Promise<Record<string, unknown[]>>;
  /** Apaga todos os dados deste aparelho, mantendo o esquema. */
  apagarTudo(): Promise<void>;
  fechar(): Promise<void>;
}

type LinhaSinc = Record<string, unknown> & { id: string; apagado?: boolean };

function criarDrizzle(driver: SqlDriver): DrizzleDb {
  return drizzle(
    async (query, params, method) => {
      const rows = await driver.query(query, params);
      return { rows: method === 'get' ? (rows[0] as unknown[]) : rows };
    },
    { schema },
  );
}

/** Mapas entre nome da propriedade (camelCase) e nome SQL de cada coluna. */
function colunasDe(tabela: SQLiteTable) {
  const porPropriedade = getTableColumns(tabela);
  const porSql = new Map(Object.entries(porPropriedade).map(([prop, col]) => [col.name, prop]));
  return { porPropriedade, porSql };
}

function semApagado<T>(linha: LinhaSinc): T {
  const { apagado: _apagado, ...resto } = linha;
  return resto as T;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function abrirBanco(driver: SqlDriver, relogio: Relogio): Promise<Banco> {
  await migrar(driver);
  const db = criarDrizzle(driver);
  const mutex = new Mutex();

  /** Executa `fn` numa transação exclusiva. */
  const emTransacao = <R>(fn: () => Promise<R>): Promise<R> =>
    mutex.executar(async () => {
      await driver.exec('BEGIN');
      try {
        const r = await fn();
        await driver.exec('COMMIT');
        return r;
      } catch (e) {
        await driver.exec('ROLLBACK');
        throw e;
      }
    });

  /* ——— Escrita com registro de ops ——— */

  async function gravarComOps(nome: TabelaSincronizada, nova: LinhaSinc): Promise<void> {
    const tabela = TABELAS_SINCRONIZADAS[nome];
    const { porPropriedade } = colunasDe(tabela);
    const atual = (await db.select().from(tabela).where(eq(tabela.id, nova.id)).get()) as
      LinhaSinc | undefined;

    const linha: LinhaSinc = { ...nova, apagado: nova.apagado ?? false };
    const hlc = relogio.tick();
    const alteradas = Object.entries(porPropriedade).filter(
      ([prop]) => prop !== 'id' && (!atual || !igual(atual[prop], linha[prop] ?? null)),
    );
    if (atual && alteradas.length === 0) return;

    await db
      .insert(tabela)
      .values(linha as never)
      .onConflictDoUpdate({ target: tabela.id, set: linha as never });

    const novasOps = alteradas.map(([prop, col]) => ({
      hlc,
      tabela: nome,
      linhaId: linha.id,
      coluna: col.name,
      valor: JSON.stringify(linha[prop] ?? null),
      origem: 'local' as const,
    }));
    if (novasOps.length) await db.insert(schema.ops).values(novasOps).onConflictDoNothing();
  }

  function colecao<T extends { id: string }>(nome: TabelaSincronizada, direto: boolean) {
    const tabela = TABELAS_SINCRONIZADAS[nome];
    const escrever = <R>(fn: () => Promise<R>) => (direto ? fn() : emTransacao(fn));
    const c: Colecao<T> = {
      async listar() {
        const linhas = await db.select().from(tabela).where(eq(tabela.apagado, false));
        return (linhas as LinhaSinc[]).map((l) => semApagado<T>(l));
      },
      async obter(id) {
        const l = (await db
          .select()
          .from(tabela)
          .where(and(eq(tabela.id, id), eq(tabela.apagado, false)))
          .get()) as LinhaSinc | undefined;
        return l ? semApagado<T>(l) : null;
      },
      salvar: (item) => escrever(() => gravarComOps(nome, item as unknown as LinhaSinc)),
      apagar: (id) =>
        escrever(async () => {
          const atual = (await db.select().from(tabela).where(eq(tabela.id, id)).get()) as
            LinhaSinc | undefined;
          if (atual && !atual.apagado) await gravarComOps(nome, { ...atual, apagado: true });
        }),
    };
    return c;
  }

  /* ——— Registro instalado ——— */

  const registro: Repositorios['registro'] = {
    instalar: (p) =>
      emTransacao(async () => {
        const { instituicao: i, escala: e, curso: c, matriz: m } = p;
        await db
          .insert(schema.escala)
          .values(e)
          .onConflictDoUpdate({ target: schema.escala.id, set: e });
        const inst = {
          id: i.id,
          sigla: i.sigla,
          nome: i.nome,
          escalaId: i.escalaId,
          sistema: i.sistema,
          creditosMaxSemestre: i.creditosMaxSemestre,
          gradeDias: i.grade.dias,
          gradeFaixas: i.grade.faixas,
        };
        await db
          .insert(schema.instituicao)
          .values(inst)
          .onConflictDoUpdate({ target: schema.instituicao.id, set: inst });
        await db
          .insert(schema.curso)
          .values(c)
          .onConflictDoUpdate({ target: schema.curso.id, set: c });
        const mat = {
          id: m.id,
          cursoId: m.cursoId,
          ano: m.ano,
          creditosTotal: m.creditosTotal,
          versaoRegistro: m.versaoRegistro,
        };
        await db
          .insert(schema.matriz)
          .values(mat)
          .onConflictDoUpdate({ target: schema.matriz.id, set: mat });
        await db.delete(schema.prerequisito).where(eq(schema.prerequisito.matrizId, m.id));
        await db.delete(schema.disciplina).where(eq(schema.disciplina.matrizId, m.id));
        if (m.disciplinas.length) await db.insert(schema.disciplina).values(m.disciplinas);
        if (m.prerequisitos.length) {
          await db
            .insert(schema.prerequisito)
            .values(m.prerequisitos.map((pr) => ({ ...pr, matrizId: m.id })));
        }
      }),

    async obter(matrizId) {
      const m = await db.select().from(schema.matriz).where(eq(schema.matriz.id, matrizId)).get();
      if (!m) return null;
      const c = await db.select().from(schema.curso).where(eq(schema.curso.id, m.cursoId)).get();
      if (!c) return null;
      const i = await db
        .select()
        .from(schema.instituicao)
        .where(eq(schema.instituicao.id, c.instituicaoId))
        .get();
      if (!i) return null;
      const e = await db.select().from(schema.escala).where(eq(schema.escala.id, i.escalaId)).get();
      if (!e) return null;
      const disciplinas: Disciplina[] = await db
        .select()
        .from(schema.disciplina)
        .where(eq(schema.disciplina.matrizId, m.id));
      const prerequisitos: Prerequisito[] = (
        await db.select().from(schema.prerequisito).where(eq(schema.prerequisito.matrizId, m.id))
      ).map(({ disciplinaCodigo, requerCodigo, tipo }) => ({
        disciplinaCodigo,
        requerCodigo,
        tipo,
      }));
      const matriz: Matriz = { ...m, disciplinas, prerequisitos };
      const pacote: PacoteInstituicao = {
        escala: e,
        curso: c,
        matriz,
        instituicao: {
          id: i.id,
          sigla: i.sigla,
          nome: i.nome,
          escalaId: i.escalaId,
          sistema: i.sistema,
          creditosMaxSemestre: i.creditosMaxSemestre,
          grade: { dias: i.gradeDias, faixas: i.gradeFaixas },
        },
      };
      return pacote;
    },
  };

  function criarRepos(direto: boolean): Omit<Repositorios, 'transacao'> {
    return {
      registro,
      alunos: colecao('aluno', direto),
      cursadas: colecao('cursada', direto),
      ofertas: colecao('oferta', direto),
      planos: colecao('plano', direto),
      objetivos: colecao('objetivo', direto),
      marcos: colecao('marco', direto),
      diario: colecao('diario', direto),
    };
  }

  const repos: Repositorios = {
    ...criarRepos(false),
    transacao: (fn) => emTransacao(() => fn(criarRepos(true))),
  };

  /* ——— Log de ops para a sincronização ——— */

  async function materializar(nome: TabelaSincronizada, linhaId: string): Promise<void> {
    const tabela = TABELAS_SINCRONIZADAS[nome];
    const { porPropriedade, porSql } = colunasDe(tabela);
    const ultimas = await db.all<{ coluna: string; valor: string }>(sql`
      SELECT o.coluna AS coluna, o.valor AS valor FROM _ops o
      WHERE o.tabela = ${nome} AND o.linha_id = ${linhaId}
        AND o.hlc = (SELECT max(hlc) FROM _ops i
                     WHERE i.tabela = o.tabela AND i.linha_id = o.linha_id AND i.coluna = o.coluna)`);
    const linha: LinhaSinc = { id: linhaId };
    for (const r of ultimas as unknown as Array<
      [string, string] | { coluna: string; valor: string }
    >) {
      const [coluna, valor] = Array.isArray(r) ? r : [r.coluna, r.valor];
      const prop = porSql.get(coluna);
      if (prop) linha[prop] = JSON.parse(valor);
    }
    const faltando = Object.entries(porPropriedade).some(
      ([prop, col]) => col.notNull && !col.hasDefault && linha[prop] === undefined,
    );
    if (faltando) return; // ainda não chegaram todas as colunas desta linha
    await db
      .insert(tabela)
      .values(linha as never)
      .onConflictDoUpdate({ target: tabela.id, set: linha as never });
  }

  const ops: LogDeOps = {
    async locaisDesde(cursor) {
      const filtro = cursor
        ? and(eq(schema.ops.origem, 'local'), gt(schema.ops.hlc, cursor))
        : eq(schema.ops.origem, 'local');
      const linhas = await db.select().from(schema.ops).where(filtro).orderBy(schema.ops.hlc);
      return linhas.map((o) => ({
        hlc: o.hlc,
        tabela: o.tabela as TabelaSincronizada,
        linhaId: o.linhaId,
        coluna: o.coluna,
        valor: JSON.parse(o.valor) as unknown,
      }));
    },

    aplicarRemotas: (remotas) =>
      emTransacao(async () => {
        const afetadas = new Map<string, { tabela: TabelaSincronizada; linhaId: string }>();
        for (const op of remotas) {
          if (!(op.tabela in TABELAS_SINCRONIZADAS)) continue;
          relogio.receber(op.hlc);
          await db
            .insert(schema.ops)
            .values({
              hlc: op.hlc,
              tabela: op.tabela,
              linhaId: op.linhaId,
              coluna: op.coluna,
              valor: JSON.stringify(op.valor),
              origem: 'remota',
            })
            .onConflictDoNothing();
          afetadas.set(`${op.tabela}\u0000${op.linhaId}`, op);
        }
        for (const { tabela, linhaId } of afetadas.values()) await materializar(tabela, linhaId);
        return afetadas.size;
      }),

    async lerMeta(chave) {
      const m = await db.select().from(schema.meta).where(eq(schema.meta.chave, chave)).get();
      return m?.valor ?? null;
    },

    async gravarMeta(chave, valor) {
      await db
        .insert(schema.meta)
        .values({ chave, valor })
        .onConflictDoUpdate({ target: schema.meta.chave, set: { valor } });
    },
  };

  const TODAS = [
    ...Object.values(TABELAS_SINCRONIZADAS),
    schema.insightCache,
    schema.ops,
    schema.meta,
    schema.prerequisito,
    schema.disciplina,
    schema.matriz,
    schema.curso,
    schema.instituicao,
    schema.escala,
  ];

  return {
    db,
    repos,
    ops,
    consistente: (fn) => mutex.executar(fn),
    async exportar() {
      const saida: Record<string, unknown[]> = {};
      for (const [nome, tabela] of Object.entries(TABELAS_SINCRONIZADAS)) {
        saida[nome] = (await db.select().from(tabela).where(eq(tabela.apagado, false))).map((l) =>
          semApagado(l as LinhaSinc),
        );
      }
      return saida;
    },
    apagarTudo: () =>
      emTransacao(async () => {
        for (const t of TODAS) await db.delete(t);
      }),
    fechar: () => mutex.executar(() => driver.close()),
  };
}
