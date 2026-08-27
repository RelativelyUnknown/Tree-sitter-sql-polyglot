#!/usr/bin/env node
/**
 * Regenerates the Rust/Node/Python native binding source files so that they
 * expose the base grammar plus every dialect extension as a named export,
 * following the same "one compiled unit, multiple named languages" pattern
 * tree-sitter-typescript uses for {typescript, tsx}.
 *
 * Run after scripts/generate-all.js (each dialect's own src/parser.c must
 * already exist) and whenever a dialect is added or removed.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DIALECT_DIRS = [
  'spark', 'postgres', 'mysql', 'databricks', 'snowflake', 'bigquery',
  'mariadb', 'sqlite', 'hive', 'oracle', 'db2', 'tsql', 'duckdb', 'trino',
  'athena', 'redshift', 'clickhouse', 'flink', 'cockroachdb', 'spanner',
  'teradata', 'hana',
];

const DIALECTS = DIALECT_DIRS.map((dir) => {
  const grammarSrc = readFileSync(`${ROOT}/${dir}/grammar.js`, 'utf8');
  const grammarName = grammarSrc.match(/name:\s*'([^']+)'/)[1];
  return {
    dir,
    grammarName,
    // e.g. "databricks_sql" -> "tree_sitter_databricks_sql"
    cSymbol: `tree_sitter_${grammarName}`,
    // Rust/JS/Python identifier suffix, e.g. "databricks"
    ident: dir,
    upper: dir.toUpperCase(),
  };
});

// ── Rust: bindings/rust/lib.rs ──────────────────────────────────────────────
{
  const externs = DIALECTS.map((d) => `    fn ${d.cSymbol}() -> *const ();`).join('\n');
  const consts = DIALECTS.map((d) => `
/// The tree-sitter [\`LanguageFn\`][LanguageFn] for the ${d.grammarName} dialect.
pub const LANGUAGE_${d.upper}: LanguageFn = unsafe { LanguageFn::from_raw(${d.cSymbol}) };

/// The content of the \`node-types.json\` file for the ${d.grammarName} dialect.
pub const NODE_TYPES_${d.upper}: &str = include_str!("../../${d.dir}/src/node-types.json");

/// The syntax highlighting query for the ${d.grammarName} dialect.
pub const HIGHLIGHTS_QUERY_${d.upper}: &str = include_str!("../../${d.dir}/queries/highlights.scm");`).join('\n');

  const tests = DIALECTS.map((d) => `
    #[test]
    fn test_can_load_${d.ident}_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_${d.upper}.into())
            .expect("Error loading ${d.grammarName} parser");
    }`).join('\n');

  const content = `//! This crate provides Sql language support for the [tree-sitter][] parsing library,
//! plus every independently compiled dialect extension (see the \`LANGUAGE_*\` constants).
//!
//! Typically, you will use the [LANGUAGE][] constant to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! \`\`\`
//! let code = r#"
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! let language = tree_sitter_sql_extended::LANGUAGE;
//! parser
//!     .set_language(&language.into())
//!     .expect("Error loading Sql parser");
//! let tree = parser.parse(code, None).unwrap();
//! assert!(!tree.root_node().has_error());
//! \`\`\`
//!
//! [Parser]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_sql() -> *const ();
${externs}
}

/// The tree-sitter [\`LanguageFn\`][LanguageFn] for this grammar.
///
/// [LanguageFn]: https://docs.rs/tree-sitter-language/*/tree_sitter_language/struct.LanguageFn.html
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sql) };

/// The content of the [\`node-types.json\`][] file for this grammar.
///
/// [\`node-types.json\`]: https://tree-sitter.github.io/tree-sitter/using-parsers#static-node-types
pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");

pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");
${consts}

#[cfg(test)]
mod tests {
    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE.into())
            .expect("Error loading Sql parser");
    }
${tests}
}
`;
  writeFileSync(`${ROOT}/bindings/rust/lib.rs`, content);
}

// ── Rust: bindings/rust/build.rs ────────────────────────────────────────────
{
  const compileCalls = [`    compile("tree-sitter-sql", "src".as_ref());`]
    .concat(DIALECTS.map((d) => `    compile("tree-sitter-sql-${d.ident}", "${d.dir}/src".as_ref());`))
    .join('\n');

  const content = `use std::path::Path;

fn compile(name: &str, src_dir: &Path) {
    let mut c_config = cc::Build::new();
    c_config.std("c11").include(src_dir);

    #[cfg(target_env = "msvc")]
    c_config.flag("-utf-8");

    if std::env::var("TARGET").unwrap() == "wasm32-unknown-unknown" {
        let Ok(wasm_headers) = std::env::var("DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS") else {
            panic!("Environment variable DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS must be set by the language crate");
        };
        let Ok(wasm_src) =
            std::env::var("DEP_TREE_SITTER_LANGUAGE_WASM_SRC").map(std::path::PathBuf::from)
        else {
            panic!("Environment variable DEP_TREE_SITTER_LANGUAGE_WASM_SRC must be set by the language crate");
        };

        c_config.include(&wasm_headers);
        c_config.files([
            wasm_src.join("stdio.c"),
            wasm_src.join("stdlib.c"),
            wasm_src.join("string.c"),
        ]);
    }

    let parser_path = src_dir.join("parser.c");
    c_config.file(&parser_path);
    println!("cargo:rerun-if-changed={}", parser_path.to_str().unwrap());

    let scanner_path = src_dir.join("scanner.c");
    if scanner_path.exists() {
        c_config.file(&scanner_path);
        println!("cargo:rerun-if-changed={}", scanner_path.to_str().unwrap());
    }

    c_config.compile(name);
}

fn main() {
${compileCalls}

    println!("cargo:rustc-check-cfg=cfg(with_highlights_query)");
    if !"queries/highlights.scm".is_empty() && std::path::Path::new("queries/highlights.scm").exists() {
        println!("cargo:rustc-cfg=with_highlights_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_injections_query)");
    if !"queries/injections.scm".is_empty() && std::path::Path::new("queries/injections.scm").exists() {
        println!("cargo:rustc-cfg=with_injections_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_locals_query)");
    if !"queries/locals.scm".is_empty() && std::path::Path::new("queries/locals.scm").exists() {
        println!("cargo:rustc-cfg=with_locals_query");
    }
    println!("cargo:rustc-check-cfg=cfg(with_tags_query)");
    if !"queries/tags.scm".is_empty() && std::path::Path::new("queries/tags.scm").exists() {
        println!("cargo:rustc-cfg=with_tags_query");
    }
}
`;
  writeFileSync(`${ROOT}/bindings/rust/build.rs`, content);
}

// ── Node: bindings/node/binding.cc ──────────────────────────────────────────
{
  const externs = DIALECTS.map((d) => `extern "C" TSLanguage *${d.cSymbol}();`).join('\n');
  const exportBlocks = DIALECTS.map((d) => `
    {
        auto lang = Napi::External<TSLanguage>::New(env, ${d.cSymbol}());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "${d.grammarName}");
        dialect["language"] = lang;
        exports["${d.ident}"] = dialect;
    }`).join('\n');

  const content = `#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_sql();
${externs}

// "tree-sitter", "language" hashed with BLAKE2
const napi_type_tag LANGUAGE_TYPE_TAG = {
    0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "sql");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_sql());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
${exportBlocks}
    return exports;
}

NODE_API_MODULE(tree_sitter_sql_binding, Init)
`;
  writeFileSync(`${ROOT}/bindings/node/binding.cc`, content);
}

// ── Node: bindings/node/index.js ────────────────────────────────────────────
{
  const dialectExports = DIALECTS.map((d) => `export const ${d.ident} = binding.${d.ident};`).join('\n');

  const content = `import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

const binding = typeof process.versions.bun === "string"
  // Support \`bun build --compile\` by being statically analyzable enough to find the .node file at build-time
  ? await import(\`\${root}/prebuilds/\${process.platform}-\${process.arch}/tree-sitter-sql.node\`)
  : (await import("node-gyp-build")).default(root);

try {
  const nodeTypes = await import(\`\${root}/src/node-types.json\`, { with: { type: "json" } });
  binding.nodeTypeInfo = nodeTypes.default;
} catch { }

const queries = [
  ["HIGHLIGHTS_QUERY", \`\${root}/queries/highlights.scm\`],
  ["INJECTIONS_QUERY", \`\${root}/queries/injections.scm\`],
  ["LOCALS_QUERY", \`\${root}/queries/locals.scm\`],
  ["TAGS_QUERY", \`\${root}/queries/tags.scm\`],
];

for (const [prop, path] of queries) {
  Object.defineProperty(binding, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[prop];
      try {
        binding[prop] = readFileSync(path, "utf8");
      } catch { }
      return binding[prop];
    }
  });
}

${dialectExports}

export default binding;
`;
  writeFileSync(`${ROOT}/bindings/node/index.js`, content);
}

// ── Node: bindings/node/index.d.ts ──────────────────────────────────────────
{
  const dialectDecls = DIALECTS.map((d) => `
/** The tree-sitter language object for the ${d.grammarName} dialect. */
export declare const ${d.ident}: { name: string; language: unknown };`).join('\n');

  const content = `type BaseNode = {
  type: string;
  named: boolean;
};

type ChildNode = {
  multiple: boolean;
  required: boolean;
  types: BaseNode[];
};

type NodeInfo =
  | (BaseNode & {
      subtypes: BaseNode[];
    })
  | (BaseNode & {
      fields: { [name: string]: ChildNode };
      children: ChildNode[];
    });

/**
 * The tree-sitter language object for this grammar.
 *
 * @see {@linkcode https://tree-sitter.github.io/node-tree-sitter/interfaces/Parser.Language.html Parser.Language}
 *
 * @example
 * import Parser from "tree-sitter";
 * import SQL from "tree-sitter-sql";
 *
 * const parser = new Parser();
 * parser.setLanguage(SQL);
 */
declare const binding: {
  /**
   * The inner language object.
   * @private
   */
  language: unknown;

  /**
   * The content of the \`node-types.json\` file for this grammar.
   *
   * @see {@linkplain https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types Static Node Types}
   */
  nodeTypeInfo: NodeInfo[];

  /** The syntax highlighting query for this grammar. */
  HIGHLIGHTS_QUERY?: string;

  /** The language injection query for this grammar. */
  INJECTIONS_QUERY?: string;

  /** The local variable query for this grammar. */
  LOCALS_QUERY?: string;

  /** The symbol tagging query for this grammar. */
  TAGS_QUERY?: string;
};

export default binding;
${dialectDecls}
`;
  writeFileSync(`${ROOT}/bindings/node/index.d.ts`, content);
}

// ── Python: bindings/python/tree_sitter_sql/binding.c ───────────────────────
{
  const decls = DIALECTS.map((d) => `TSLanguage *${d.cSymbol}(void);`).join('\n');
  const fns = DIALECTS.map((d) => `
static PyObject* _binding_language_${d.ident}(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(${d.cSymbol}(), "tree_sitter.Language", NULL);
}`).join('\n');
  const methodEntries = DIALECTS.map((d) => `    {"language_${d.ident}", _binding_language_${d.ident}, METH_NOARGS,
     "Get the tree-sitter language for the ${d.grammarName} dialect."},`).join('\n');

  const content = `#include <Python.h>

typedef struct TSLanguage TSLanguage;

TSLanguage *tree_sitter_sql(void);
${decls}

static PyObject* _binding_language(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_sql(), "tree_sitter.Language", NULL);
}
${fns}

static struct PyModuleDef_Slot slots[] = {
#ifdef Py_GIL_DISABLED
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
#endif
    {0, NULL}
};

static PyMethodDef methods[] = {
    {"language", _binding_language, METH_NOARGS,
     "Get the tree-sitter language for this grammar."},
${methodEntries}
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    .m_base = PyModuleDef_HEAD_INIT,
    .m_name = "_binding",
    .m_doc = NULL,
    .m_size = 0,
    .m_methods = methods,
    .m_slots = slots,
};

PyMODINIT_FUNC PyInit__binding(void) {
    return PyModuleDef_Init(&module);
}
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/binding.c`, content);
}

// ── Python: bindings/python/tree_sitter_sql/__init__.py ─────────────────────
{
  const reexports = DIALECTS.map((d) => `language_${d.ident}`).join(', ');

  const content = `"""Tree-sitter Grammar for SQL"""

from importlib.resources import files as _files

from ._binding import language, ${reexports}


def _get_query(name, file):
    query = _files(f"{__package__}.queries") / file
    globals()[name] = query.read_text()
    return globals()[name]


def __getattr__(name):
    # NOTE: uncomment these to include any queries that this grammar contains:

    if name == "HIGHLIGHTS_QUERY":
        return _get_query("HIGHLIGHTS_QUERY", "highlights.scm")
    # if name == "INJECTIONS_QUERY":
    #     return _get_query("INJECTIONS_QUERY", "injections.scm")
    # if name == "LOCALS_QUERY":
    #     return _get_query("LOCALS_QUERY", "locals.scm")
    # if name == "TAGS_QUERY":
    #     return _get_query("TAGS_QUERY", "tags.scm")

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "language",
    ${reexports.split(', ').map((n) => `"${n}"`).join(',\n    ')},
    "HIGHLIGHTS_QUERY",
    # "INJECTIONS_QUERY",
    # "LOCALS_QUERY",
    # "TAGS_QUERY",
]


def __dir__():
    return sorted(__all__ + [
        "__all__", "__builtins__", "__cached__", "__doc__", "__file__",
        "__loader__", "__name__", "__package__", "__path__", "__spec__",
    ])
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/__init__.py`, content);
}

// ── Python: bindings/python/tree_sitter_sql/__init__.pyi ────────────────────
{
  const fnDecls = DIALECTS.map((d) => `
def language_${d.ident}() -> CapsuleType:
    """The tree-sitter language function for the ${d.grammarName} dialect."""`).join('\n');

  const content = `from typing import Final
from typing_extensions import CapsuleType

HIGHLIGHTS_QUERY: Final[str] | None
"""The syntax highlighting query for this grammar."""

INJECTIONS_QUERY: Final[str] | None
"""The language injection query for this grammar."""

LOCALS_QUERY: Final[str] | None
"""The local variable query for this grammar."""

TAGS_QUERY: Final[str] | None
"""The symbol tagging query for this grammar."""

def language() -> CapsuleType:
    """The tree-sitter language function for this grammar."""
${fnDecls}
`;
  writeFileSync(`${ROOT}/bindings/python/tree_sitter_sql/__init__.pyi`, content);
}

console.log(`generate-bindings: wrote Rust/Node/Python bindings for base + ${DIALECTS.length} dialects.`);
