# tree-sitter-sql-extended: Architecture Guide

## What this repo is

A tree-sitter SQL parser forked from DerekStride/tree-sitter-sql. Upstream ships a "permissive"
SQL grammar that mixes PostgreSQL, Hive/Spark, MySQL and MariaDB syntax into one compiled parser.
This fork splits that into a strict ANSI SQL base and 22 dialect grammars, each compiled on its own.

---

## Grammar hierarchy

```
grammar.js                     ANSI SQL base, no dialect-specific rules
  hive/grammar.js              LATERAL VIEW, STORED BY/AS, multi-table INSERT
    spark/grammar.js           QUALIFY, PIVOT, scripting, Iceberg, VARIANT
      databricks/grammar.js    Delta OPTIMIZE, Unity Catalog, COPY INTO
  postgres/grammar.js          COPY, VACUUM, PARTITION BY, extensions, policies
    cockroachdb/grammar.js     AS OF SYSTEM TIME, UPSERT, BACKUP/RESTORE, multi-region DDL
  mysql/grammar.js             ENGINE=, CHARSET=, index hints, SHOW/DESCRIBE
    mariadb/grammar.js         temporal tables, system versioning, RETURNING, INVISIBLE columns
  bigquery/grammar.js          INT64/STRUCT/ARRAY types, UNNEST, QUALIFY
    spanner/grammar.js         INTERLEAVE IN PARENT, change streams, row deletion policies
  trino/grammar.js             PREPARE/EXECUTE, MATCH_RECOGNIZE, ARRAY/MAP/ROW, lambdas
    athena/grammar.js          UNLOAD TO s3, MSCK REPAIR TABLE, managed Iceberg
  oracle/grammar.js            CONNECT BY, PL/SQL blocks, packages, cursors, MODEL
  db2/grammar.js               SQL PL, modules, audit, federated objects, temporal queries
  tsql/grammar.js              T-SQL scripting, APPLY, hints, temp tables
  snowflake/grammar.js         scripting, FLATTEN, time travel, stages
  sqlite/grammar.js            AUTOINCREMENT, INDEXED BY, INSERT OR REPLACE
  duckdb/grammar.js            FROM-first SELECT, EXCLUDE/REPLACE, lambdas, ASOF JOIN
  redshift/grammar.js          DISTKEY/SORTKEY/DISTSTYLE, EXTERNAL SCHEMA, COPY/UNLOAD
  clickhouse/grammar.js        ENGINE=, PREWHERE, FINAL, ARRAY JOIN, LIMIT BY, SAMPLE, SYSTEM
  flink/grammar.js             connector DDL, WATERMARK FOR, window TVFs, temporal joins
  teradata/grammar.js          SEL/DEL, PRIMARY INDEX, RANGE_N/CASE_N, COLLECT STATISTICS
  hana/grammar.js              COLUMN/ROW tables, UPSERT WITH PRIMARY KEY, SQLScript
```

Each dialect compiles to its own `<dialect>/src/parser.c`. Changing Databricks rules only requires
regenerating `databricks/src/parser.c`; the base and sibling parsers are unaffected. Indentation
above is the parent chain: regenerate a child dialect whenever its parent grammar changes.

---

## Directory layout

```
grammar.js                      # Entry point, spreads all rule groups
grammar/
  keywords.js                   # Case-insensitive ANSI keyword tokens
  types.js                      # SQL type system (INT, VARCHAR, ARRAY, custom, etc.)
  expressions.js                # Binary/unary expressions, CASE, window functions
  helpers.js                    # make_keyword(), comma_list(), paren_list(), optional_parenthesis()
  transactions.js               # BEGIN/COMMIT/ROLLBACK
  column-lists.js               # Column definitions and constraints
  statements/
    index.js                    # Composes all statement rules; dispatch lists (_ddl_statement etc.)
    create.js                   # CREATE TABLE/VIEW/INDEX/TYPE/ROLE/SEQUENCE/TRIGGER/FUNCTION/PROCEDURE
    alter.js                    # ALTER TABLE/VIEW/TYPE/SEQUENCE/ROLE/INDEX/DATABASE/SCHEMA
    drop.js                     # DROP TABLE/VIEW/INDEX/TYPE/SCHEMA/SEQUENCE/FUNCTION/PROCEDURE/ROLE
    select.js                   # SELECT, CTEs, window functions, joins, set operations
    insert.js                   # INSERT INTO ... VALUES / SELECT
    update.js                   # UPDATE ... SET ... WHERE
    delete.js                   # DELETE FROM
    merge.js                    # MERGE INTO ... USING ... WHEN MATCHED
    optimize.js                 # OPTIMIZE TABLE ... REWRITE DATA (Iceberg/Athena)
    show.js                     # SHOW TABLES [FROM ...] [LIKE ...]
    set.js                      # SET variable = value
    refresh.js                  # REFRESH MATERIALIZED VIEW
    truncate.js                 # TRUNCATE TABLE
    rename.js                   # RENAME TABLE/COLUMN
    grant.js                    # GRANT/REVOKE (ANSI DCL)
    comment.js                  # COMMENT ON ...
    create-function.js          # CREATE FUNCTION (with dollar-quoted body support)
    create-procedure.js         # CREATE PROCEDURE
src/
  parser.c                      # Generated C parser (do not edit manually)
  scanner.c                     # External scanner for dollar-quoted strings
queries/
  highlights.scm                # Syntax highlighting (tree-sitter query language)
  indents.scm                   # Indentation rules
test/corpus/                    # Base SQL corpus tests

<dialect>/                      # One directory per dialect, 22 of them
  grammar.js                    # grammar(parent, overrides): the dialect entry point
  grammar/                      # Dialect rule files, split by statement area
  src/parser.c                  # Generated independently from the base
  src/scanner.c                 # #define shim over ../../src/scanner.c
  queries/highlights.scm        # Dialect keyword highlights
  test/corpus/                  # Dialect corpus tests
  tree-sitter.json              # Grammar registration and metadata

tools/
  coverage.py                   # Corroborated coverage: our parse vs. reference parsers
  coverage-probes.yml           # Per-dialect statement inventory and probes
  coverage.json                 # Recorded baseline, used by coverage.py --check
  glr_scan.py                   # Parse-table size, state count, generate time and RSS
  parse_bench.py                # Parse throughput on real and GLR-stressing workloads
scripts/
  generate.js                   # Hash-cached wrapper around tree-sitter generate
  generate-all.js               # Generates every parser, concurrency capped by memory
  test-keywords.sh              # Checks keyword and highlights.scm sync
  bump-version.sh               # Bumps the version in all 5 manifest files
  docs-prep.js                  # Prepares generated pages for the VitePress site
bindings/                       # Node/Python/Rust/Go/Swift language bindings
docs/                           # VitePress site (index, changelog; coverage is generated)
.github/workflows/
  ci.yml                        # Build, corpus tests and coverage on macOS/Ubuntu/Windows
  pages.yml                     # Builds and deploys the docs site
  publish.yml, tag.yml          # Release automation
```

---

## How grammar composition works

`grammar.js` uses spread operators to compose rule groups:

```javascript
rules: {
  program: $ => ...,
  ...keyword_rules,
  ...type_rules,
  ...expression_rules,
  ...statement_rules,   // all of grammar/statements/
}
```

`grammar/statements/index.js` follows the same pattern. It spreads the ANSI core statement
modules, then overrides the dispatch lists at the end:

```javascript
// Spreads come first (define all rule names)
...create_rules,
...optimize_rules,
// ...

// Overrides come last (dispatch lists must enumerate every valid choice explicitly)
_ddl_statement: $ => choice(
  $._create_statement,
  $._alter_statement,
  // ...
),
```

Dialect grammars extend the base with tree-sitter's `grammar(base, overrides)` pattern. A rule in
`overrides` replaces the base rule entirely for that dialect. Nothing is merged automatically, so a
dispatch list has to re-enumerate all base alternatives alongside the new ones.

---

## How to add a new ANSI SQL statement

1. Find the file in `grammar/statements/` that matches the statement type.

2. Define the rule in that file:
   ```javascript
   create_streaming_table: $ => seq(
     $.keyword_create, $.keyword_streaming, $.keyword_table,
     $.object_reference,
   ),
   ```

3. Wire it into the dispatch list in `grammar/statements/index.js`:
   ```javascript
   _create_statement: $ => seq(choice(
     $.create_table,
     // ...
     $.create_streaming_table,  // added here
   )),
   ```

4. Add any new keywords:
   - ANSI SQL or base-grammar keywords -> add to `grammar/keywords.js`
   - Dialect-specific keywords -> add directly to the dialect's `grammar.js` rules block
   - Never add dialect-specific keywords to the base `grammar/keywords.js`
   ```javascript
   // In grammar/keywords.js (ANSI/base only):
   keyword_streaming: _ => make_keyword("streaming"),

   // In spark/grammar.js (dialect-specific):
   keyword_delta: _ => make_keyword("delta"),
   ```

5. Add the keyword to the right `highlights.scm`:
   - ANSI keywords -> `queries/highlights.scm`
   - Dialect keywords -> `<dialect>/queries/highlights.scm`
   ```scheme
   (keyword_streaming) @keyword
   ```

6. Run `npm run generate && npm run test:corpus`. The keyword sync check in `test:keywords` fails
   if step 5 is missing.

7. Add a corpus test case to the relevant file in `test/corpus/`.

---

## How to add a new dialect

Use `spark/grammar.js` as the canonical example of `grammar(base, overrides)`.

1. Create the dialect directory:
   ```
   <dialect>/
     grammar.js              # The dialect grammar file
     grammar/                # Dialect-specific rule files
     src/scanner.c           # Delegate to base scanner (see below)
     queries/highlights.scm  # Dialect-specific highlight additions (can be empty)
     test/corpus/            # Dialect-specific corpus tests
     tree-sitter.json        # Registers the dialect grammar and its metadata
   ```

2. Write `<dialect>/grammar.js`:
   ```javascript
   import base from '../grammar.js'; // or '../spark/grammar.js' for Spark extensions
   import my_create_rules from './grammar/create.js';

   export default grammar(base, {
     name: 'my_dialect_sql',

     rules: {
       // Overridden dispatch lists re-enumerate every base alternative plus the new ones
       _create_statement: $ => seq(choice(
         $.create_table,
         $.create_view,
         // ... (copy from base)
         $.my_new_statement,  // the dialect addition
       )),

       // Define new rules
       my_new_statement: $ => seq(
         $.keyword_my, $.keyword_statement, $.object_reference,
       ),

       ...my_create_rules,
     },
   });
   ```

3. Create `<dialect>/src/scanner.c`, which delegates to the base external scanner:
   ```c
   #define tree_sitter_sql_external_scanner_create      tree_sitter_my_dialect_sql_external_scanner_create
   #define tree_sitter_sql_external_scanner_destroy     tree_sitter_my_dialect_sql_external_scanner_destroy
   #define tree_sitter_sql_external_scanner_scan        tree_sitter_my_dialect_sql_external_scanner_scan
   #define tree_sitter_sql_external_scanner_serialize   tree_sitter_my_dialect_sql_external_scanner_serialize
   #define tree_sitter_sql_external_scanner_deserialize tree_sitter_my_dialect_sql_external_scanner_deserialize
   #include "../../src/scanner.c"
   ```

4. Create `<dialect>/tree-sitter.json` with the grammar registration and metadata block.
   `spark/tree-sitter.json` has the structure to copy.

5. Add the npm scripts to `package.json`:
   ```json
   "generate:my_dialect": "node scripts/generate.js my_dialect",
   "test:corpus:my_dialect": "cd my_dialect && npx --yes --package=tree-sitter-cli@v0.26.3 -- tree-sitter test"
   ```

6. Generate the parser:
   ```bash
   npm run generate:my_dialect
   ```

7. Add the CI steps to `.github/workflows/ci.yml`:
   ```yaml
   - run: cd my_dialect && tree-sitter generate grammar.js
   ```
   and a `parser-test-action` step for `grammar-path: my_dialect`.

8. Wire the dialect into the compiled Rust/Node/Python/Go/Swift packages (this is separate from step
   4's per-dialect `<dialect>/tree-sitter.json`, which only registers it for standalone tree-sitter CLI
   use):
   - Add its entry to the root `tree-sitter.json`'s `grammars` array (copy the per-dialect one).
   - Add `my_dialect` to the `DIALECT_DIRS` list at the top of `scripts/generate-bindings.js`, then run
     `node scripts/generate-bindings.js`. This regenerates `bindings/rust/{lib,build}.rs`,
     `binding.gyp` + `bindings/node/{binding.cc,binding_my_dialect.cc,index.js,index.d.ts}`,
     `bindings/python/tree_sitter_sql/{binding.c,binding_my_dialect.c,__init__.py,__init__.pyi}`,
     `bindings/go/my_dialect/{binding.go,binding_test.go}`, and `Package.swift` +
     `bindings/swift/TreeSitterSqlMyDialect{,Tests}/*`. The new dialect gets its own Cargo
     `#[cfg(feature = "my_dialect")]`-gated consts, its own native addon (Node), extension module
     (Python), importable subpackage (Go), and SPM target/product (Swift), each loaded lazily; see
     "Using in Rust/Node.js/Python/Go/Swift" in the [README](README.md#using-in-rust) and the
     [Usage page](https://relativelyunknown.github.io/tree-sitter-sql-extended/usage) for what that
     means for consumers.
   - Add `my_dialect` to `Cargo.toml`'s `[features]` list (a bare `my_dialect = []` plus the `full`
     array) and its `include` glob lines, and to `package.json`'s `files` list. These three are
     hand-maintained, not generated, for the same reason `DIALECT_DIRS`/`DEFAULT_ALL` is hand-maintained
     in `scripts/generate-bindings.js`, `scripts/generate-all.js`, `scripts/compress-parsers.js`,
     `scripts/inflate-parsers.js`, and `setup.py`: it's the single list a dialect's addition/removal
     must touch by hand in each. `setup.py`'s per-dialect
     `Extension` list does *not* need hand-editing; it's built programmatically from `DIALECT_DIRS`.
   - Run `node scripts/compress-parsers.js my_dialect` and commit the resulting
     `my_dialect/src/parser.c.br` / `node-types.json.br`. The raw `parser.c`/`node-types.json` stay
     gitignored; see `scripts/inflate-parsers.js`, which reconstructs them at build time instead of
     committing the full generated text.

---

## Dev workflow

```bash
# Generate all parsers (hash-cached, skips unchanged grammars)
npm run generate:all

# Generate individual parsers
npm run generate              # base SQL
npm run generate:spark        # Spark/Hive dialect
npm run generate:databricks   # Databricks dialect (depends on spark)
npm run generate:postgres     # PostgreSQL dialect
npm run generate:mysql        # MySQL/MariaDB dialect

# Force regeneration (bypasses cache)
npm run generate:force

# Run tests
npm run test:corpus           # base SQL corpus
npm run test:corpus:spark     # Spark corpus
npm run test:corpus:databricks  # Databricks corpus
npm run test:corpus:postgres  # PostgreSQL corpus
npm run test:corpus:mysql     # MySQL corpus
npm run test:keywords         # Keyword and highlights.scm sync check

# Debug a parse tree
npm run parse -- path/to/file.sql
```

---

## Corpus test format

```
================================================================================
Test case name
================================================================================

SQL INPUT HERE

--------------------------------------------------------------------------------

(program
  (statement
    (select
      (keyword_select)
      (select_expression ...))))
```

- Section separator: `=` repeated 80 times (name above, SQL below)
- Output separator: `-` repeated 80 times
- Run `npm run generate && npm run test:corpus` to validate

---

## Hash-based grammar caching

`scripts/generate.js` hashes all files in `grammar/` plus the grammar entry point. If the hash
matches `.grammar-cache/<name>.hash`, it skips `tree-sitter generate`. Use
`npm run generate:force` to bypass the cache. The `.grammar-cache/` directory is gitignored.

---

## ANSI purity of the base grammar

The base grammar accepts ISO SQL and rejects vendor syntax. `tools/coverage.py --check` enforces
this: if the base parser accepts a probe flagged as a vendor extension, the check fails. A dialect
that needs the syntax re-adds it in its own override, either directly or through the shared
builders `fromClause($, { limit, offsetFetch })` in `grammar/statements/select.js` and
`createStatementChoices($, { materializedView, index })` in `grammar/statements/create.js`.

The reverse also applies. A dialect inherits everything its parent defines and does not override,
which is how dialects end up accepting syntax their engine has never had. When adding a dialect
rule, check what the override drops and what it silently keeps.

---

## Coverage checking

`tools/coverage.py` parses every probe in `tools/coverage-probes.yml` with our grammar and with
independent reference parsers (SQLGlot, ANTLR grammars-v4, pglast, sqlfluff). A feature counts as
covered only when an outside parser agrees, which keeps the report from certifying our own grammar
against our own tests.

```bash
pip install -r tools/requirements.txt && bash tools/antlr/setup.sh
python tools/coverage.py                 # score and write docs/coverage.md
python tools/coverage.py --check         # gate on regressions against tools/coverage.json
```

Two categories matter when reading the output. Suspect probes are ones our grammar accepts and no
reference parser does, which usually means the grammar is too loose or the probe is not real SQL.
Confirmed gaps are ones our grammar rejects and at least one reference parser accepts.

The registry carries a per-dialect statement inventory. Mark a statement `not-applicable` with a
reason when the engine demonstrably has no such statement, checked against that vendor's syntax
reference rather than inferred from a corroborator (SQLGlot's dialect parsers share one base
parser, so it accepts plenty of statements an engine does not have).

`tools/glr_scan.py` reports what a grammar costs to build (parse-table bytes, state count,
generation time, peak memory) and `tools/parse_bench.py` reports what it costs to run. Use the
numbers rather than an argument when justifying a grammar change on performance grounds.

---

## Keyword sync requirement

Every keyword reachable in a parse tree (present in `src/node-types.json`) must appear as a
`@keyword` capture in `queries/highlights.scm`. The check runs automatically via
`npm run test:keywords`. If it fails:

1. Add the missing keyword: `(keyword_foo) @keyword` in `queries/highlights.scm`
2. Or if the keyword is intentionally not highlighted, re-examine whether it needs to exist

The check covers the base grammar only. Dialect-specific keywords live in the dialect's own
`queries/highlights.scm` and are not checked by `test-keywords.sh`.

---

## Where keywords live

Non-ANSI, dialect-specific keywords belong in each dialect's own `grammar.js`, not in the base
`grammar/keywords.js`. The base file holds ANSI SQL keywords and keywords referenced by base
grammar rules, and nothing else.

- `grammar/keywords.js`: ANSI SQL keywords and keywords used by base grammar rules only
- Dialect grammars (`spark/grammar.js`, `postgres/grammar.js`, etc.): define their own
  dialect-specific keywords directly in the `rules: { ... }` block
- Inheritance flows base -> dialect only. Duplication across sibling dialects is acceptable
  and preferred over a shared keyword pool.
- Use `token(prec(1, make_keyword(...)))` for any keyword that can also parse as an identifier
  in the same parse state (most dialect-specific keywords need this)

### How keyword extraction works

tree-sitter runs keyword extraction during parser generation, building a `ts_lex_keywords`
function into the generated C parser. Each generated parser gets its own: the base and every
dialect produce independent parsers with independent `ts_lex_keywords` functions. Dialect keywords
defined in a dialect's own `grammar.js` are therefore fully extracted for that dialect's parser,
and no shared keyword pool is needed.

### Adding a new dialect-specific keyword

1. Add the definition in the dialect's `grammar.js` rules block:
   ```javascript
   keyword_myfoo: _ => token(prec(1, make_keyword("myfoo"))),
   ```
2. Use it in the dialect's grammar rules
3. Add it to the dialect's `queries/highlights.scm` if it should be highlighted
4. Leave `grammar/keywords.js` alone, since that file is for ANSI and base keywords only

### The keyword_like / keyword_ilike split

`keyword_ilike` (PostgreSQL-only `ILIKE` operator) is defined in `postgres/grammar.js`. The
base grammar keeps only `keyword_like` in its `binary_expression` rule. Postgres overrides
`binary_expression` to add `$.keyword_ilike` as a valid operator.

### Prefix-shadowing: `token(prec(N,...))` defeats longest-match

tree-sitter's lexer normally prefers the longest matching token (maximal munch).
`token(prec(N,...))` overrides that: a shorter token with a higher precedence beats a longer token
with a lower one, even when both match the same input.

The `keyword_match` / `keyword_matched` bug is the example to remember.
`keyword_match: _ => token(prec(1, make_keyword("match")))` was added to `postgres/grammar.js`,
while `keyword_matched` was inherited from the base at `prec(0)`. Given the input `MATCHED`, the
lexer picked `keyword_match` (prec 1, 5 chars) over `keyword_matched` (prec 0, 7 chars), left `ED`
as a stray identifier, and broke `MERGE ... WHEN MATCHED THEN`.

So whenever you add a keyword `foo` with `token(prec(1,...))`, check the inheritance chain for a
keyword `foobar` sharing the prefix. If one exists, override `foobar` with `token(prec(1,...))` in
the same dialect so that longest-match resolves at equal precedence.

### Cross-dialect keyword audit: grep is not enough

When removing a keyword from base, a `grep`-based scan of which dialect files reference it can
miss usages for two reasons:

1. Indirect rule files. A keyword may be referenced in `<dialect>/grammar/foo.js` while the audit
   only scanned `<dialect>/grammar.js`. Grep every file under `<dialect>/`, not just the top-level
   grammar.

2. Orphan definitions. A keyword may be defined only in dialect A (say `postgres`) but used in
   dialect B (say `databricks`) that does not inherit from A. Grep finds the usage, but the
   definition only resolves at generation time. The reliable audit is to generate every dialect
   and let the `ReferenceError: Undefined symbol` errors surface the gaps.

After moving keywords from the base to dialects, generate every dialect rather than only the ones
grep implicated, and clear the `Undefined symbol` errors before running corpus tests.

### Hash-cached generation can silently skip changed grammars

`scripts/generate.js` skips regeneration when its file hash matches the cached value. If you
edit a grammar file but the hash doesn't change (e.g. whitespace-only changes, or the cache is
stale from a previous run), the parser is not regenerated and tests continue to pass against the
old binary, hiding the regression.

When in doubt, force-regenerate: `cd <dialect> && tree-sitter generate grammar.js` directly,
bypassing the npm script cache entirely.
