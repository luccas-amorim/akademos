/**
 * Metas de patrocínio exibidas em Sobre e apoio. Valores arrecadados ficam
 * `null` até a pessoa mantenedora publicar números reais: a página não
 * inventa progresso.
 */
export interface Meta {
  titulo: string;
  /** Texto da meta, ex.: "R$ 400 por mês". */
  alvo: string;
  /** 0–100 quando houver número real; `null` para não exibir barra. */
  progresso: number | null;
  rotuloProgresso: string | null;
}

export const METAS: Meta[] = [
  {
    titulo: 'Hospedagem do sync criptografado',
    alvo: 'R$ 400 por mês',
    progresso: null,
    rotuloProgresso: null,
  },
  {
    titulo: 'Revisão de segurança dos conectores e da criptografia',
    alvo: 'R$ 6.000',
    progresso: null,
    rotuloProgresso: null,
  },
  {
    titulo: 'App móvel nativo nas lojas',
    alvo: 'R$ 12.000',
    progresso: null,
    rotuloProgresso: null,
  },
];
