#!/usr/bin/env node
/**
 * Maintainer tool: Brotli-compresses each grammar's generated src/parser.c
 * and src/node-types.json into src/parser.c.br / src/node-types.json.br,
 * which ARE committed to git (unlike the plain files, which stay
 * generated-only/gitignored).
 *
 * Both are huge as text (parser.c: 300+ MB across all 22 dialects + base;
 * node-types.json: ~23 MB) but almost entirely redundant (LR-table data /
 * repeated node-shape descriptions); Brotli quality 11 gets ~35-40x
 * compression on them (measured), bringing the committed footprint down to a
 * few MB total. This is what keeps the published crate/npm/pypi packages
 * under crates.io's 10 MiB limit without splitting into a separate package -
 * see scripts/inflate-parsers.js for the build-time reverse step.
 * src/grammar.json is NOT compressed/committed: nothing in bindings/
 * reads it, so it stays a local generated-only artifact.
 *
 * Run this after `node scripts/generate-all.js` whenever a dialect's
 * grammar.js/grammar/ actually changes, then commit the updated .br file(s).
 * Usage:
 *   node scripts/compress-parsers.js                # base + all 22 dialects
 *   node scripts/compress-parsers.js hive spark ...  # only the named ones
 */

import { brotliCompressSync, constants as zlibConstants } from 'zlib';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DIALECT_DIRS = [
  'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery',
  'mariadb', 'sqlite', 'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino',
  'athena', 'redshift', 'clickhouse', 'flink', 'cockroachdb', 'spanner',
  'teradata', 'hana',
];

const FILES = ['parser.c', 'node-types.json'];

const names = process.argv.slice(2);
const targets = names.length ? names : ['base', ...DIALECT_DIRS];

let totalIn = 0;
let totalOut = 0;
let failed = false;

for (const name of targets) {
  const dir = name === 'base' ? ROOT : join(ROOT, name);

  for (const file of FILES) {
    const srcPath = join(dir, 'src', file);
    const outPath = `${srcPath}.br`;

    if (!existsSync(srcPath)) {
      console.error(`skip ${name}/${file}: ${srcPath.replace(ROOT, '')} does not exist (generate it first)`);
      failed = true;
      continue;
    }

    const input = readFileSync(srcPath);
    const compressed = brotliCompressSync(input, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        [zlibConstants.BROTLI_PARAM_LGWIN]: 24,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: input.length,
      },
    });
    writeFileSync(outPath, compressed);

    totalIn += input.length;
    totalOut += compressed.length;
    const ratio = (input.length / compressed.length).toFixed(1);
    console.log(`${name}/${file}: ${input.length} -> ${compressed.length} bytes (${ratio}x)`);
  }
}

console.log(`\ntotal: ${totalIn} -> ${totalOut} bytes (${(totalIn / totalOut).toFixed(1)}x)`);

if (failed) process.exit(1);
