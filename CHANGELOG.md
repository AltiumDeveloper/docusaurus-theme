# Changelog

All notable changes to this theme. Versions follow [semver](https://semver.org/): a change a site has to act on
(a renamed option, a removed extension point, a new engine requirement) is a major version while below 1.0, a minor
one after.

## 0.1.0

First release, extracted from the copies in ad-sdk-docs, platform-api-docs and altium-auth.

- **Look:** `css/theme.css` (fonts, tokens, navbar, sidebar, breadcrumbs, content, landing page, footer), the Inter and JetBrains Mono fonts, and the Altium logo and favicon (`staticDir`).
- **Markdown twins:** a "View as Markdown" link on the breadcrumbs row and a `<link rel="alternate" type="text/markdown">` on every doc page.
- **Search:** the `SearchBar` modal over a site engine (option `search.engine`), with the index published under a content-hashed name. On the dev server the SearchBar uses the plain `search-index.json` name. Extension points are `SearchResult`, `SearchFilters` and the engine's optional `present`.
- **`@altium-developer/docusaurus-theme/search`:** the text helpers for engines (identifiers, plurals, stop words, typo distance, synonyms).
