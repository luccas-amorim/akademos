import { ClienteRelay, ErroRelay, sincronizar } from '@akademos/sync';
import { useSyncExternalStore } from 'react';
import { lerSessao } from '../dados/preferencias';
import { store } from '../dados/store';
import { lerChaveLocal } from './chave';
import { API_URL } from './config';
import { lerToken } from './token';

export type EstadoSync =
  | { fase: 'desligada' }
  | { fase: 'ociosa'; ultima: string | null }
  | { fase: 'sincronizando'; ultima: string | null }
  | { fase: 'erro'; ultima: string | null; mensagem: string };

const INTERVALO_MS = 60_000;
const ESPERA_APOS_ESCRITA_MS = 2_000;

/**
 * Agenda e executa a sincronização: logo depois de escrever (com uma pequena
 * espera para juntar escritas), a cada minuto e ao voltar a ficar online.
 * Nunca bloqueia a UI: o banco local continua sendo a fonte da verdade.
 */
class ServicoSync {
  #estado: EstadoSync = { fase: 'desligada' };
  #ouvintes = new Set<() => void>();
  #emCurso: Promise<void> | null = null;
  #espera: ReturnType<typeof setTimeout> | null = null;
  #iniciado = false;

  subscribe = (o: () => void) => {
    this.#ouvintes.add(o);
    return () => this.#ouvintes.delete(o);
  };
  getSnapshot = () => this.#estado;

  #definir(e: EstadoSync) {
    this.#estado = e;
    for (const o of this.#ouvintes) o();
  }

  /** Há conta, chave e servidor? */
  ativa(): boolean {
    return API_URL !== null && lerSessao() === 'conta' && !!lerToken() && !!lerChaveLocal();
  }

  async iniciar(): Promise<void> {
    if (this.#iniciado) return;
    this.#iniciado = true;
    store.aoEscrever(() => this.agendar());
    setInterval(() => void this.sincronizarAgora(), INTERVALO_MS);
    window.addEventListener('online', () => void this.sincronizarAgora());
    await this.sincronizarAgora();
  }

  agendar(): void {
    if (!this.ativa()) return;
    if (this.#espera) clearTimeout(this.#espera);
    this.#espera = setTimeout(() => void this.sincronizarAgora(), ESPERA_APOS_ESCRITA_MS);
  }

  sincronizarAgora(): Promise<void> {
    if (!this.ativa()) {
      if (this.#estado.fase !== 'desligada') this.#definir({ fase: 'desligada' });
      return Promise.resolve();
    }
    this.#emCurso ??= this.#rodada().finally(() => {
      this.#emCurso = null;
    });
    return this.#emCurso;
  }

  async #rodada(): Promise<void> {
    const anterior = 'ultima' in this.#estado ? this.#estado.ultima : null;
    if (!navigator.onLine) {
      this.#definir({ fase: 'erro', ultima: anterior, mensagem: 'sem conexão' });
      return;
    }
    this.#definir({ fase: 'sincronizando', ultima: anterior });
    try {
      await store.iniciar();
      const relay = new ClienteRelay({ url: API_URL!, token: lerToken });
      const r = await sincronizar(store.banco.ops, relay, lerChaveLocal()!, store.relogio.no);
      if (r.recebidas) await store.recarregar();
      this.#definir({ fase: 'ociosa', ultima: r.quando });
    } catch (e) {
      const mensagem =
        e instanceof ErroRelay && e.status === 401
          ? 'sessão expirada: entre de novo'
          : e instanceof Error
            ? e.message
            : String(e);
      this.#definir({ fase: 'erro', ultima: anterior, mensagem });
    }
  }
}

export const servicoSync = new ServicoSync();

export function useEstadoSync(): EstadoSync {
  return useSyncExternalStore(servicoSync.subscribe, servicoSync.getSnapshot);
}
