// Extra search filters next to the kind tabs (a namespace select, "hide deprecated"). A hook, not a component: the
// SearchBar passes `options` to the engine's `search` and renders `controls` after the tabs; a change of `key` resets
// the selection. None by default; swizzle this to add a site's own.
//   loaded   the loaded engine and index, or null while loading
export default function useSearchFilters(/* { loaded } */) {
  return { options: {}, controls: null, key: '' };
}
