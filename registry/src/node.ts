/** Leitura do registro a partir do sistema de arquivos (CLI, testes, servidor). */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { ArquivosInstituicao } from './pacote';

/** Raiz do registro; em bundles (servidor em Docker) vem de AKADEMOS_REGISTRO. */
export const RAIZ_REGISTRO =
  process.env.AKADEMOS_REGISTRO ?? fileURLToPath(new URL('..', import.meta.url));

const ler = (arquivo: string): unknown => parse(readFileSync(arquivo, 'utf8'));

function arquivosYaml(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosYaml(caminho);
    return nome.endsWith('.yaml') ? [caminho] : [];
  });
}

export function lerInstituicoes(raiz = RAIZ_REGISTRO): ArquivosInstituicao[] {
  const base = join(raiz, 'instituicoes');
  return readdirSync(base)
    .filter((p) => statSync(join(base, p)).isDirectory())
    .sort()
    .map((pasta) => {
      const dir = join(base, pasta);
      const matrizes: Record<string, unknown> = {};
      for (const f of arquivosYaml(join(dir, 'cursos'))) {
        matrizes[relative(dir, f).replaceAll('\\', '/')] = ler(f);
      }
      const historico = join(dir, 'historico-pdf.yaml');
      return {
        pasta,
        instituicao: ler(join(dir, 'instituicao.yaml')),
        escala: ler(join(dir, 'escala.yaml')),
        matrizes,
        ...(existsSync(historico) ? { historicoPdf: ler(historico) } : {}),
      };
    });
}
