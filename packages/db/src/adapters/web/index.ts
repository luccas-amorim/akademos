import type { SqlDriver } from '../../driver';
import type { Armazenamento, Pedido, Resposta } from './protocolo';

export type { Armazenamento } from './protocolo';

export interface DriverWeb extends SqlDriver {
  armazenamento: Armazenamento;
  /** Fecha o banco e remove o arquivo do armazenamento do navegador. */
  destruir(): Promise<void>;
}

export class ErroOutraAba extends Error {
  override readonly name = 'ErroOutraAba';
}

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Abre o SQLite num Web Worker, com OPFS quando o navegador permite. */
export async function criarDriverWeb(nome = 'akademos'): Promise<DriverWeb> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let proximo = 0;
  const pendentes = new Map<number, (r: Resposta) => void>();
  worker.onmessage = (ev: MessageEvent<Resposta>) => {
    pendentes.get(ev.data.id)?.(ev.data);
    pendentes.delete(ev.data.id);
  };

  function enviar(p: SemId<Pedido>): Promise<Extract<Resposta, { ok: true }>> {
    const id = ++proximo;
    return new Promise((resolve, reject) => {
      pendentes.set(id, (r) => {
        if (r.ok) resolve(r);
        else if (r.codigo === 'outra-aba') reject(new ErroOutraAba(r.erro));
        else reject(new Error(r.erro));
      });
      worker.postMessage({ ...p, id });
    });
  }

  const { armazenamento = 'memoria' } = await enviar({ tipo: 'abrir', nome });

  const driver: DriverWeb = {
    armazenamento,
    async exec(sql) {
      await enviar({ tipo: 'exec', sql });
    },
    async query(sql, params) {
      return (await enviar({ tipo: 'query', sql, params: [...params] })).linhas ?? [];
    },
    async close() {
      await enviar({ tipo: 'fechar' });
      worker.terminate();
    },
    async destruir() {
      await driver.close();
      if (armazenamento === 'opfs') {
        const raiz = await navigator.storage.getDirectory();
        await raiz.removeEntry(`akademos-${nome}`, { recursive: true }).catch(() => undefined);
      } else if (armazenamento === 'indexeddb') {
        indexedDB.deleteDatabase(`akademos-${nome}`);
      }
    },
  };
  return driver;
}
