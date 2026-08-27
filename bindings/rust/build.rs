use std::path::Path;

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
    compile("tree-sitter-sql", "src".as_ref());
    compile("tree-sitter-sql-spark", "spark/src".as_ref());
    compile("tree-sitter-sql-postgres", "postgres/src".as_ref());
    compile("tree-sitter-sql-mysql", "mysql/src".as_ref());
    compile("tree-sitter-sql-databricks", "databricks/src".as_ref());
    compile("tree-sitter-sql-snowflake", "snowflake/src".as_ref());
    compile("tree-sitter-sql-bigquery", "bigquery/src".as_ref());
    compile("tree-sitter-sql-mariadb", "mariadb/src".as_ref());
    compile("tree-sitter-sql-sqlite", "sqlite/src".as_ref());
    compile("tree-sitter-sql-hive", "hive/src".as_ref());
    compile("tree-sitter-sql-oracle", "oracle/src".as_ref());
    compile("tree-sitter-sql-db2", "db2/src".as_ref());
    compile("tree-sitter-sql-tsql", "tsql/src".as_ref());
    compile("tree-sitter-sql-duckdb", "duckdb/src".as_ref());
    compile("tree-sitter-sql-trino", "trino/src".as_ref());
    compile("tree-sitter-sql-athena", "athena/src".as_ref());
    compile("tree-sitter-sql-redshift", "redshift/src".as_ref());
    compile("tree-sitter-sql-clickhouse", "clickhouse/src".as_ref());
    compile("tree-sitter-sql-flink", "flink/src".as_ref());
    compile("tree-sitter-sql-cockroachdb", "cockroachdb/src".as_ref());
    compile("tree-sitter-sql-spanner", "spanner/src".as_ref());
    compile("tree-sitter-sql-teradata", "teradata/src".as_ref());
    compile("tree-sitter-sql-hana", "hana/src".as_ref());

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
