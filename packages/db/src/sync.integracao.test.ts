import type { Cursada } from '@akademos/core';
import { derivarChave, gerarFrase, gerarSal, Hlc, sincronizar, type Relay } from '@akademos/sync';
import sodium from 'libsodium-wrappers-sumo';
import { describe, expect, it } from 'vitest';
import { criarDriverNode } from './adapters/node';
import { abrirBanco } from './banco';

function relayEmMemoria(): Relay {
  const blobs: Array<{ id: number; dispositivo: string; conteudo: string }> = [];
  return {
    async push(dispositivo, novos) {
      for (const conteudo of novos) blobs.push({ id: blobs.length + 1, dispositivo, conteudo });
      return blobs.length;
    },
    async pull(desde, dispositivo) {
      return {
        blobs: blobs.filter((b) => b.id > desde && b.dispositivo !== dispositivo),
        cursor: blobs.length,
        temMais: false,
      };
    },
  };
}

const cursada = (
  id: string,
  nota: number | null,
  situacao: Cursada['situacao'] = 'aprovada',
): Cursada => ({
  id,
  alunoId: 'ana',
  disciplinaCodigo: 'EX101',
  semestre: '2025/1',
  nota,
  frequencia: null,
  situacao,
});

describe('dois aparelhos sincronizando pelo relay cifrado', () => {
  it('convergem depois de editar offline em paralelo', async () => {
    await sodium.ready;
    const params = {
      opslimit: sodium.crypto_pwhash_OPSLIMIT_MIN,
      memlimit: sodium.crypto_pwhash_MEMLIMIT_MIN,
    };
    const chave = await derivarChave(gerarFrase(), await gerarSal(), params);
    const relay = relayEmMemoria();
    let t = 0;
    const a = await abrirBanco(criarDriverNode(), new Hlc('a', () => ++t));
    const b = await abrirBanco(criarDriverNode(), new Hlc('b', () => ++t));

    await a.repos.cursadas.salvar(cursada('c1', 7));
    await sincronizar(a.ops, relay, chave, 'a');
    await sincronizar(b.ops, relay, chave, 'b');
    expect(await b.repos.cursadas.obter('c1')).toEqual(cursada('c1', 7));

    // Offline: A muda a nota, B registra outra disciplina e depois apaga c1.
    await a.repos.cursadas.salvar(cursada('c1', 8.5));
    await b.repos.cursadas.salvar({
      ...cursada('c2', null, 'cursando'),
      disciplinaCodigo: 'EX201',
    });
    await b.repos.cursadas.apagar('c1');

    for (let i = 0; i < 2; i++) {
      await sincronizar(a.ops, relay, chave, 'a');
      await sincronizar(b.ops, relay, chave, 'b');
    }
    const finalA = (await a.repos.cursadas.listar()).sort((x, y) => x.id.localeCompare(y.id));
    const finalB = (await b.repos.cursadas.listar()).sort((x, y) => x.id.localeCompare(y.id));
    expect(finalA).toEqual(finalB);
    // A exclusão de B foi a escrita mais recente na coluna "apagado".
    expect(finalA.map((c) => c.id)).toEqual(['c2']);
    await a.fechar();
    await b.fechar();
  });
});
