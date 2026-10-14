import React from 'react';
import Metadata from '@theme-init/DocItem/Metadata';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { markdownHref } from '../../markdownRoute';

// Every doc page advertises its Markdown twin, written by the site's `npm run llms` next to the HTML.
export default function MetadataWrapper(props) {
  const { metadata } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const href = markdownHref(metadata.permalink, siteConfig.baseUrl);
  return (
    <>
      <Metadata {...props} />
      <Head>
        <link rel="alternate" type="text/markdown" href={href} />
      </Head>
    </>
  );
}
