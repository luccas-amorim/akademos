/** Mensagens entre a página e o worker do SQLite. */
export type Armazenamento = 'opfs' | 'indexeddb' | 'memoria';

export type Pedido =
  | { id: number; tipo: 'abrir'; nome: string }
  | { id: number; tipo: 'exec'; sql: string }
  | { id: number; tipo: 'query'; sql: string; params: unknown[] }
  | { id: number; tipo: 'fechar' };

export type Resposta =
  | { id: number; ok: true; linhas?: unknown[][]; armazenamento?: Armazenamento }
  | { id: number; ok: false; erro: string; codigo?: 'outra-aba' };
