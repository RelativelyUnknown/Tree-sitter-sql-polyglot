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
 * Writes `matrix`, `run_grammars` and `run_bindings` to $GITHUB_OUTPUT when set, and always prints
 * the decision.
 */

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

  console.log(`[changed-grammars] ${why}: ${langs.length ? langs.join(' ') : '(no grammar jobs)'}; bindings ${bindings ? 'run' : 'skipped'}`);

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    appendFileSync(out, `matrix=${JSON.stringify({ lang: langs })}\n`);
    appendFileSync(out, `run_grammars=${langs.length > 0}\n`);
    appendFileSync(out, `run_bindings=${bindings}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
