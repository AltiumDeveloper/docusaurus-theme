// @ts-check
// The theme's test site: configured the way the Altium developer sites use the theme (a non-root baseUrl, trailing
// slashes, the theme's static/ and a site engine), small enough to build in seconds.
const altiumTheme = require('@altium-developer/docusaurus-theme');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Theme fixture',
  url: 'https://example.invalid',
  baseUrl: '/fixture/',
  favicon: 'img/favicon.svg',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  staticDirectories: ['static', altiumTheme.staticDir],
  themes: [
    [
      '@altium-developer/docusaurus-theme',
      {
        search: {
          engine: 'src/search/engine.mjs',
          recentKey: 'fixture-search-recent',
          placeholder: 'Search the fixture',
          examples: [{ query: ['tokens', 'token'], text: 'the section about tokens' }],
        },
      },
    ],
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({ blog: false, docs: { routeBasePath: '/', sidebarPath: false } }),
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Theme fixture',
      logo: { alt: 'Altium', src: 'img/altium-logo.svg', width: 90, height: 20 },
    },
  },
};
