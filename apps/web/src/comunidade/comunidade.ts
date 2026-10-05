import { contribuicaoAnonima, type DadosLocais, type EstatisticasComunidade } from '@akademos/core';
import { registrarEstatisticas } from '../dados/comunidade';
import { lerConsentimentoComunidade } from '../dados/preferencias';
import { API_URL } from '../conta/config';

/**
 * Comunidade (opt-in, regra 6 do CLAUDE.md). A contribuição sai sem conta e
 * sem token: só um id aleatório deste aparelho e um segredo que permite
 * substituí-la ou apagá-la depois.
 */
const CHAVE_IDENTIDADE = 'akademos:contribuicao';
const CHAVE_ENVIO = 'akademos:contribuicao-enviada';
const CHAVE_ESTATISTICAS = (m: string) => `akademos:stats:${m}`;

interface Identidade {
  id: string;
  segredo: string;
}

function identidade(): Identidade {
  try {
    const salvo = localStorage.getItem(CHAVE_IDENTIDADE);
    if (salvo) return JSON.parse(salvo) as Identidade;
  } catch {
    // segue para criar
  }
  const segredo = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const nova = { id: crypto.randomUUID(), segredo };
  try {
    localStorage.setItem(CHAVE_IDENTIDADE, JSON.stringify(nova));
  } catch {
    // sem armazenamento: contribuição não poderá ser apagada depois; não envia
  }
  return nova;
}

const caminhoDaMatriz = (matrizId: string) => matrizId.split('/').map(encodeURIComponent).join('/');

/** O que seria enviado — mostrado ao aluno antes de ele consentir. */
export function previaDaContribuicao(dados: DadosLocais) {
  return {
    matrizId: dados.matriz.id,
    notas: contribuicaoAnonima(dados.matriz, dados.cursadas, dados.escala),
  };
}

/** Envia (ou atualiza) a contribuição, se houver consentimento e servidor. */
export async function enviarContribuicao(dados: DadosLocais): Promise<boolean> {
  if (!API_URL || !lerConsentimentoComunidade()) return false;
  const { matrizId, notas } = previaDaContribuicao(dados);
  if (!Object.keys(notas).length) return false;
  const assinatura = JSON.stringify({ matrizId, notas });
  if (localStorage.getItem(CHAVE_ENVIO) === assinatura) return false; // nada mudou
  const { id, segredo } = identidade();
  const r = await fetch(`${API_URL}/stats/contribuicao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, segredo, matrizId, notas }),
  });
  if (!r.ok) return false;
  localStorage.setItem(CHAVE_ENVIO, assinatura);
  return true;
}

/** Retira o consentimento: apaga a contribuição no servidor. */
export async function retirarContribuicao(): Promise<void> {
  localStorage.removeItem(CHAVE_ENVIO);
  const salvo = localStorage.getItem(CHAVE_IDENTIDADE);
  if (!API_URL || !salvo) return;
  const { id, segredo } = JSON.parse(salvo) as Identidade;
  await fetch(`${API_URL}/stats/contribuicao/${id}`, {
    method: 'DELETE',
    headers: { 'x-segredo': segredo },
  });
}

/** Baixa os agregados públicos da matriz e guarda para uso offline. */
export async function atualizarEstatisticas(
  matrizId: string,
): Promise<EstatisticasComunidade | null> {
  try {
    const cache = localStorage.getItem(CHAVE_ESTATISTICAS(matrizId));
    if (cache) registrarEstatisticas(JSON.parse(cache) as EstatisticasComunidade);
  } catch {
    // ignore
  }
  if (!API_URL) return null;
  try {
    const r = await fetch(`${API_URL}/stats/${caminhoDaMatriz(matrizId)}`);
    if (!r.ok) return null;
    const e = (await r.json()) as EstatisticasComunidade;
    // Sem nenhuma célula publicada (k < 10), mantém a demonstração, se houver.
    if (!Object.keys(e.disciplinas).length) return null;
    registrarEstatisticas(e);
    localStorage.setItem(CHAVE_ESTATISTICAS(matrizId), JSON.stringify(e));
    return e;
  } catch {
    return null;
  }
}
