// Site search: a navbar button (⌘K / Ctrl+K, or "/") opening a modal over the site's search index.
// This is only the UI. Ranking is the site's engine (theme option `search.engine`): KINDS and GROUPS (the tabs),
// loadIndex(payload), search(index, records, query, options), identifierWords and isStopWord (highlighting), and
// optionally present(results, group) to fold results before they are counted and shown. The engine and the index are
// loaded on first use (hovering or focusing the button prefetches them), so they cost nothing on page load.
// Extension points: @theme/SearchResult (what a row shows) and @theme/SearchFilters (extra filters).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from '@docusaurus/router';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import { usePluginData } from '@docusaurus/useGlobalData';
import SearchResult from '@theme/SearchResult';
import useSearchFilters from '@theme/SearchFilters';
import styles from './styles.module.css';

const RECENT_MAX = 8;
const SHOWN = 60;

const DEFAULTS = {
  label: 'Search the documentation',
  placeholder: 'Search the documentation',
  recentKey: 'altium-docs-search-recent',
  intro: 'Type a few words or a name. Headings that match come first.',
  examples: [],
};

// Theme options (`search`), and the index under its content-hashed name, so a cached index never meets newer code; the
// plain name when there is no hashed index (dev server).
function useSearchConfig() {
  const { withBaseUrl } = useBaseUrlUtils();
  const data = usePluginData('altium-docusaurus-theme') ?? {};
  return useMemo(
    () => ({ ...DEFAULTS, ...data.search, indexUrl: withBaseUrl(`/${data.file ?? 'search-index.json'}`) }),
    [data, withBaseUrl],
  );
}

let loading = null;
function loadSearch(indexUrl) {
  loading ??= Promise.all([
    import('@altium-docusaurus-theme/search-engine'),
    fetch(indexUrl).then((response) => {
      if (!response.ok) throw new Error(`search index: HTTP ${response.status}`);
      return response.json();
    }),
  ]).then(([engine, payload]) => ({ engine, ...engine.loadIndex(payload) }));
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

function readRecent(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

// Keeps the record's short fields (a site's own included) except its id and text.
function remember(key, record) {
  const { i, d, ...entry } = record;
  const rest = readRecent(key).filter((recent) => recent.u !== entry.u);
  try {
    localStorage.setItem(key, JSON.stringify([entry, ...rest].slice(0, RECENT_MAX)));
  } catch {
    // private mode: no history
  }
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Marks the parts of `text` that start with a query word.
function Highlight({ text, words }) {
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'ig');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className={styles.mark}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>))}
    </>
  );
}

// The kind's label, coloured by its group's `tone` in the engine's GROUPS: accent, neutral, outline or green.
function KindPill({ kind, engine }) {
  const meta = engine?.KINDS?.[kind];
  const tone = engine?.GROUPS?.find((g) => g.id === meta?.group)?.tone ?? 'neutral';
  return <span className={`${styles.kind} ${styles[`tone_${tone}`] ?? ''}`}>{meta?.label ?? kind}</span>;
}

function Row({ record, active, id, onPick, onHover, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <li
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      className={`${styles.result} ${active ? styles.active : ''}`}
      onMouseMove={onHover}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => onPick(record, event.metaKey || event.ctrlKey)}
    >
      {children}
    </li>
  );
}

function SearchModal({ config, onClose, initialQuery }) {
  const { withBaseUrl } = useBaseUrlUtils();
  const history = useHistory();
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState('all');
  const [active, setActive] = useState(0);
  const [recent] = useState(() => readRecent(config.recentKey));
  const inputRef = useRef(null);
  const filters = useSearchFilters({ loaded });

  useEffect(() => {
    loadSearch(config.indexUrl).then(setLoaded, (err) => setError(String(err?.message ?? err)));
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [config.indexUrl]);

  const { results, counts, elapsed } = useMemo(() => {
    const empty = { results: [], counts: {}, elapsed: 0 };
    if (!loaded || !query.trim()) return empty;
    const { engine } = loaded;
    const present = engine.present ?? ((list) => list);
    const started = performance.now();
    const all = engine.search(loaded.index, loaded.records, query, { ...loaded, ...filters.options, limit: 400 });
    const tally = { all: 0 };
    for (const { record } of present(all, 'all')) {
      const g = engine.KINDS[record.k]?.group;
      tally[g] = (tally[g] ?? 0) + 1;
      tally.all += 1;
    }
    const inGroup = group === 'all' ? all : all.filter(({ record }) => engine.KINDS[record.k]?.group === group);
    return { results: present(inGroup, group).slice(0, SHOWN), counts: tally, elapsed: performance.now() - started };
    // filters.key stands for filters.options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, query, group, filters.key]);

  const words = useMemo(
    () => (loaded
      ? [...new Set(query.trim().split(/\s+/).flatMap((w) => loaded.engine.identifierWords(w)))]
        .filter((w) => w.length >= 2 && !loaded.engine.isStopWord(w))
      : []),
    [loaded, query],
  );

  useEffect(() => {
    setActive(0);
  }, [query, group, filters.key]);

  const pick = useCallback((record, newTab = false) => {
    if ('i' in record) remember(config.recentKey, record);
    const href = withBaseUrl(record.u);
    if (newTab) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    onClose();
    history.push(href);
  }, [config.recentKey, history, onClose, withBaseUrl]);

  const recentShown = !query.trim() ? recent : [];
  const listLength = query.trim() ? results.length : recentShown.length;
  const groups = loaded?.engine.GROUPS ?? [{ id: 'all', label: 'All' }];

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(listLength - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = query.trim() ? results[active]?.record : recentShown[active];
      if (target) pick(target, event.metaKey || event.ctrlKey);
    } else if (event.key === 'Tab' && query.trim()) {
      // Tab / Shift+Tab cycle the tabs.
      event.preventDefault();
      const ids = groups.map((g) => g.id);
      const next = (ids.indexOf(group) + (event.shiftKey ? -1 : 1) + ids.length) % ids.length;
      setGroup(ids[next]);
    }
  };

  const shared = { loaded, Highlight, KindPill };
  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={config.label} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className={styles.header}>
          <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true"><path d="M14.4 12.9l4.3 4.3-1.5 1.5-4.3-4.3a7.5 7.5 0 111.5-1.5zM8.5 14a5.5 5.5 0 100-11 5.5 5.5 0 000 11z" fill="currentColor" /></svg>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={config.placeholder}
            aria-label="Search"
            aria-controls="site-search-results"
            aria-activedescendant={listLength ? `site-search-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="button" className={styles.esc} onClick={onClose} aria-label="Close search">esc</button>
        </div>
        <div className={styles.filters}>
          <div className={styles.tabs} role="tablist">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={group === g.id}
                className={`${styles.tab} ${group === g.id ? styles.tabActive : ''}`}
                onClick={() => {
                  setGroup(g.id);
                  inputRef.current?.focus();
                }}
              >
                {g.label}
                {query.trim() && loaded ? <span className={styles.count}>{counts[g.id] ?? 0}</span> : null}
              </button>
            ))}
          </div>
          {filters.controls}
        </div>
        <div className={styles.body}>
          {error && <p className={styles.empty}>Search is unavailable: {error}</p>}
          {!error && !loaded && <p className={styles.empty}>Loading the index…</p>}
          {loaded && !query.trim() && (
            recentShown.length ? (
              <>
                <div className={styles.section}>Recently opened</div>
                <ul className={styles.list} id="site-search-results" role="listbox">
                  {recentShown.map((item, i) => (
                    <Row key={item.u} id={`site-search-${i}`} record={item} active={i === active} onPick={pick} onHover={() => setActive(i)}>
                      <SearchResult record={item} words={[]} compact {...shared} />
                    </Row>
                  ))}
                </ul>
              </>
            ) : (
              <div className={styles.tips}>
                <p>{config.intro}</p>
                {config.examples.length > 0 && (
                  <ul>
                    {config.examples.map(({ query: example, text }) => {
                      const queries = [example].flat();
                      return (
                        <li key={queries.join()}>
                          {queries.map((q, i) => <React.Fragment key={q}>{i > 0 && ' or '}<code>{q}</code></React.Fragment>)}: {text}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )
          )}
          {loaded && query.trim() && (results.length ? (
            <ul className={styles.list} id="site-search-results" role="listbox">
              {results.map((result, i) => (
                <Row key={result.record.i} id={`site-search-${i}`} record={result.record} active={i === active} onPick={pick} onHover={() => setActive(i)}>
                  <SearchResult record={result.record} result={result} words={words} onPick={pick} {...shared} />
                </Row>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No results for “{query.trim()}”{group !== 'all' ? ' in this tab' : ''}.</p>
          ))}
        </div>
        <div className={styles.footer}>
          <span><kbd>↑</kbd><kbd>↓</kbd> select</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>{isMac() ? '⌘' : 'Ctrl'}</kbd><kbd>↵</kbd> new tab</span>
          <span><kbd>tab</kbd> next tab</span>
          <span className={styles.spacer} />
          {query.trim() && loaded ? <span>{counts.all ?? 0} results · {elapsed.toFixed(0)} ms</span> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SearchBar() {
  const config = useSearchConfig();
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');
  const [mac, setMac] = useState(false);
  const prefetch = useCallback(() => {
    loadSearch(config.indexUrl).catch(() => {});
  }, [config.indexUrl]);

  useEffect(() => {
    setMac(isMac());
    const onKey = (event) => {
      const target = event.target;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setInitialQuery('');
        setOpen((o) => !o);
      } else if (event.key === '/' && !typing) {
        event.preventDefault();
        setInitialQuery('');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen(true)}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        aria-label={config.label}
      >
        <svg className={styles.buttonIcon} viewBox="0 0 20 20" aria-hidden="true"><path d="M14.4 12.9l4.3 4.3-1.5 1.5-4.3-4.3a7.5 7.5 0 111.5-1.5zM8.5 14a5.5 5.5 0 100-11 5.5 5.5 0 000 11z" fill="currentColor" /></svg>
        <span className={styles.buttonLabel}>Search</span>
        <span className={styles.buttonKeys}><kbd>{mac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd></span>
      </button>
      {open && <SearchModal config={config} initialQuery={initialQuery} onClose={() => setOpen(false)} />}
    </>
  );
}
