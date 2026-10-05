import type { Analise } from '../dados/analise';
import { t } from '@lingui/core/macro';

export function saudacao(agora: Date, nome: string): string {
  const primeiro = nome.split(' ')[0] ?? nome;
  const h = agora.getHours();
  if (h < 12) return t`Bom dia, ${primeiro}.`;
  if (h < 18) return t`Boa tarde, ${primeiro}.`;
  return t`Boa noite, ${primeiro}.`;
}

export function dataPorExtenso(agora: Date): string {
  const s = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(agora);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const NUMERAIS = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco'];

/** Frase de abertura: onde o aluno está e o que decide a formatura. */
export function resumo(a: Analise): string {
  const p = a.integralizacao.percentual;
  const fase =
    p < 20
      ? t`Você está no começo do curso.`
      : p < 40
        ? t`Você já passou do primeiro terço do curso.`
        : p < 60
          ? t`Você está na metade do curso.`
          : p < 85
            ? t`Você está na reta final do curso.`
            : t`Falta pouco para a formatura.`;
  const decisoes = a.insights.filter(
    (i) => i.severidade === 'alta' && i.acao?.destino === 'planejar',
  ).length;
  const formatura = a.formatura.formatura;
  if (!decisoes || !formatura) return fase;
  const n = NUMERAIS[decisoes] ?? String(decisoes);
  const prox = a.proximoSemestre;
  return (
    fase +
    ' ' +
    (decisoes === 1
      ? t`${n} decisão de ${prox} define se a formatura fica em ${formatura}.`
      : t`${n} decisões de ${prox} definem se a formatura fica em ${formatura}.`)
  );
}

export function folgaDaSemana(a: Analise): string {
  const { grade } = a.dados.instituicao;
  const nomes: Record<string, string> = {
    seg: t`segunda`,
    ter: t`terça`,
    qua: t`quarta`,
    qui: t`quinta`,
    sex: t`sexta`,
    sab: t`sábado`,
  };
  const partes: string[] = a.diasLivresAtuais.map((d) => {
    const dia = nomes[d] ?? d;
    return t`${dia} livre`;
  });
  const noturnas = grade.faixas.map((f, i) => (f.inicio >= '18:00' ? i : -1)).filter((i) => i >= 0);
  const usaNoite = a.turmasAtuais.some((o) => o.horarios.some((h) => noturnas.includes(h.slot)));
  if (noturnas.length && !usaNoite) partes.push(t`noites livres`);
  return partes.length ? partes.join(' · ') : t`semana sem folga`;
}
