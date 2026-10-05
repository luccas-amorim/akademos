import type { Oferta } from '@akademos/core';
import type { CursadaBruta } from './tipos';

/**
 * Conector de sistema acadêmico (docs/ARCHITECTURE.md › Conectores).
 * Roda só no aparelho (desktop/celular): credenciais nunca saem dele.
 */
export interface Credenciais {
  usuario: string;
  senha: string;
}

/** Sessão autenticada; opaca para quem usa o conector. */
export interface Sessao {
  conector: string;
  cookies: Record<string, string>;
  /** Dados extras guardados no login (ex.: id do vínculo). */
  dados?: Record<string, string>;
}

export type OfertaBruta = Omit<Oferta, 'id' | 'atualizadaEm'>;

export interface Connector {
  id: string;
  /** Versão do scraper; muda quando o HTML do sistema muda. */
  versao: string;
  instituicoes: string[];
  login(cred: Credenciais): Promise<Sessao>;
  historico(s: Sessao): Promise<CursadaBruta[]>;
  oferta?(s: Sessao, semestre: string): Promise<OfertaBruta[]>;
}
