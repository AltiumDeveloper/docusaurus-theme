// Text handling shared by the sites' search engines: tokenizing identifiers and prose, plurals, stop words, typo
// distance and synonyms. Ranking is not here: each site's engine (theme option `search.engine`) owns its record kinds,
// boosts and re-ranking rules, and imports these from '@altium-developer/docusaurus-theme/search'. Plain ES module,
// so the same code runs in the browser and in the sites' Node build scripts.

// Splits an identifier into its words: `signIntoWorkspace` → sign into workspace, `access_token` → access token,
// `BOMItem_v2` → bom item v 2, `design.project.byId` → design project by id.
export function identifierWords(identifier) {
  return String(identifier ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const WORD = /[A-Za-z0-9_][\w.]*[A-Za-z0-9_]|[A-Za-z0-9]/g;

// English plural → singular (`tokens` → token, `entries` → entry, `addresses` → address), leaving words that only
// look plural alone (`status`, `class`, `analysis`, `bus`).
export function singular(word) {
  if (word.length <= 3 || /(?:ss|us|is|ics)$/.test(word)) return word;
  if (/ies$/.test(word) && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(?:ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

// → a MiniSearch `tokenize(text, fieldName)`. Every word becomes its lower-cased self (identifiers stay whole,
// `signIntoWorkspace` → `signintoworkspace`) plus its parts and their singulars, so a query matches either the whole
// name or any word in it, in either number. Used for both indexing and querying.
// `suffixFields` also get each name's suffixes at word boundaries (`desComponentType` → `componenttype`), for sites
// whose names start with a prefix readers rarely type.
export function makeTokenizer({ suffixFields = [] } = {}) {
  const suffixed = new Set(suffixFields);
  return (text, fieldName) => {
    const tokens = [];
    for (const word of String(text ?? '').match(WORD) ?? []) {
      const whole = word.toLowerCase();
      tokens.push(whole);
      const parts = identifierWords(word);
      if (parts.length > 1 || parts[0] !== whole) tokens.push(...parts);
      for (const part of parts) {
        const one = singular(part);
        if (one !== part) tokens.push(one);
      }
      if (suffixed.has(fieldName)) for (let k = 1; k < parts.length - 1; k += 1) tokens.push(parts.slice(k).join(''));
    }
    return tokens;
  };
}

export const tokenize = makeTokenizer();

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'what', 'which', 'with']);

export const isStopWord = (word) => STOP_WORDS.has(word);

export const normalise = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Damerau-Levenshtein distance (adjacent transpositions count as one edit) ≤ max, with an early exit.
export function withinEdits(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prevPrev = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prevPrev[j - 2] + 1);
      row.push(value);
      if (value < best) best = value;
    }
    if (best > max) return false;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length] <= max;
}

// Phrasings readers use for terms the pages spell differently (the index payload's `synonyms`): `{ match, add }` →
// `[pattern, words]`.
export const compileSynonyms = (synonyms = []) => synonyms.map(({ match, add }) => [new RegExp(match, 'i'), String(add)]);

// → the words the query stands for ("on-prem" → ['aes']); empty when none applies.
export function synonymsOf(query, synonyms = []) {
  const lower = query.toLowerCase();
  return synonyms.filter(([pattern, word]) => pattern.test(lower) && !lower.includes(word)).map(([, word]) => word);
}

// Share of the query's words that `haystack` (a record's lower-cased fields) contains, squared. BM25 already rewards
// it, but a single rare word in a long section can still beat a heading that contains two of three words; squaring
// keeps partial matches below complete ones.
export function coverage(haystack, words) {
  if (words.length < 2) return 1;
  const hits = words.filter((word) => haystack.includes(word)).length;
  return (hits / words.length) ** 2;
}

// The query's words for re-ranking: lower-cased and normalised, stop words dropped from phrases (three words or more)
// only, since in names `by` (`desProjectById`) and `of` are meaningful. `phrase` says whether they were dropped.
export function queryWords(query) {
  let words = query.trim().toLowerCase().split(/\s+/).map(normalise).filter(Boolean);
  const phrase = words.length > 2;
  if (phrase) words = words.filter((word) => !STOP_WORDS.has(word));
  return { words, phrase };
}

// The long tail of a broad OR query (one fuzzy word out of three in a section) is noise, and it inflates the result
// counts: keep what scores within `minRelative` of the best. `scored` must be sorted, best first.
export function dropTail(scored, minRelative = 0.02) {
  const floor = (scored[0]?.score ?? 0) * minRelative;
  return scored.filter((result) => result.score >= floor);
}
