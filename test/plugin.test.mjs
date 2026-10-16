// Unit tests for the theme plugin (index.js): hashed index publishing, global data, the engine alias and the files the
// theme points Docusaurus at. Run with `npm test`.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const altiumTheme = require('../index.js');

function site(withIndex) {
  const siteDir = mkdtempSync(join(tmpdir(), 'altium-theme-'));
  if (withIndex) {
    mkdirSync(join(siteDir, 'static'));
    writeFileSync(join(siteDir, 'static/search-index.json'), '{"records":[]}');
  }
  return siteDir;
}

async function withEnv(value, run) {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    process.env.NODE_ENV = saved;
  }
}

test('production build: the index is published under its content hash', async () => {
  const siteDir = site(true);
  const plugin = altiumTheme({ siteDir }, { search: { engine: '/site/engine.mjs', recentKey: 'k' } });
  const content = await withEnv('production', () => plugin.loadContent());
  assert.equal(content.file, altiumTheme.hashedName(Buffer.from('{"records":[]}')));
  assert.match(content.file, /^search-index\.[0-9a-f]{10}\.json$/);

  let data;
  await plugin.contentLoaded({ content, actions: { setGlobalData: (value) => { data = value; } } });
  // The engine path is build-time only: it never reaches the browser.
  assert.deepEqual(data, { file: content.file, search: { recentKey: 'k' } });

  const outDir = mkdtempSync(join(tmpdir(), 'altium-theme-out-'));
  await plugin.postBuild({ content, outDir });
  assert.equal(readFileSync(join(outDir, content.file), 'utf8'), '{"records":[]}');
});

test('dev server or no index: the plain name', async () => {
  const dev = altiumTheme({ siteDir: site(true) }, {});
  assert.deepEqual(await withEnv('development', () => dev.loadContent()), { file: null, bytes: null });
  const missing = altiumTheme({ siteDir: site(false) }, {});
  assert.deepEqual(await withEnv('production', () => missing.loadContent()), { file: null, bytes: null });
});

test('the engine alias points at the site engine (site-relative or absolute), or the stand-in', () => {
  const siteDir = site(false);
  const alias = (options) => Object.values(altiumTheme({ siteDir }, options).configureWebpack().resolve.alias)[0];
  assert.equal(alias({ search: { engine: 'src/search/engine.mjs' } }), join(siteDir, 'src/search/engine.mjs'));
  assert.equal(alias({ search: { engine: '/site/engine.mjs' } }), '/site/engine.mjs');
  assert.match(alias({}), /search[\\/]no-engine\.mjs$/);
});

test('theme path, CSS and static assets exist', () => {
  const plugin = altiumTheme({ siteDir: site(false) }, {});
  assert.equal(plugin.name, altiumTheme.NAME);
  for (const component of ['SearchBar/index.js', 'SearchResult/index.js', 'SearchFilters/index.js', 'DocBreadcrumbs/index.js']) {
    assert.ok(existsSync(join(plugin.getThemePath(), component)), component);
  }
  for (const file of plugin.getClientModules()) assert.ok(existsSync(file), file);
  for (const file of ['img/altium-logo.svg', 'img/favicon.svg']) assert.ok(existsSync(join(altiumTheme.staticDir, file)), file);
});
