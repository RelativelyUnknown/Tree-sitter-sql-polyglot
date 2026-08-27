# Contributing to tree-sitter-sql-extended

## Getting Started

Clone the repository and install dependencies.

```
git clone https://github.com/relativelyunknown/tree-sitter-sql-extended.git
cd tree-sitter-sql-extended
npm install
```

`npm install` decompresses the committed, Brotli-compressed `<dialect>/src/parser.c.br` /
`node-types.json.br` blobs (see `scripts/inflate-parsers.js`) and compiles the Node.js bindings: one
native addon per dialect, loaded lazily (see "Using in Node.js" in the [README](README.md#using-in-nodejs)).
It does **not** run `tree-sitter generate`; that only happens when you actually edit a grammar (see
below).

## Development Workflow

### 1. Edit grammar files

The ANSI SQL base lives in `grammar/` with the entry point `grammar.js` at the repo root. Each dialect
has its own `<dialect>/grammar.js` (using tree-sitter's `grammar(parent, overrides)` pattern) and
dialect-specific rule files under `<dialect>/grammar/`. See [AGENTS.md](AGENTS.md) for the full
architecture and the parent/child dependency chains.

### 2. Regenerate the parser

```bash
npm run generate            # base grammar
npm run generate:spark      # a single dialect
npm run generate:all        # base + all 22 dialects
```

Generation uses a content hash to skip `tree-sitter generate` when the relevant grammar files haven't
changed, saving ~60s on repeated runs. To force regeneration regardless:

```bash
npm run generate:force
```

A change to the base grammar ripples to all 22 parsers, so regenerate and test all of them. Changing a
dialect requires regenerating its child too (`databricks` after `spark`/`hive`; `mariadb` after `mysql`).

### 3. Run the tests

```bash
npm run test:corpus            # base corpus tests (test/corpus/*.txt)
npm run test:corpus:spark      # a single dialect's corpus (<dialect>/test/corpus/*.txt)
npm run test:keywords          # keywords in sync with queries/highlights.scm
npm run test:node              # Node.js binding test
npm test                       # the full sequence
```

### 4. Debug a parse

```bash
echo "SELECT * FROM t WHERE id = 1" | npm run parse --
npm run parse -- path/to/file.sql
```

### 5. Format test corpus

```bash
make format
```

### Corpus test format

Each file in `test/corpus/` is a suite of named test cases:

```
================================================================================
Select with WHERE
================================================================================

SELECT id, name FROM users WHERE active = true

--------------------------------------------------------------------------------

(program
  (statement
    (select
      (keyword_select)
      ...)))
```

Add new test cases to the relevant file, or create a new file for a new feature area.
Run `make format` before committing to normalise spacing.

## Adding a New SQL Statement

1. Find the right file in `grammar/statements/` (e.g. `create.js` for a new CREATE variant).
2. Add the rule definition.
3. Wire it into the relevant dispatch list in `grammar/statements/index.js`
   (e.g. `_ddl_statement`, `_drop_statement`).
4. If the statement uses new keywords, define them with `make_keyword()`. ANSI keywords go in
   `grammar/keywords.js`; dialect-specific keywords go in that dialect's own `grammar.js` rules
   block. Each parser runs its own keyword extraction, so there is no shared keyword pool.
5. If the keyword is reachable from the base grammar, add it to `queries/highlights.scm` as a
   `@keyword` capture. Keywords only reachable through a dialect override go in that dialect's
   `<dialect>/queries/highlights.scm` instead; adding them to the base file fails the sync check.
6. Run `npm run generate && npm run test:keywords`. The sync check fails if step 5 is wrong.
7. Add corpus tests in `test/corpus/` (or `<dialect>/test/corpus/` for a dialect feature).

### A note on overrides and conflicts

A dialect override replaces the base rule entirely. When overriding a `choice` or dispatch rule
(`_ddl_statement`, `from`, `statement`, `_column_constraint`), re-enumerate every base alternative
alongside your additions, or the dialect silently loses features. Each dialect also declares its own
`conflicts` array, and base conflicts do not propagate, so a new GLR conflict in the base has to be
added to every dialect's `conflicts` array too.

## Adding a New SQL Dialect

[AGENTS.md](AGENTS.md) has the full dialect architecture. In short:

1. Create `<dialect>/grammar.js` using tree-sitter's `grammar(parent, overrides)` pattern.
2. The parent is `grammar.js` (ANSI SQL base) or another dialect (e.g. Databricks extends Spark).
3. Add dialect-specific rule files in `<dialect>/grammar/`.
4. Register the new grammar in `tree-sitter.json` under the `grammars` array.
5. Add corpus tests in `<dialect>/test/corpus/`.
6. Add a CI step to generate and test the new grammar.
7. `node scripts/generate-all.js <dialect>` to generate its parser, then
   `node scripts/generate-bindings.js` to regenerate the Rust/Node/Python/Go/Swift glue files (adds the
   new dialect's named export/feature/function/subpackage/target everywhere) and
   `node scripts/compress-parsers.js <dialect>` to produce its committed
   `parser.c.br`/`node-types.json.br`. Commit those `.br` blobs, not the raw
   `parser.c`/`node-types.json` (gitignored on purpose; see `scripts/inflate-parsers.js`).
8. Add the new dialect's name to `Cargo.toml`'s `[features]` list (one boolean feature per dialect,
   plus the `full` array) and to its `include` list, and to `setup.py`'s/`package.json`'s dialect-dir
   lists, so it's compiled/packaged like the other 22. These aren't auto-generated; they mirror how
   `DIALECT_DIRS` is hand-maintained in each of those files.

## Commit Messages

Follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>([optional scope]): <description>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`

Breaking AST changes must use `!` and a `BREAKING CHANGE` footer:

```
refactor(ast)!: rename foo_node to bar_node

BREAKING CHANGE: The `(foo_node)` node has been renamed to `(bar_node)`
```

## Releasing a New Version

```bash
bash scripts/bump-version.sh <version>   # bumps package.json, tree-sitter.json, Cargo.toml, pyproject.toml, CMakeLists.txt
npm run release                           # generates a docs/changelog.md entry and commits
git push
```

Once the PR is merged, tag the release from main:

```bash
git pull origin main
git tag v<version>
git push --tags
```

Pushing the tag triggers CI to build artifacts and publish to npm, crates.io, and PyPI.

## Docs site (local preview)

The docs site (`docs/`) is a [VitePress](https://vitepress.dev/) site, deployed to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`. Only `docs/index.md`, `docs/changelog.md`, and
`docs/.vitepress/*` are hand-written; `docs/coverage.md` and `docs/downloads.md` are generated
(gitignored, never commit them).

```bash
npm install
npm run generate:all                     # optional but required for a real (non-stub) coverage page
pip install -r tools/requirements.txt && bash tools/antlr/setup.sh  # coverage corroborators
python tools/coverage.py                 # optional, writes docs/coverage.md
npm run docs:dev
```

Open the URL `vitepress dev` prints (typically [localhost:5173](http://localhost:5173)).
`npm run docs:build` produces the static site in `docs/.vitepress/dist/`;
`npm run docs:preview` serves that build locally.
