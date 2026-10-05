import {
  analisar,
  carregarDados,
  type Analise,
  type DadosLocais,
  type Repositorios,
} from '@akademos/core';
import { abrirBanco, type Banco } from '@akademos/db';
import { Hlc } from '@akademos/sync';
import { randomUUID } from 'expo-crypto';
import { useMemo, useSyncExternalStore } from 'react';
import { entradaDaMatriz, estatisticasDemo } from './catalogo';
import { criarDriverExpo } from './driverExpo';

export type EstadoDados =
  | { fase: 'abrindo' }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'pronto'; dados: DadosLocais | null };

/** Mesmo papel do store da web: o SQLite é a verdade; a UI lê um retrato. */
class StoreDeDados {
  #estado: EstadoDados = { fase: 'abrindo' };
  #ouvintes = new Set<() => void>();
  #banco: Banco | null = null;
  #inicio: Promise<void> | null = null;
  #aposEscrita = new Set<() => void>();
  relogio: Hlc | null = null;

  subscribe = (o: () => void) => {
    this.#ouvintes.add(o);
    return () => this.#ouvintes.delete(o);
  };
  getSnapshot = () => this.#estado;

  #definir(e: EstadoDados) {
    this.#estado = e;
    for (const o of this.#ouvintes) o();
  }

  get banco(): Banco {
    if (!this.#banco) throw new Error('Banco local ainda não foi aberto.');
    return this.#banco;
  }

  iniciar(): Promise<void> {
    this.#inicio ??= (async () => {
      try {
        // O relógio só é usado nas escritas; o id do aparelho vem do próprio banco.
        let hlc: Hlc | null = null;
        const relogio = {
          tick: () => hlc!.tick(),
          receber: (r: string) => hlc!.receber(r),
        };
        const banco = await abrirBanco(await criarDriverExpo(), relogio);
        let no = await banco.ops.lerMeta('aparelho');
        if (!no) {
          no = randomUUID().replaceAll('-', '').slice(0, 16);
          await banco.ops.gravarMeta('aparelho', no);
        }
        hlc = new Hlc(no);
        this.relogio = hlc;
        this.#banco = banco;
        await this.recarregar();
      } catch (e) {
        this.#definir({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) });
      }
    })();
    return this.#inicio;
  }

  async recarregar(): Promise<void> {
    const [aluno] = await this.banco.repos.alunos.listar();
    if (aluno && !(await this.banco.repos.registro.obter(aluno.matrizId))) {
      const entrada = entradaDaMatriz(aluno.matrizId);
      if (entrada) await this.banco.repos.registro.instalar(entrada.pacote);
    }
    const dados = await this.banco.consistente(() => carregarDados(this.banco.repos));
    this.#definir({ fase: 'pronto', dados });
  }

  async escrever(fn: (repos: Repositorios) => Promise<void>): Promise<void> {
    await fn(this.banco.repos);
    await this.recarregar();
    for (const o of this.#aposEscrita) o();
  }

  aoEscrever(o: () => void): () => void {
    this.#aposEscrita.add(o);
    return () => this.#aposEscrita.delete(o);
  }
}

export const store = new StoreDeDados();

export function useEstadoDados(): EstadoDados {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useAnalise(): Analise | null {
  const estado = useEstadoDados();
  const dados = estado.fase === 'pronto' ? estado.dados : null;
  return useMemo(
    () => (dados ? analisar(dados, new Date(), estatisticasDemo(dados.matriz.id)) : null),
    [dados],
  );
}
