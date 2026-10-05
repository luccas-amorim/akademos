/**
 * Contrato mínimo que cada plataforma implementa (wa-sqlite no navegador,
 * tauri-plugin-sql no desktop, expo-sqlite no celular, node:sqlite em testes).
 */
export interface SqlDriver {
  /** Executa um script com várias instruções, sem parâmetros. */
  exec(sql: string): Promise<void>;
  /** Executa uma instrução e devolve as linhas como arrays, na ordem das colunas. */
  query(sql: string, params: readonly unknown[]): Promise<unknown[][]>;
  close(): Promise<void>;
}

/** Fila que serializa escritas: uma transação por vez na mesma conexão. */
export class Mutex {
  #fila: Promise<unknown> = Promise.resolve();

  executar<R>(fn: () => Promise<R>): Promise<R> {
    const resultado = this.#fila.then(fn, fn);
    this.#fila = resultado.catch(() => undefined);
    return resultado;
  }
}
