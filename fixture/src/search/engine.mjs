// The smallest engine that meets the SearchBar contract (see the theme README): kinds and tabs, loadIndex, search,
// and the highlighting helpers re-exported from the theme.
import MiniSearch from 'minisearch';
import { identifierWords, isStopWord, normalise, tokenize } from '@altium-developer/docusaurus-theme/search';

export { identifierWords, isStopWord };

export const KINDS = {
  page: { label: 'Page', group: 'pages', weight: 1.2 },
  section: { label: 'Section', group: 'sections', weight: 1 },
};

export const GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'pages', label: 'Pages', tone: 'green' },
  { id: 'sections', label: 'Sections', tone: 'accent' },
];

export function loadIndex(payload) {
  const index = new MiniSearch({
    idField: 'i',
    fields: ['n', 'd'],
    storeFields: [],
    tokenize,
    processTerm: (term) => (isStopWord(term) ? null : term),
  });
  index.addAll(payload.records);
  return { records: payload.records, index };
}

export function search(index, records, query, { limit = 50 } = {}) {
  if (!query.trim()) return [];
  const q = normalise(query);
  return index
    .search(query, { boost: { n: 4 }, prefix: true, fuzzy: 0.2 })
    .map((hit) => {
      const record = records[hit.id];
      const exact = normalise(record.n) === q ? 4 : 1;
      return { record, score: hit.score * exact * (KINDS[record.k]?.weight ?? 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
