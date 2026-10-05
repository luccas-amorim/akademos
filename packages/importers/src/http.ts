/**
 * HTTP mínimo que os conectores usam. No desktop é o `fetch` do
 * tauri-plugin-http (sem CORS); nos testes, um roteador com HTML gravado.
 */
export interface Requisicao {
  metodo: 'GET' | 'POST';
  url: string;
  /** Corpo application/x-www-form-urlencoded. */
  form?: Record<string, string>;
  cookies: Record<string, string>;
}

export interface Resposta {
  status: number;
  /** URL final, depois de redirecionamentos. */
  url: string;
  tipo: string;
  texto: string;
  bytes: Uint8Array;
  /** Cookies recebidos (Set-Cookie), já juntados aos enviados. */
  cookies: Record<string, string>;
}

export interface ClienteHttp {
  requisitar(r: Requisicao): Promise<Resposta>;
}

export class ErroConector extends Error {
  constructor(
    readonly codigo: 'credenciais' | 'indisponivel' | 'formato' | 'nao-suportado',
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Lê pares nome=valor de cabeçalhos Set-Cookie. */
export function lerSetCookie(cabecalhos: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cabecalhos) {
    const [par] = c.split(';');
    const i = par?.indexOf('=') ?? -1;
    if (par && i > 0) out[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
  return out;
}

export function cabecalhoCookie(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Adapta um `fetch` (o do Tauri, por exemplo) à interface dos conectores,
 * seguindo redirecionamentos à mão para não perder cookies.
 */
export function clienteHttpDeFetch(f: typeof fetch): ClienteHttp {
  return {
    async requisitar(r) {
      let url = r.url;
      let cookies = { ...r.cookies };
      let metodo = r.metodo;
      let corpo = r.form ? new URLSearchParams(r.form).toString() : undefined;
      for (let saltos = 0; saltos < 8; saltos++) {
        const resp = await f(url, {
          method: metodo,
          redirect: 'manual',
          headers: {
            ...(corpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            ...(Object.keys(cookies).length ? { Cookie: cabecalhoCookie(cookies) } : {}),
          },
          ...(corpo ? { body: corpo } : {}),
        });
        const setCookie =
          (resp.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
          (resp.headers.get('set-cookie') ? [resp.headers.get('set-cookie')!] : []);
        cookies = { ...cookies, ...lerSetCookie(setCookie) };
        const destino = resp.headers.get('location');
        if (resp.status >= 300 && resp.status < 400 && destino) {
          url = new URL(destino, url).toString();
          metodo = 'GET';
          corpo = undefined;
          continue;
        }
        const bytes = new Uint8Array(await resp.arrayBuffer());
        const tipo = resp.headers.get('content-type') ?? '';
        return {
          status: resp.status,
          url,
          tipo,
          bytes,
          texto: tipo.includes('pdf')
            ? ''
            : new TextDecoder(/iso-8859-1/i.test(tipo) ? 'latin1' : 'utf-8').decode(bytes),
          cookies,
        };
      }
      throw new ErroConector('indisponivel', 'Redirecionamentos demais');
    },
  };
}
