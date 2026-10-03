import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Uma única sidebar. Toda página nova em docs/ precisa entrar aqui (ou ser
 * marcada `draft: true`): o conferidor scripts/validate-publicacao.mjs lê este
 * arquivo e recusa página que publicaria sem link.
 *
 * Os ids são escritos literalmente, entre aspas simples, sem template literal —
 * é assim que o conferidor os encontra.
 */
const sidebars: SidebarsConfig = {
  principal: [
    'visao-geral',
    'progresso',
    'matriz',
    'horario',
    'notas',
    'integralizacao',
  ],
};

export default sidebars;
