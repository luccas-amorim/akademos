import type { Relay } from './sincronizador';

export class ErroRelay extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
  ) {
    super(`Relay respondeu ${status}: ${codigo}`);
  }
}

export interface OpcoesCliente {
  /** URL base da API, ex.: https://api.akademos.dev */
  url: string;
  /** Token Bearer da sessão (Better Auth). */
  token: () => string | null;
  fetch?: typeof fetch;
}

/** Cliente HTTP do relay cego (apps/server › /sync). */
export class ClienteRelay implements Relay {
  readonly #url: string;
  readonly #token: () => string | null;
  readonly #fetch: typeof fetch;

  constructor(o: OpcoesCliente) {
    this.#url = o.url.replace(/\/$/, '');
    this.#token = o.token;
    this.#fetch = o.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async #pedir<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const token = this.#token();
    const r = await this.#fetch(`${this.#url}${caminho}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!r.ok) {
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
      throw new ErroRelay(r.status, corpo.erro ?? r.statusText);
    }
    return (r.status === 204 ? undefined : await r.json()) as T;
  }

  async push(dispositivo: string, blobs: string[]): Promise<number> {
    const r = await this.#pedir<{ cursor: number }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ dispositivo, blobs }),
    });
    return r.cursor;
  }

  pull(desde: number, dispositivo: string) {
    const q = new URLSearchParams({ desde: String(desde), dispositivo });
    return this.#pedir<{
      blobs: Array<{ id: number; conteudo: string }>;
      cursor: number;
      temMais: boolean;
    }>(`/sync/pull?${q}`);
  }

  /** `null` se a conta ainda não registrou a chave. */
  async obterChave(): Promise<{ sal: string; verificador: string } | null> {
    try {
      return await this.#pedir('/sync/chave');
    } catch (e) {
      if (e instanceof ErroRelay && e.status === 404) return null;
      throw e;
    }
  }

  async registrarChave(sal: string, verificador: string): Promise<void> {
    await this.#pedir('/sync/chave', { method: 'PUT', body: JSON.stringify({ sal, verificador }) });
  }

  async apagarConta(): Promise<void> {
    await this.#pedir('/conta', { method: 'DELETE' });
  }
}
