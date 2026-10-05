import { carregarDados, type DadosLocais, type Repositorios } from '@akademos/core';
import { abrirBanco, type Banco } from '@akademos/db';
import { criarDriverWeb, ErroOutraAba, type Armazenamento, type DriverWeb } from '@akademos/db/web';
import { Hlc } from '@akademos/sync';
import { useSyncExternalStore } from 'react';
import { entradaDaMatriz } from './catalogo';

export type EstadoDados =
  | { fase: 'abrindo' }
  | { fase: 'erro'; mensagem: string; outraAba: boolean }
  | { fase: 'pronto'; dados: DadosLocais | null; armazenamento: Armazenamento };

const CHAVE_NO = 'akademos:no';

/** Id estável deste aparelho para o relógio HLC. */
function idDoAparelho(): string {
  try {
    let no = localStorage.getItem(CHAVE_NO);
    if (!no) {
      no = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      localStorage.setItem(CHAVE_NO, no);
    }
    return no;
  } catch {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  }
}

/**
 * Fonte única dos dados locais na UI. O SQLite é a verdade; este objeto guarda
 * o último retrato carregado e avisa os componentes quando ele muda.
 */
class StoreDeDados {
  #estado: EstadoDados = { fase: 'abrindo' };
  #ouvintes = new Set<() => void>();
  #banco: Banco | null = null;
  #driver: DriverWeb | null = null;
  #inicio: Promise<void> | null = null;
  #aposEscrita = new Set<() => void>();
  readonly relogio = new Hlc(idDoAparelho());

  subscribe = (ouvinte: () => void) => {
    this.#ouvintes.add(ouvinte);
    return () => this.#ouvintes.delete(ouvinte);
  };

  getSnapshot = () => this.#estado;

  #definir(estado: EstadoDados) {
    this.#estado = estado;
    for (const o of this.#ouvintes) o();
  }

  iniciar(): Promise<void> {
    this.#inicio ??= (async () => {
      try {
        this.#driver = await criarDriverWeb();
        this.#banco = await abrirBanco(this.#driver, this.relogio);
        void navigator.storage?.persist?.();
        await this.recarregar();
      } catch (e) {
        console.error(e);
        this.#definir({
          fase: 'erro',
          mensagem: e instanceof Error ? e.message : String(e),
          outraAba: e instanceof ErroOutraAba,
        });
      }
    })();
    return this.#inicio;
  }

  get banco(): Banco {
    if (!this.#banco) throw new Error('Banco local ainda não foi aberto.');
    return this.#banco;
  }

  async recarregar(): Promise<void> {
    await this.#garantirMatriz();
    const dados = await this.banco.consistente(() => carregarDados(this.banco.repos));
    this.#definir({
      fase: 'pronto',
      dados,
      armazenamento: this.#driver?.armazenamento ?? 'memoria',
    });
  }

  /**
   * Matrizes vêm do registro, não da sincronização: um aparelho que acabou de
   * receber o perfil do aluno instala a matriz a partir do catálogo embutido.
   */
  async #garantirMatriz(): Promise<void> {
    const [aluno] = await this.banco.repos.alunos.listar();
    if (!aluno || (await this.banco.repos.registro.obter(aluno.matrizId))) return;
    const entrada = entradaDaMatriz(aluno.matrizId);
    if (entrada) await this.banco.repos.registro.instalar(entrada.pacote);
  }

  /** Executa uma escrita e atualiza a UI com o resultado gravado. */
  async escrever(fn: (repos: Repositorios) => Promise<void>): Promise<void> {
    await fn(this.banco.repos);
    await this.recarregar();
    for (const o of this.#aposEscrita) o();
  }

  /** Avisa depois de cada escrita local (a sincronização agenda um envio). */
  aoEscrever(ouvinte: () => void): () => void {
    this.#aposEscrita.add(ouvinte);
    return () => this.#aposEscrita.delete(ouvinte);
  }

  /** Apaga o arquivo do banco e recomeça vazio. */
  async destruir(): Promise<void> {
    await this.#driver?.destruir();
    this.#banco = null;
    this.#driver = null;
    this.#inicio = null;
    this.#definir({ fase: 'abrindo' });
    await this.iniciar();
  }
}

export const store = new StoreDeDados();

export function useEstadoDados(): EstadoDados {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Dados do aluno; só use dentro de telas protegidas pela barra lateral. */
export function useDados(): DadosLocais {
  const estado = useEstadoDados();
  if (estado.fase !== 'pronto' || !estado.dados) {
    throw new Error('useDados() chamado sem dados carregados');
  }
  return estado.dados;
}
