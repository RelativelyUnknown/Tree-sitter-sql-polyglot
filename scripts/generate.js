#!/usr/bin/env node
/**
 * Hash-cached grammar generation.
 *
 * For the base grammar:   node scripts/generate.js
 * For a dialect grammar:  node scripts/generate.js databricks
 *
 * Each grammar generates into its own src/ directory by running
 * tree-sitter generate from within the grammar's directory.
 * This is required because tree-sitter writes output to ./src/ relative to CWD.
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const CLI = 'npx --yes --package=tree-sitter-cli@v0.26.3 -- tree-sitter';
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function hashDir(dir) {
  const hash = createHash('sha256');
  function walk(p) {
    if (!existsSync(p)) return;
    for (const f of readdirSync(p).sort()) {
      const full = join(p, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (f.endsWith('.js') || f.endsWith('.c')) hash.update(readFileSync(full));
    }
  }
  walk(dir);
  return hash.digest('hex');
}

// Determine which grammar to generate.
// Argument can be a dialect name ("databricks") or omitted (base grammar).
const dialect = process.argv[2] || null;
const grammarDir = dialect ? join(ROOT, dialect) : ROOT;
const grammarFile = 'grammar.js';
const grammarPath = join(grammarDir, grammarFile);

if (!existsSync(grammarPath)) {
  console.error(`Grammar file not found: ${grammarPath}`);
  process.exit(1);
}

// Compute a hash covering the grammar entry point, the shared grammar/ rules,
// and (for dialects) the dialect's own grammar/ rules plus the full ancestor
// chain (entry file AND grammar/ rule dir of every parent grammar).
const sharedHash = hashDir(join(ROOT, 'grammar'));
const dialectHash = dialect ? hashDir(join(grammarDir, 'grammar')) : '';
const entryHash = readFileSync(grammarPath, 'utf8');

// Ancestor chains: a child grammar must regenerate when ANY file in a parent
// grammar changes — both the parent's grammar.js entry point and its
// grammar/*.js rule modules (a hive/grammar/ change flows into spark and
// databricks via grammar(base, …) composition at generation time).
const PARENTS = {
  spark: ['hive'],
  databricks: ['spark', 'hive'],
  mariadb: ['mysql'],
  athena: ['trino'],
  cockroachdb: ['postgres'],
  spanner: ['bigquery'],
};

const parentHashes = [];
for (const parent of PARENTS[dialect] || []) {
  parentHashes.push(readFileSync(join(ROOT, parent, 'grammar.js'), 'utf8'));
  parentHashes.push(hashDir(join(ROOT, parent, 'grammar')));
}

const currentHash = [sharedHash, dialectHash, entryHash, ...parentHashes].join('|');

mkdirSync(join(ROOT, '.grammar-cache'), { recursive: true });
const cacheKey = dialect || 'base';
const hashFile = join(ROOT, `.grammar-cache/${cacheKey}.hash`);

// The hash marker alone isn't proof generation actually happened: CI restores
// .grammar-cache/ and src/**/*.json/parser.c from the SAME actions/cache key,
// but if that cache entry was ever saved incomplete (e.g. a prior run whose
// upload step raced a mid-flight generate, or GitHub's immutable-cache-key
// semantics pinned an old/partial save under this exact hash), the marker
// restores fine while the artifact it describes never does — and every
// future run with an identical grammar hash trusts the marker forever.
// Require the primary generated artifact to actually be on disk too.
const parserPath = join(grammarDir, 'src', 'parser.c');
const hashMatches = existsSync(hashFile) && readFileSync(hashFile, 'utf8').trim() === currentHash.trim();

if (hashMatches && existsSync(parserPath)) {
  console.log(`grammar unchanged — skipping generate (${cacheKey})`);
  process.exit(0);
}
if (hashMatches) {
  console.log(`hash marker present but ${parserPath.replace(ROOT, '')} is missing — regenerating (${cacheKey})`);
}

console.log(`generating parser for ${cacheKey}...`);
// Run tree-sitter generate FROM the grammar's directory so output goes to <dialect>/src/
execSync(`${CLI} generate ${grammarFile}`, { cwd: grammarDir, stdio: 'inherit' });
writeFileSync(hashFile, currentHash);
console.log(`done (${cacheKey}).`);
