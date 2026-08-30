# Contributing to tree-sitter-sql-polyglot

## Getting Started

Clone the repository and install dependencies.

```
git clone https://github.com/relativelyunknown/tree-sitter-sql-polyglot.git
cd tree-sitter-sql-polyglot
npm install
```

`npm install` decompresses the committed, Brotli-compressed `<dialect>/src/parser.c.br` /
`node-types.json.br` blobs (see `scripts/inflate-parsers.js`) and compiles the Node.js bindings: one
native addon per dialect, loaded lazily (see the [Usage
page](https://relativelyunknown.github.io/Tree-sitter-sql-polyglot/usage)). It does **not** run
`tree-sitter generate`; that only happens when you actually edit a grammar (see below).

This project is a fork of [DerekStride/tree-sitter-sql](https://github.com/DerekStride/tree-sitter-sql).
To pull in upstream fixes, add it as a second remote:

```bash
git remote add upstream https://github.com/DerekStride/tree-sitter-sql.git
git fetch upstream
```

## Development Workflow

### 1. Edit grammar files

The ANSI SQL base lives in `grammar/` with the entry point `grammar.js` at the repo root. Each dialect
has its own `<dialect>/grammar.js` (using tree-sitter's `grammar(parent, overrides)` pattern) and
dialect-specific rule files under `<dialect>/grammar/`. See [AGENTS.md](AGENTS.md) for the full
architecture and the parent/child dependency chains.

### 2. Regenerate the parser

`npm run generate[:<dialect>|:all|:force]` — see [AGENTS.md](AGENTS.md#dev-workflow) for the full
command list and the hash-caching behind it. A change to the base grammar ripples to all 22 parsers, so
regenerate and test all of them. Changing a dialect requires regenerating its child too (`databricks`
after `spark`/`hive`; `mariadb` after `mysql`).

### 3. Run the tests

`npm run test:corpus[:<dialect>]` and `npm run test:keywords` — see
[AGENTS.md](AGENTS.md#dev-workflow) for the per-dialect list. Also:

```bash
npm run test:node    # Node.js binding test
npm test             # the full sequence (corpus + keywords + node)
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

Each file in `test/corpus/` is a suite of named test cases; see
[AGENTS.md](AGENTS.md#corpus-test-format) for the format and an example. Add new test cases to the
relevant file, or create a new file for a new feature area. Run `make format` before committing to
normalise spacing.

## Adding a New SQL Statement

See [AGENTS.md](AGENTS.md#how-to-add-a-new-ansi-sql-statement) for the full walkthrough (dispatch
lists, keyword placement, the `test:keywords` sync check). In short: add the rule in
`grammar/statements/`, wire it into the dispatch list in `grammar/statements/index.js`, define any new
keywords (ANSI in `grammar/keywords.js`, dialect-specific in that dialect's own `grammar.js`), add the
`@keyword` capture to the matching `highlights.scm`, then `npm run generate && npm run test:keywords`
and add corpus tests.

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
   `node scripts/generate-bindings.js` to regenerate the Rust/Node/Python/Go/Swift/CMake glue files
   (adds the new dialect's named export/feature/function/subpackage/target/CMake option everywhere)
   and `node scripts/compress-parsers.js <dialect>` to produce its committed
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

Releases don't route through `main` — `main` never carries a version-bump commit. Instead,
each minor line gets its own `release/x.y` branch, cut from `main` once, that receives the
version bump and any later hotfixes for that line.

### First release of a line (e.g. 0.1.0)

```bash
git checkout -b release/0.1 main
git push -u origin release/0.1
```

```bash
bash scripts/bump-version.sh 0.1.0   # bumps package.json, tree-sitter.json, Cargo.toml, pyproject.toml, CMakeLists.txt
npm run release                       # generates a docs/changelog.md entry and commits
git push                              # open a PR into release/0.1, not main
```

Once that PR merges into `release/0.1`:

```bash
git checkout release/0.1 && git pull
git tag v0.1.0
git push --tags
```

Pushing the tag triggers `tag.yml`, which builds artifacts and opens a **draft** GitHub
release. Publishing that draft (a separate, manual step on GitHub) is what fires
`publish.yml` and actually pushes to npm, crates.io, and PyPI.

### Hotfixing an already-released line

```bash
git checkout -b hotfix/0.1-<desc> release/0.1
# make the fix, open a PR into release/0.1
```

Once merged into `release/0.1`, bump to the next patch (`bash scripts/bump-version.sh
0.1.1`, `npm run release`, PR into `release/0.1`), then tag `v0.1.1` from `release/0.1` the
same way as above. Afterwards, open a second PR forward-porting just the code fix (not the
version bump) into `main`, so it isn't lost once the next minor line branches off.

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
