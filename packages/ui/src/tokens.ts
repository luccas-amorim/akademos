/**
 * Tokens de design do Akademos (docs/DESIGN.md). Fonte única: `styles.css`
 * declara as mesmas variáveis e um teste garante que os dois não divergem.
 * O app móvel (sem CSS) usa este objeto diretamente.
 */
export const cores = {
  bg: '#f6f5f1',
  surface: '#fffefb',
  border: '#e4e1d8',
  borderSoft: '#ecebe5',
  borderStrong: '#c9c5b9',
  inputBorder: '#d6d3c8',
  ink: '#1b1d22',
  ink2: '#5d6068',
  ink3: '#8a8c92',
  inkBody: '#41444b',
  primary: '#1e3a8a',
  primaryHover: '#13265e',
  primaryTint: '#e7ebf6',
  primaryTintSoft: '#f3f5fb',
  primaryLine: '#c5cfe8',
  primaryOnDark: '#dfe5f3',
  olive: '#5a6e2e',
  oliveInk: '#4f6428',
  oliveDeep: '#3f5120',
  oliveTint: '#eef1e2',
  oliveOnDark: '#c9d38f',
  amber: '#c98a2b',
  amberInk: '#8f5309',
  amberTint: '#f7ecd9',
  amberTintSoft: '#fbf4e8',
  danger: '#a33a2a',
  dangerTint: '#f8e3df',
  dangerInk: '#7d2a1d',
  neutralTint: '#f1f0eb',
} as const;

export type Cor = keyof typeof cores;

export const raios = { card: 10, controle: 8, chip: 7, chipSm: 6, pilula: 10, painel: 12 } as const;

export const fontes = {
  serif: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const espacos = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28] as const;

export const larguraBarraLateral = 232;
export const larguraMaximaConteudo = 1200;

/** Converte `primaryTint` → `--primary-tint`. */
export function nomeDaVariavel(cor: Cor): string {
  return '--' + cor.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}
