#!/usr/bin/env node
/**
 * Decides which CI jobs a change needs, so a PR touching one dialect does not regenerate all 23
 * grammars.
 *
 *   node scripts/changed-grammars.js <base-sha> <head-sha>   # files changed between the two
 *   node scripts/changed-grammars.js --all                   # everything
 *
 * Rules (see classify()):
 *   - a file under <dialect>/ rebuilds that dialect and every dialect that extends it, plus `base`
 *     (the base job checks that every dialect keyword has a highlight capture);
 *   - the ANSI base grammar (grammar.js, grammar/, the shared scanner) is inherited by every
 *     dialect, so it rebuilds everything;
 *   - per-dialect inventory files rebuild only that dialect;
 *   - docs, markdown and unrelated workflows rebuild nothing;
 *   - anything it does not recognise rebuilds everything, and so does a diff it cannot compute.
 *
 * On top of that, a grammar whose inputs are byte-identical to a build that already passed is not built
 * again: every grammar job records a cache marker keyed by a fingerprint of the committed files it
 * depends on (grammarFingerprint) when it succeeds, and this script drops the grammars whose marker
 * exists. The same applies to the bindings jobs (bindingsFingerprint). Needs GH_TOKEN and
 * GITHUB_REPOSITORY; without them nothing is skipped. Bump CACHE_VERSION to invalidate every marker.
 *
 *   node scripts/changed-grammars.js --fingerprints          # print each fingerprint, no GitHub access
 *
 * Writes `matrix`, `run_grammars`, `run_bindings` and `bindings_key` to $GITHUB_OUTPUT when set, and
 * always prints the decision.
 */

import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Slow grammars first, so they start while the cheap ones fill the remaining runners.
const ORDER = [
  'base', 'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery', 'mariadb', 'sqlite',
  'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino', 'athena', 'redshift', 'clickhouse', 'flink',
  'cockroachdb', 'spanner', 'teradata', 'hana',
];

export function dialects() {
  const found = readdirSync(ROOT).filter(
    (d) => existsSync(join(ROOT, d, 'grammar.js')) && existsSync(join(ROOT, d, 'tree-sitter.json')),
  );
  return [...ORDER.filter((d) => d === 'base' || found.includes(d)), ...found.filter((d) => !ORDER.includes(d))];
}

// dialect -> the dialect whose grammar it extends ('base' when it extends the ANSI grammar).
export function parents(list) {
  const out = {};
  for (const d of list) {
    if (d === 'base') continue;
    const m = readFileSync(join(ROOT, d, 'grammar.js'), 'utf8').match(/from\s+['"]\.\.\/([\w-]+)\/grammar\.js['"]/);
    out[d] = m && list.includes(m[1]) ? m[1] : 'base';
  }
  return out;
}

// A dialect plus everything that extends it, directly or not. `base` is the root of every dialect
// but selecting it (the base job) does not mean its grammar changed, so it never expands.
export function withDescendants(seed, parent) {
  const set = new Set(seed);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [d, p] of Object.entries(parent)) {
      if (p !== 'base' && set.has(p) && !set.has(d)) {
        set.add(d);
        grew = true;
      }
    }
  }
  return set;
}

const NOTHING = { all: false, dialects: [], bindings: false };

// -> { all, dialects: [name], bindings }
export function classify(file, list) {
  const top = file.split('/')[0];

  if (list.includes(top) && top !== 'base') return { all: false, dialects: [top, 'base'], bindings: true };

  // Per-dialect inventory data: tools/inventory{,-results,-verify}/<dialect>[.part].{yml,json}
  const inv = file.match(/^tools\/inventory(?:-results|-verify)?\/([\w-]+)\./);
  if (inv && list.includes(inv[1])) return { all: false, dialects: [inv[1]], bindings: false };

  if (/^tools\/(coverage|antlr\/)/.test(file)) return { all: false, dialects: ['base'], bindings: false };

  // The workflow and this selector decide what runs, not what a grammar builds to; the base job is
  // enough to exercise them.
  if (file === '.github/workflows/ci.yml' || file === 'scripts/changed-grammars.js') {
    return { all: false, dialects: ['base'], bindings: false };
  }

  // Shared by every grammar: the ANSI grammar, its scanner, and the build/test machinery.
  if (
    file === 'grammar.js' ||
    file.startsWith('grammar/') ||
    file === 'src/scanner.c' ||
    file.startsWith('src/tree_sitter/') ||
    file === 'package.json' ||
    file === 'package-lock.json' ||
    file === 'tree-sitter.json' ||
    file.startsWith('scripts/') ||
    file.startsWith('tools/')
  ) {
    return { all: true, dialects: [], bindings: true };
  }

  // Base-only: generated base parser blobs, base corpus, base highlights.
  if (file.startsWith('src/') || file.startsWith('test/') || file.startsWith('queries/')) {
    return { all: false, dialects: ['base'], bindings: true };
  }

  // Language bindings and packaging: no grammar changes, but the bindings jobs must run.
  if (
    file.startsWith('bindings/') ||
    /^(Cargo\.(toml|lock)|setup\.py|pyproject\.toml|Package\.swift|CMakeLists\.txt|binding\.gyp|go\.(mod|sum)|MANIFEST\.in)$/.test(file) ||
    file.startsWith('Sources/') ||
    file.startsWith('Tests/')
  ) {
    return { all: false, dialects: [], bindings: true };
  }

  // Nothing that CI builds or tests.
  if (
    file.startsWith('docs/') ||
    file.startsWith('.claude/') ||
    file.startsWith('.github/') ||
    /\.md$/.test(file) ||
    /^(LICENSE|\.gitignore|\.gitattributes|\.editorconfig|\.npmignore)$/.test(file)
  ) {
    return NOTHING;
  }

  return { all: true, dialects: [], bindings: true }; // unknown: be safe
}

export function decide(files, list) {
  const parent = parents(list);
  let all = false;
  let bindings = false;
  const seed = new Set();
  for (const f of files) {
    const c = classify(f, list);
    all ||= c.all;
    bindings ||= c.bindings;
    c.dialects.forEach((d) => seed.add(d));
  }
  const chosen = all ? new Set(list) : withDescendants(seed, parent);
  return { langs: list.filter((d) => chosen.has(d)), bindings: bindings || chosen.size > 0 };
}

// Bump to invalidate every recorded marker (for example after changing what a grammar job checks).
export const CACHE_VERSION = 'v1';
const GRAMMAR_KEY = `grammar-ok-${CACHE_VERSION}-`;
const BINDINGS_KEY = `bindings-ok-${CACHE_VERSION}-`;

export const grammarCacheKey = (lang, fp) => `${GRAMMAR_KEY}${lang}-${fp}`;
export const bindingsCacheKey = (fp) => `${BINDINGS_KEY}${fp}`;

// sha256 over `git ls-files -s` (mode, blob id, path) of the pathspecs: the committed content they
// select, nothing from the working tree.
function treeFingerprint(pathspecs) {
  const listing = execFileSync('git', ['ls-files', '-s', '--', ...pathspecs], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  return createHash('sha256').update(listing).digest('hex').slice(0, 16);
}

// The chain of dialects a dialect extends, nearest first, without `base`.
function ancestors(lang, parent) {
  const out = [];
  for (let p = parent[lang]; p && p !== 'base'; p = parent[p]) out.push(p);
  return out;
}

// Everything the grammar job for `lang` reads: generates, tests, checks blobs against, and compares
// inventory results of. The base job also reads every dialect's committed blobs and queries (the
// highlight sync), so it is fingerprinted over the whole repository minus docs and bindings.
export function grammarFingerprint(lang, list) {
  if (lang === 'base') {
    return treeFingerprint([
      '.', ':(exclude)docs', ':(exclude)bindings', ':(exclude).github', ':(exclude).claude',
      ':(exclude,glob)**/*.md', ':(exclude)Sources', ':(exclude)Tests',
    ]);
  }
  const parent = parents(list);
  return treeFingerprint([
    `${lang}/`,
    ...ancestors(lang, parent).map((a) => `${a}/`),
    // the ANSI grammar and the machinery every dialect build runs
    'grammar.js', 'grammar/', 'src/scanner.c', 'src/tree_sitter/', 'scripts/',
    'package.json', 'package-lock.json', 'tree-sitter.json',
    ':(glob)tools/*.py', ':(glob)tools/*.yml', ':(glob)tools/*.json', 'tools/requirements.txt',
    `:(glob)tools/inventory/${lang}.*`, `:(glob)tools/inventory-results/${lang}.*`, `:(glob)tools/inventory-verify/${lang}.*`,
  ]);
}

// What the bindings jobs build from: the binding sources, packaging files, and every dialect's
// committed parser blobs and queries.
export function bindingsFingerprint() {
  return treeFingerprint([
    'bindings/', 'Sources/', 'Tests/', 'scripts/', 'queries/',
    ':(glob)**/src/*.br', ':(glob)*/queries/*.scm', ':(glob)*/tree-sitter.json',
    'Cargo.toml', 'Cargo.lock', 'setup.py', 'pyproject.toml', 'Package.swift', 'CMakeLists.txt',
    'binding.gyp', 'go.mod', 'go.sum', 'MANIFEST.in', 'package.json', 'package-lock.json', 'tree-sitter.json',
  ]);
}

// Keys of the markers already recorded in the Actions cache, or null when it cannot be asked.
function recordedMarkers() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GH_TOKEN) return null;
  const keys = new Set();
  try {
    for (const prefix of [GRAMMAR_KEY, BINDINGS_KEY]) {
      const out = execFileSync(
        'gh',
        ['api', '--paginate', '-X', 'GET', `repos/${repo}/actions/caches`, '-f', `key=${prefix}`, '-f', 'per_page=100', '-q', '.actions_caches[].key'],
        { cwd: ROOT, encoding: 'utf8' },
      );
      out.split('\n').filter(Boolean).forEach((k) => keys.add(k));
    }
    return keys;
  } catch (e) {
    console.log(`[changed-grammars] could not read the cache markers (${String(e.message).split('\n')[0]}); skipping nothing`);
    return null;
  }
}

function changedFiles(base, head) {
  if (!base || !head || /^0+$/.test(base)) return null;
  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    try {
      return execFileSync('git', ['diff', '--name-only', base, head], { cwd: ROOT, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } catch {
      return null;
    }
  }
}

function main() {
  const list = dialects();

  if (process.argv[2] === '--fingerprints') {
    for (const d of list) console.log(`${d.padEnd(12)} ${grammarFingerprint(d, list)}`);
    console.log(`${'bindings'.padEnd(12)} ${bindingsFingerprint()}`);
    return;
  }

  let langs;
  let bindings;
  let why;

  const [a, b] = process.argv.slice(2);
  const files = a === '--all' ? null : changedFiles(a, b);
  if (files === null) {
    langs = list;
    bindings = true;
    why = a === '--all' ? 'forced' : 'could not compute the diff';
  } else {
    ({ langs, bindings } = decide(files, list));
    why = `${files.length} changed file(s)`;
  }

  // Drop what already passed with byte-identical inputs.
  const fps = Object.fromEntries(langs.map((d) => [d, grammarFingerprint(d, list)]));
  const bindingsFp = bindingsFingerprint();
  const markers = recordedMarkers();
  const built = markers ? langs.filter((d) => markers.has(grammarCacheKey(d, fps[d]))) : [];
  if (built.length) langs = langs.filter((d) => !built.includes(d));
  const bindingsBuilt = Boolean(markers && bindings && markers.has(bindingsCacheKey(bindingsFp)));
  if (bindingsBuilt) bindings = false;

  console.log(`[changed-grammars] ${why}: ${langs.length ? langs.join(' ') : '(no grammar jobs)'}; bindings ${bindings ? 'run' : 'skipped'}`);
  if (built.length) console.log(`[changed-grammars] already built with identical inputs, skipped: ${built.join(' ')}`);
  if (bindingsBuilt) console.log('[changed-grammars] bindings already built with identical inputs, skipped');

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    appendFileSync(out, `matrix=${JSON.stringify({ include: langs.map((d) => ({ lang: d, key: grammarCacheKey(d, fps[d]) })) })}\n`);
    appendFileSync(out, `run_grammars=${langs.length > 0}\n`);
    appendFileSync(out, `run_bindings=${bindings}\n`);
    appendFileSync(out, `bindings_key=${bindingsCacheKey(bindingsFp)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
