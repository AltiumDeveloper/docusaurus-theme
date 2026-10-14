// The sites write a Markdown twin next to every built page (`npm run llms`):
// /reference/design/overview → /reference/design/overview.md, the home page → /index.md.
// `permalink` is the doc's permalink (it includes `baseUrl`); the result is a base-URL-prefixed path.
export function markdownHref(permalink, baseUrl) {
  const route = permalink.slice(baseUrl.length).replace(/\/+$/, '');
  return `${baseUrl}${route === '' ? 'index' : route}.md`;
}
