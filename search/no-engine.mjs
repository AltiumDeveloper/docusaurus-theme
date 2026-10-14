// Stand-in for a site that configures no `search.engine`: the SearchBar reports search as unavailable.
export const KINDS = {};
export const GROUPS = [{ id: 'all', label: 'All' }];

export function loadIndex() {
  throw new Error('this site configures no search engine (theme option search.engine)');
}
