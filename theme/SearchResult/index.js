import React from 'react';
import styles from '../SearchBar/styles.module.css';

// The content of one search result (or, `compact`, of a recently opened entry): kind pill, heading, and the page and
// text it comes from. The SearchBar owns the row itself (selection, keyboard, click). Swizzle this to show a site's
// own record fields (a parent type, a signature, a namespace chip, deprecation).
//   record      the index record (`n` name, `k` kind, `u` url, `t` page title, `d` text, plus a site's own fields)
//   words       query words to highlight; `Highlight` and `KindPill` render them and the kind's label
//   loaded      { engine, records, … } as returned by the engine's loadIndex, plus `engine`
export default function SearchResult({ record, words, compact, loaded, Highlight, KindPill }) {
  return (
    <>
      <div className={styles.line}>
        <KindPill kind={record.k} engine={loaded.engine} />
        <span className={styles.guideName}>{compact ? record.n : <Highlight text={record.n} words={words} />}</span>
      </div>
      {!compact && (record.d || record.t) && (
        <div className={styles.description}>
          {record.t && record.t !== record.n && <span className={styles.page}>{record.t} › </span>}
          {record.d && <Highlight text={record.d.length > 180 ? `${record.d.slice(0, 179)}…` : record.d} words={words} />}
        </div>
      )}
    </>
  );
}
