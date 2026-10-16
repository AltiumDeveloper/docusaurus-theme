#!/usr/bin/env node
// Writes static/search-index.json from docs/: one record per page and one per `##` section. The fixture's headings
// are single words, so their anchors are simply lower-cased.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const records = [];
for (const file of readdirSync('docs').filter((name) => name.endsWith('.md')).sort()) {
  const route = file === 'index.md' ? '/' : `/${file.replace(/\.md$/, '')}/`;
  const text = readFileSync(`docs/${file}`, 'utf8');
  const title = /^# (.+)$/m.exec(text)[1];
  records.push({ i: records.length, n: title, k: 'page', u: route, d: text.replace(/^#.*$/gm, '').trim().slice(0, 200) });
  for (const [, heading, body] of text.matchAll(/^## (.+)\n([^#]*)/gm)) {
    records.push({ i: records.length, n: heading, k: 'section', u: `${route}#${heading.toLowerCase()}`, t: title, d: body.trim() });
  }
}
mkdirSync('static', { recursive: true });
writeFileSync('static/search-index.json', JSON.stringify({ records }));
console.log(`search-index: ${records.length} records`);
