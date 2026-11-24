import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fakeEventTarget, memoryStorage } from './helpers/fake-dom.js';

// Guards the wiring between the browser modules, which no unit test of a single module
// sees: a name imported from a module that does not export it, and a name used without
// being imported (a ReferenceError that shows only when the code runs in the browser).

const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);

    return path.endsWith('.js') && !path.endsWith('service-worker.js') ? [path] : [];
  });
}

const FILES = [...sourceFiles(join(DOCS, 'js')), ...sourceFiles(join(DOCS, 'scales'))];
const TEXT = new Map(FILES.map((file) => [file, readFileSync(file, 'utf8')]));
const label = (file) => relative(DOCS, file);

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Source without comments and string / template literals, so words in them are not names
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''")
    .replace(/`(?:[^`\\]|\\[\s\S]|\$\{[^}]*\})*`/g, (literal) => [...literal.matchAll(/\$\{([^}]*)\}/g)].map((m) => ` ${m[1]} `).join(''));
}

// Names a module exports
function exportedNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+(\w+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    m[1].split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => names.add(part.split(/\s+as\s+/).pop()));
  }

  return names;
}

// [{ names, from }] of the named imports of a module
function namedImports(text) {
  return [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)].map((m) => ({
    names: m[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => part.split(/\s+as\s+/)[0]),
    from: m[2],
  }));
}

function resolveImport(file, specifier) {
  return specifier.startsWith('/') ? join(DOCS, specifier) : resolve(dirname(file), specifier);
}

describe('module imports', () => {
  it('finds the browser modules', () => {
    assert.ok(FILES.length > 30);
  });

  it('every named import is exported by the module it comes from', () => {
    const problems = [];
    for (const [file, text] of TEXT) {
      for (const { names, from } of namedImports(withoutComments(text))) {
        const target = resolveImport(file, from);
        const targetText = TEXT.get(target);
        if (targetText === undefined) {
          problems.push(`${label(file)}: ${from} does not exist`);
          continue;
        }
        const exported = exportedNames(targetText);
        for (const name of names) if (!exported.has(name)) problems.push(`${label(file)}: ${from} does not export ${name}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  it('every name of another module that a module uses is imported or declared there', () => {
    const owners = new Map();
    for (const [file, text] of TEXT) for (const name of exportedNames(text)) owners.set(name, [...(owners.get(name) ?? []), file]);
    const problems = [];
    for (const [file, text] of TEXT) {
      const source = code(text);
      const imported = new Set(namedImports(withoutComments(text)).flatMap(({ names }) => names));
      for (const name of owners.keys()) {
        if (imported.has(name) || owners.get(name).includes(file)) continue;
        const used = new RegExp(`(?<![\\w$.])${name}(?![\\w$])(?!\\s*:)`).test(source);
        const declared = new RegExp(`\\b(?:function|const|let|class|var)\\s+${name}\\b|[({,]\\s*${name}\\s*[,)=}]`).test(source);
        if (used && !declared) problems.push(`${label(file)} uses ${name} (from ${owners.get(name).map(label).join(', ')}) without importing it`);
      }
    }
    assert.deepEqual(problems, []);
  });

  it('every module under docs/js loads in Node', async () => {
    // Pages wire themselves up on import: give them a document and a window to wire to
    Object.assign(globalThis, { document: fakeEventTarget(), window: fakeEventTarget(), localStorage: memoryStorage() });
    for (const file of FILES.filter((f) => f.startsWith(join(DOCS, 'js')))) {
      await assert.doesNotReject(import(pathToFileURL(file).href), label(file));
    }
  });
});
