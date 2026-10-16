// Docusaurus theme shared by the Altium developer documentation sites (ad-sdk-docs, platform-api-docs, altium-auth).
// Ships the look (css/theme.css with its fonts, static/img), the "View as Markdown" link and <link rel="alternate">
// of every doc page, and the search UI shell (theme/SearchBar) over a site's own ranking engine.
//
//   themes: [['@altium-developer/docusaurus-theme', {
//     search: {
//       engine: 'src/search/engine.mjs',      // the site's ranking: KINDS, GROUPS, loadIndex, search, … (site-relative)
//       index: 'static/search-index.json',    // written by the site before `docusaurus build` (site-relative)
//       recentKey, label, placeholder, intro,
//       examples: [{ query, text }],                          // query: a string, or an array of alternatives
//     },
//   }]],
//   staticDirectories: ['static', require('@altium-developer/docusaurus-theme').staticDir],
//
// The search index is published under a content-hashed name as well, so a deploy never pairs a cached index with new
// SearchBar code. Global data (usePluginData(NAME)): { file, search } where `file` is 'search-index.<hash>.json' at the
// site root (prefix with baseUrl), or null when the index has not been built or on the dev server (which only serves
// static/ as-is). static/search-index.json is still copied as-is: it is the fallback name.
const { createHash } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const NAME = 'altium-docusaurus-theme';
const ENGINE_ALIAS = '@altium-docusaurus-theme/search-engine';

const contentHash = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 10);
const hashedName = (bytes) => `search-index.${contentHash(bytes)}.json`;

function altiumTheme(context, options = {}) {
  const { engine, index = 'static/search-index.json', ...search } = options.search ?? {};
  const indexPath = resolve(context.siteDir, index);
  const enginePath = engine ? resolve(context.siteDir, engine) : require.resolve('./search/no-engine.mjs');
  return {
    name: NAME,
    getThemePath: () => join(__dirname, 'theme'),
    getClientModules: () => [require.resolve('./css/theme.css')],
    getPathsToWatch: () => [indexPath],
    configureWebpack: () => ({
      resolve: { alias: { [ENGINE_ALIAS]: enginePath } },
    }),
    async loadContent() {
      if (!existsSync(indexPath) || process.env.NODE_ENV !== 'production') return { file: null, bytes: null };
      const bytes = readFileSync(indexPath);
      return { file: hashedName(bytes), bytes };
    },
    // setGlobalData is only available here, not in loadContent.
    async contentLoaded({ content, actions }) {
      actions.setGlobalData({ file: content.file, search });
    },
    async postBuild({ content, outDir }) {
      if (content.file) writeFileSync(join(outDir, content.file), content.bytes);
    },
  };
}

module.exports = altiumTheme;
module.exports.NAME = NAME;
module.exports.staticDir = join(__dirname, 'static');
module.exports.contentHash = contentHash;
module.exports.hashedName = hashedName;
