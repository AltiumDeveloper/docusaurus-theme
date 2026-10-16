// Unit tests for the engines' shared text handling (search/core.mjs). Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileSynonyms, coverage, dropTail, identifierWords, isStopWord, makeTokenizer, normalise, queryWords, singular,
  synonymsOf, tokenize, withinEdits,
} from '../search/core.mjs';

test('identifierWords: camelCase, acronyms, digits, separators', () => {
  assert.deepEqual(identifierWords('signIntoWorkspace'), ['sign', 'into', 'workspace']);
  assert.deepEqual(identifierWords('BOMItem_v2'), ['bom', 'item', 'v', '2']);
  assert.deepEqual(identifierWords('design.project.byId'), ['design', 'project', 'by', 'id']);
  assert.deepEqual(identifierWords('secure=1'), ['secure', '1']);
  assert.deepEqual(identifierWords(undefined), []);
});

test('singular: plurals, and words that only look plural', () => {
  assert.equal(singular('tokens'), 'token');
  assert.equal(singular('entries'), 'entry');
  assert.equal(singular('addresses'), 'address');
  for (const word of ['status', 'class', 'analysis', 'bus', 'its']) assert.equal(singular(word), word);
});

test('tokenize: whole identifier, its parts and their singulars', () => {
  assert.deepEqual(tokenize('signIntoWorkspaces'), ['signintoworkspaces', 'sign', 'into', 'workspaces', 'workspace']);
  assert.deepEqual(tokenize('the access_token'), ['the', 'access_token', 'access', 'token']);
  assert.deepEqual(tokenize(null), []);
});

test('makeTokenizer: name suffixes only in the configured fields', () => {
  const tokenizeNames = makeTokenizer({ suffixFields: ['name'] });
  assert.ok(tokenizeNames('desComponentType', 'name').includes('componenttype'));
  assert.ok(!tokenizeNames('desComponentType', 'text').includes('componenttype'));
});

test('stop words and normalise', () => {
  assert.ok(isStopWord('the'));
  assert.ok(!isStopWord('token'));
  assert.equal(normalise('On-Prem (AES)'), 'onpremaes');
});

test('withinEdits: Damerau-Levenshtein with transpositions', () => {
  assert.ok(withinEdits('refesh', 'refresh', 1));
  assert.ok(withinEdits('workspcae', 'workspace', 1));
  assert.ok(!withinEdits('goverment', 'gov', 2));
  assert.ok(withinEdits('goverment', 'government', 1));
});

test('synonyms: compiled patterns, skipped when the query already has the word', () => {
  const synonyms = compileSynonyms([{ match: 'on-?prem', add: 'aes' }, { match: '\\bgov\\b', add: 'govcloud' }]);
  assert.deepEqual(synonymsOf('On-prem setup', synonyms), ['aes']);
  assert.deepEqual(synonymsOf('aes on-prem', synonyms), []);
  assert.deepEqual(synonymsOf('gov tokens', synonyms), ['govcloud']);
});

test('coverage: squared share of query words present', () => {
  assert.equal(coverage('anything', ['one']), 1);
  assert.equal(coverage('refresh a token', ['refresh', 'token']), 1);
  assert.equal(coverage('refresh only', ['refresh', 'token']), 0.25);
});

test('queryWords: stop words dropped from phrases only', () => {
  assert.deepEqual(queryWords('project by id'), { words: ['project', 'id'], phrase: true });
  assert.deepEqual(queryWords('by id'), { words: ['by', 'id'], phrase: false });
});

test('dropTail: keeps results within the relative floor of the best', () => {
  const scored = [{ score: 100 }, { score: 3 }, { score: 1 }];
  assert.deepEqual(dropTail(scored), [{ score: 100 }, { score: 3 }]);
  assert.deepEqual(dropTail([]), []);
});
