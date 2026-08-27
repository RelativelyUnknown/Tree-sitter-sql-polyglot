import { defineConfig } from 'vitepress';
import { SITE_BASE } from './site-base.mjs';

export default defineConfig({
  title: 'tree-sitter-sql-extended',
  description: 'A multi-dialect SQL grammar for tree-sitter; ANSI base plus 22 dialect extensions.',
  base: SITE_BASE,
  cleanUrls: true,
  lastUpdated: true,

  // downloads.md links into docs/public/artifacts/; static files (source
  // code, manifests) with no VitePress page behind them, which the
  // dead-link checker otherwise flags.
  ignoreDeadLinks: [/\/artifacts\//],

  head: [
    // The feature matrix (22 dialect columns) is wider than the content
    // column on every viewport; scroll it horizontally instead of letting
    // it overflow the page.
    ['style', {}, `
      .vp-doc table { display: block; overflow-x: auto; }
    `],
  ],

  themeConfig: {
    nav: [
      { text: 'Usage', link: '/usage' },
      { text: 'Coverage', link: '/coverage' },
      { text: 'Changelog', link: '/changelog' },
      { text: 'Downloads', link: '/downloads' },
      { text: 'GitHub', link: 'https://github.com/RelativelyUnknown/tree-sitter-sql-extended' },
    ],

    sidebar: [
      {
        text: 'tree-sitter-sql-extended',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Usage', link: '/usage' },
          { text: 'Dialect coverage', link: '/coverage' },
          { text: 'Changelog', link: '/changelog' },
          { text: 'Downloads', link: '/downloads' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/RelativelyUnknown/tree-sitter-sql-extended' },
    ],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/RelativelyUnknown/tree-sitter-sql-extended/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
