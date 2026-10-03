import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Akademos',
  tagline: 'Grade curricular, horário, notas e integralização do curso',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Num fork, troque estes quatro campos pelo seu usuário e pelo nome do repositório.
  url: 'https://luccas-amorim.github.io',
  baseUrl: '/akademos/',

  organizationName: 'luccas-amorim',
  projectName: 'akademos',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // docs na raiz do site
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Akademos',
      logo: {
        alt: 'Akademos',
        src: 'img/favicon.svg',
      },
      items: [
        {type: 'doc', docId: 'progresso', label: 'Progresso', position: 'left'},
        {type: 'doc', docId: 'matriz', label: 'Matriz', position: 'left'},
        {type: 'doc', docId: 'horario', label: 'Horário', position: 'left'},
        {type: 'doc', docId: 'notas', label: 'Notas', position: 'left'},
        {type: 'doc', docId: 'integralizacao', label: 'Integralização', position: 'left'},
        {
          href: 'https://github.com/luccas-amorim/akademos',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Akademos · licença MIT · feito com Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
