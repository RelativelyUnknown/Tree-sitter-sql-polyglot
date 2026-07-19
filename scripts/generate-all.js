#!/usr/bin/env node
/**
 * Parallel wrapper around generate.js.
 *
 * Usage:
 *   node scripts/generate-all.js                # base + all 22 dialects
 *   node scripts/generate-all.js hive spark ...  # only the named dialects
 *
 * Each dialect's grammar.js imports its parent's grammar.js SOURCE module
 * directly (e.g. spark/grammar.js does `import hive from '../hive/grammar.js'`)
 * and composes the merged grammar in-process before calling `tree-sitter
 * generate` — it never reads the parent's compiled src/parser.c. So there is
 * no ordering dependency between dialects at generation time, and running
 * `node scripts/generate.js <dialect>` for every dialect concurrently is
 * safe: each is an independent process reading only source files and
 * writing only to its own <dialect>/src/.
 */

import { spawn } from 'child_process';
import { cpus } from 'os';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DEFAULT_ALL = [
  'base', 'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery',
  'mariadb', 'sqlite', 'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino',
  'athena', 'redshift', 'clickhouse', 'flink', 'cockroachdb', 'spanner',
  'teradata', 'hana',
];

const names = process.argv.slice(2);
const targets = names.length ? names : DEFAULT_ALL;

const concurrency = Math.max(1, Number(process.env.GENERATE_CONCURRENCY) || cpus().length);

function generateOne(name) {
  const args = name === 'base' ? [] : [name];
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/generate.js', ...args], { cwd: ROOT });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('close', (code) => {
      process.stdout.write(`::group::generate (${name})\n${output}::endgroup::\n`);
      resolve(code === 0);
    });
  });
}

async function runPool(items, limit) {
  let index = 0;
  let ok = true;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      if (!(await generateOne(item))) ok = false;
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return ok;
}

const start = Date.now();
const success = await runPool(targets, concurrency);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`generate-all: ${targets.length} grammar(s) in ${elapsed}s (concurrency=${concurrency})`);

if (!success) {
  console.error('generate-all: one or more grammars failed to generate');
  process.exit(1);
}
