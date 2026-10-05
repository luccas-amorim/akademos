import { store } from '../dados/store';
import { atualizarEstatisticas, enviarContribuicao } from './comunidade';

let iniciado = false;
let espera: ReturnType<typeof setTimeout> | null = null;

function dadosAtuais() {
  const e = store.getSnapshot();
  return e.fase === 'pronto' ? e.dados : null;
}

/** Baixa agregados da matriz e mantém a contribuição (se consentida) em dia. */
export async function iniciarComunidade(): Promise<void> {
  if (iniciado) return;
  iniciado = true;
  const dados = dadosAtuais();
  if (dados) {
    if (await atualizarEstatisticas(dados.matriz.id)) await store.recarregar();
    await enviarContribuicao(dados).catch(() => false);
  }
  store.aoEscrever(() => {
    if (espera) clearTimeout(espera);
    espera = setTimeout(() => {
      const d = dadosAtuais();
      if (d) void enviarContribuicao(d).catch(() => false);
    }, 10_000);
  });
}
