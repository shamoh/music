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

describe('site header', () => {
  const pageHtml = (path) => readFileSync(join(DOCS, path), 'utf8');
  const PAGES_WITH_HEADER = [
    'history.html',
    'index.html',
    'license.html',
    'metronome/index.html',
    'scales/index.html',
    'scales/instrument/saxophone/alto/index.html',
  ];

  it('is rendered by initSitePage (site-layout.js) on every page, not copied into it', () => {
    const pagesWithHeader = htmlFiles(DOCS).filter((file) => readFileSync(file, 'utf8').includes('<header'));
    assert.deepEqual(pagesWithHeader.map((file) => file.slice(DOCS.length)).sort(), PAGES_WITH_HEADER);

    for (const file of pagesWithHeader) {
      const html = readFileSync(file, 'utf8');
      const page = file.slice(DOCS.length);
      assert.ok(html.includes('<header id="site-header"></header>'), `${page}: no header container`);
      assert.ok(html.includes('<footer class="app-footer" id="app-footer"></footer>'), `${page}: no footer container`);
      assert.ok(!html.includes('class="logo"') && !html.includes('id="settings-panel"'), `${page}: header markup copied into the page`);
    }
  });

  it('loads analytics on the section pages and registers the service worker on every page', () => {
    const initCall = (path) => readFileSync(join(DOCS, path), 'utf8').match(/initSitePage\(([^\n]*)\)/)[1];

    for (const path of ['index.html', 'js/app.js', 'js/metronome.js', 'scales/instrument/saxophone/alto/app.js']) {
      assert.match(initCall(path), /analytics: true/, path);
    }
    for (const path of ['index.html', 'js/app.js', 'js/metronome.js', 'scales/instrument/saxophone/alto/app.js', 'history.html', 'license.html']) {
      assert.doesNotMatch(initCall(path), /offlineSupport/, path);
    }
    for (const path of ['history.html', 'license.html']) {
      assert.equal(initCall(path), '', path);
    }
  });

  it('marks the current section on the section pages', () => {
    assert.match(pageHtml('index.html'), /initSitePage\(\{ currentSectionId: 'theory'/);
    assert.match(readFileSync(join(DOCS, 'js/app.js'), 'utf8'), /initSitePage\(\{ currentSectionId: 'scales'/);
    assert.match(readFileSync(join(DOCS, 'js/metronome.js'), 'utf8'), /initSitePage\(\{ currentSectionId: 'metronome'/);
  });
});

describe('saved visual profile before the first paint', () => {
  it('every page with a header applies it by the shared head script, not an inline copy', () => {
    for (const file of htmlFiles(DOCS).filter((f) => readFileSync(f, 'utf8').includes('<header'))) {
      const html = readFileSync(file, 'utf8');
      const head = html.slice(0, html.indexOf('</head>'));
      assert.ok(head.includes('<script src="/js/apply-saved-profile-vars.js"></script>'), `${file.slice(DOCS.length)}: no head script`);
      assert.ok(!html.includes("localStorage.getItem('scales-profile-vars')"), `${file.slice(DOCS.length)}: inline copy`);
    }
  });

  it('reads the key the visual profile is stored under', () => {
    const headScript = readFileSync(join(DOCS, 'js/apply-saved-profile-vars.js'), 'utf8');
    const themes = readFileSync(join(DOCS, 'js/themes.js'), 'utf8');

    assert.match(headScript, /localStorage\.getItem\('scales-profile-vars'\)/);
    assert.match(themes, /localStorage\.setItem\('scales-profile-vars'/);
  });
});
