#!/usr/bin/env node
/**
 * Build-time counterpart to scripts/compress-parsers.js: decompresses each
 * committed src/parser.c.br / src/node-types.json.br back into real files
 * before node-gyp compiles them, using Node's built-in zlib (no extra
 * dependency).
 *
 * This runs on every `npm install`/`npm run build` instead of a full
 * `tree-sitter generate` pass, so installing this package never needs to
 * regenerate any of the 22 dialects' LR tables (clickhouse alone takes
 * ~80 minutes) - it just inflates already-generated, already-verified
 * sources. Skips a file that's already newer than its .br (nothing to do).
 */

import { brotliDecompressSync } from 'zlib';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DIALECT_DIRS = [
  'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery',
  'mariadb', 'sqlite', 'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino',
  'athena', 'redshift', 'clickhouse', 'flink', 'cockroachdb', 'spanner',
  'teradata', 'hana',
];

const FILES = ['parser.c', 'node-types.json'];

let failed = false;

for (const name of ['base', ...DIALECT_DIRS]) {
  const dir = name === 'base' ? ROOT : join(ROOT, name);

  for (const file of FILES) {
    const outPath = join(dir, 'src', file);
    const blobPath = `${outPath}.br`;

    if (!existsSync(blobPath)) {
      console.error(`${name}/${file}: missing ${blobPath.replace(ROOT, '')}`);
      failed = true;
      continue;
    }

    if (existsSync(outPath) && statSync(outPath).mtimeMs >= statSync(blobPath).mtimeMs) {
      continue; // already inflated and up to date
    }

    mkdirSync(dirname(outPath), { recursive: true });
    const inflated = brotliDecompressSync(readFileSync(blobPath));
    writeFileSync(outPath, inflated);
  }
}

if (failed) {
  console.error('inflate-parsers: one or more .br blobs are missing');
  process.exit(1);
}
