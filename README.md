# @altium-developer/docusaurus-theme

The look and feel shared by the Altium developer documentation sites:
[ad-sdk-docs](https://github.com/AltiumDeveloper/ad-sdk-docs),
[platform-api-docs](https://github.com/AltiumDeveloper/platform-api-docs) and
[altium-auth](https://github.com/AltiumDeveloper/altium-auth).

| Part | What it does |
| --- | --- |
| `css/theme.css` and `css/fonts/` | Fonts (Inter and JetBrains Mono, self-hosted, SIL OFL), tokens, navbar, sidebar, breadcrumbs, content, landing page, footer. Loaded after Infima. |
| `static/img/` | The Altium logo and favicon. |
| `DocBreadcrumbs`, `DocItem/Metadata` | A "View as Markdown" link and a `<link rel="alternate" type="text/markdown">` on every doc page, pointing at the Markdown twin the site writes next to it (`markdownRoute.js`). |
| `SearchBar` | The search modal: ⌘K / Ctrl+K or `/`, tabs with counts, keyboard navigation, recently opened pages. It loads the index and the site's engine on first use. |
| Search index publishing | Copies the site's `static/search-index.json` to `search-index.<hash>.json` at build time, so a cached index is never paired with newer code. |
| `search` export | Text handling for engines: identifier splitting, plurals, stop words, typo distance, synonyms. |

Each site keeps its own search ranking (record kinds, tabs, boosts), its index build and checks, its `llms` scripts and any reference-specific CSS.

## Use

```js
// docusaurus.config.js
const altiumTheme = require('@altium-developer/docusaurus-theme');

module.exports = {
  favicon: 'img/favicon.svg',
  staticDirectories: ['static', altiumTheme.staticDir],
  themes: [
    ['@altium-developer/docusaurus-theme', {
      search: {
        engine: require.resolve('./src/search/engine.mjs'),
        index: 'static/search-index.json', // the default
        recentKey: 'my-site-search-recent',
        placeholder: 'Search the guides',
        examples: [{ query: ['secure=1', 'gov'], text: 'GovCloud tokens' }],
      },
    }],
  ],
  themeConfig: {
    navbar: { logo: { alt: 'Altium', src: 'img/altium-logo.svg', width: 90, height: 20 } },
  },
};
```

A site's own CSS still goes in the classic preset's `theme.customCss`, which loads after this theme.

### The search engine

`search.engine` is a plain ES module, the same one the site's Node build scripts import. It exports:

- `KINDS`: `{ [kind]: { label, group, weight } }`.
- `GROUPS`: the tabs, `[{ id, label, tone }]`, where `tone` (`accent`, `neutral`, `outline` or `green`) colours the kind pills.
- `loadIndex(payload)`: returns `{ records, index, … }`. Everything it returns is passed back to `search` as options.
- `search(index, records, query, options)`: returns `[{ record, score }]`, best first.
- `identifierWords` and `isStopWord`, which the theme uses for highlighting. Re-export them from `@altium-developer/docusaurus-theme/search`.
- Optionally `present(results, group)`, which folds results (for example, members that share a name) before they are counted and shown.

A record has `i` (its index in `records`), `n` (name), `k` (kind) and `u` (URL without `baseUrl`). It can optionally have `t` (page title) and `d` (text), plus any fields of the site's own.

### Extension points

Use swizzling (`src/theme/<Name>`) to customise these:

- `SearchResult` is what a result row shows. Use it for a parent type, a signature, a namespace chip or deprecation.
- `SearchFilters` is a hook that returns `{ options, controls, key }`. Use it for extra filters next to the tabs, such as a namespace select or "hide deprecated".

## Packaging

The theme ships untranspiled `.js` with JSX. Docusaurus compiles it because the package path contains `docusaurus`, so there is no build step. It has no dependencies of its own. Docusaurus, React and the classic theme are peer dependencies, and `minisearch` belongs to the site's engine.
