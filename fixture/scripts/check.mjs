#!/usr/bin/env node
// Runs after `docusaurus build`: checks that the built site has everything the theme contributes.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { loadIndex, search } from '../src/search/engine.mjs';

const require = createRequire(import.meta.url);
const { hashedName } = require('@altium-developer/docusaurus-theme');
const BUILD = 'build';
const read = (path) => readFileSync(join(BUILD, path), 'utf8');
const checks = [];
const check = (name, run) => checks.push([name, run]);

check('the search index is published once under its content hash, and under the plain name', () => {
  const hashed = readdirSync(BUILD).filter((name) => /^search-index\.[0-9a-f]+\.json$/.test(name));
  assert.equal(hashed.length, 1, `hashed indexes: ${hashed.join(', ') || 'none'}`);
  const bytes = readFileSync(join(BUILD, hashed[0]));
  assert.equal(hashedName(bytes), hashed[0]);
  assert.deepEqual(readFileSync(join(BUILD, 'search-index.json')), bytes);
});

check('the theme CSS and its fonts are bundled, after Infima', () => {
  const [css] = readdirSync(join(BUILD, 'assets/css')).map((name) => read(`assets/css/${name}`));
  assert.ok(css.includes('font-family:Inter'), 'Inter @font-face');
  assert.ok(css.indexOf('.doc-markdown-row') > css.indexOf('--ifm-color-primary:'), 'theme rules after Infima');
  const fonts = readdirSync(join(BUILD, 'assets/fonts'));
  assert.equal(fonts.filter((name) => name.endsWith('.woff2')).length, 3, fonts.join(', '));
});

check('the logo and favicon come from the theme', () => {
  for (const file of ['img/altium-logo.svg', 'img/favicon.svg']) assert.ok(existsSync(join(BUILD, file)), file);
  assert.ok(read('index.html').includes('href="/fixture/img/favicon.svg"'));
});

check('doc pages link their Markdown twin', () => {
  const html = read('guide/index.html');
  assert.ok(html.includes('View as Markdown'));
  assert.ok(html.includes('rel="alternate" type="text/markdown" href="/fixture/guide.md"'));
  assert.ok(read('index.html').includes('href="/fixture/index.md"'), 'the home page twin is /index.md');
});

check('the SearchBar is in the navbar, with the site options in its global data', () => {
  assert.ok(read('index.html').includes('aria-label="Search the documentation"'));
  const js = readdirSync(join(BUILD, 'assets/js')).map((name) => read(`assets/js/${name}`)).join('\n');
  assert.ok(js.includes('fixture-search-recent'), 'recentKey reaches the browser');
});

check('the engine ranks through the theme helpers', () => {
  const { index, records } = loadIndex(JSON.parse(read('search-index.json')));
  assert.equal(search(index, records, 'tokens')[0].record.u, '/guide/#tokens');
  assert.equal(search(index, records, 'workspace')[0].record.n, 'Workspaces');
});

let failed = 0;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${error.message}`);
  }
}
console.log(`check: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
