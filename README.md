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

## Install

The theme is not on npm. Each release attaches the package tarball to its
[GitHub Release](https://github.com/AltiumDeveloper/docusaurus-theme/releases), and a site depends on that URL:

```bash
npm install https://github.com/AltiumDeveloper/docusaurus-theme/releases/download/v0.1.0/altium-developer-docusaurus-theme-0.1.0.tgz
```

This needs no token and no registry configuration. The lockfile records the tarball's checksum, and a release asset is never replaced, so `npm ci` installs exactly what was tested. Each tarball carries a build provenance attestation:

```bash
gh attestation verify altium-developer-docusaurus-theme-0.1.0.tgz --repo AltiumDeveloper/docusaurus-theme
```

Dependabot doesn't follow URL dependencies. To update a site, change the version in the URL (twice: the tag and the file name), then run `npm install`.

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
        engine: 'src/search/engine.mjs', // relative to the site directory
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

`recentKey` names the browser storage for recently opened results, and it must be different on every site. The sites share the `altiumdeveloper.github.io` origin, so two sites with the same key show each other's history, with links that point at the wrong site.

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

## Moving a site onto the theme

1. Install the release tarball and configure the theme as shown in [Use](#use). Remove `plugins/search-index.cjs` from `plugins`.
2. Delete the copies the theme now provides:
   - `static/img/altium-logo.svg` and `static/img/favicon.svg`
   - `src/css/fonts/`
   - `src/theme/DocBreadcrumbs`, `src/theme/DocItem/Metadata`, `src/theme/markdownRoute.ts` and `src/theme/SearchBar`
   - `plugins/search-index.cjs`
3. Cut the generic part out of `src/css/custom.css`: everything up to and including the footer section. Keep only the site's own rules.
4. In the engine, import the text helpers from `@altium-developer/docusaurus-theme/search`, add a `tone` to each `GROUPS` entry and re-export `identifierWords` and `isStopWord`. Keep the ranking.
5. Scripts that used `hashedName` from `plugins/search-index.cjs` should take it from `require('@altium-developer/docusaurus-theme')` instead.
6. Swizzle `SearchResult` and `SearchFilters` for anything the default row and filters don't show.
7. Build. The site's own checks (search index, links, llms) must pass, and the built CSS should match the old build apart from CSS-module hashes.

## Development

```bash
npm test                                   # unit tests: search/core.mjs and the plugin
cd fixture && npm ci && npm run build      # a site built with the theme, then checked (scripts/check.mjs)
npm run start --prefix fixture             # the same site on the dev server
```

`fixture/` uses the theme through `file:..`. CI also builds it from the packed tarball, which is what the sites install.

To try an unreleased change in a real site, run `npm pack` here and `npm install ../docusaurus-theme/altium-developer-docusaurus-theme-<version>.tgz` there. Don't commit that dependency.

## Releasing

1. Bump `version` in `package.json` and add a `## <version>` section to `CHANGELOG.md`.
2. Merge, then tag the merge commit:

   ```bash
   git tag v<version> && git push origin v<version>
   ```

3. `release.yml` runs CI, then attaches the tarball that CI built and tested to a new GitHub Release, with a provenance attestation. A tag whose release already exists fails, because sites pin the asset's checksum: fix forward with a new version.
4. Bump the URL in each site.
