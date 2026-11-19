// Consistency of the published site (docs/): files the service worker caches and the
// app's internal links must exist — a moved page would otherwise break offline use.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = new URL('../docs/', import.meta.url).pathname;

// '/scales/' → docs/scales/index.html, '/js/app.js' → docs/js/app.js
function sitePathExists(path) {
  const file = join(DOCS, path);

  return path.endsWith('/') ? existsSync(join(file, 'index.html')) : existsSync(file) && statSync(file).isFile();
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);

    return e.name.endsWith('.html') ? [p] : [];
  });
}

describe('service worker assets', () => {
  const sw = readFileSync(join(DOCS, 'service-worker.js'), 'utf8');
  const assets = [...sw.matchAll(/^\s*'(\/[^']*)',?$/gm)].map((m) => m[1]);

  it('lists the pages and scripts of the app', () => {
    assert.ok(assets.length > 20, `found ${assets.length} assets`);
    assert.ok(assets.includes('/scales/instrument/saxophone/alto/app.js'));
  });

  it('caches only files that exist', () => {
    for (const asset of assets) assert.ok(sitePathExists(asset), `missing: ${asset}`);
  });
});

describe('internal links', () => {
  it('point to existing pages and files', () => {
    for (const file of htmlFiles(DOCS)) {
      const html = readFileSync(file, 'utf8');
      for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
        assert.ok(sitePathExists(url), `${file.slice(DOCS.length)}: missing ${url}`);
      }
    }
  });

  it('keep the old saxophone range address as a redirect to the new one', () => {
    const redirect = readFileSync(join(DOCS, 'scales/instrument/saxophone-alto/index.html'), 'utf8');
    assert.match(redirect, /location\.replace\('\/scales\/instrument\/saxophone\/alto\/' \+ location\.search \+ location\.hash\)/);
  });
});
