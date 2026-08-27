//! This crate provides Sql language support for the [tree-sitter][] parsing library,
//! plus every independently compiled dialect extension (see the `LANGUAGE_*` constants).
//!
//! Typically, you will use the [LANGUAGE][] constant to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! ```
//! let code = r#"
//! "#;
//! let mut parser = tree_sitter::Parser::new();
//! let language = tree_sitter_sql_extended::LANGUAGE;
//! parser
//!     .set_language(&language.into())
//!     .expect("Error loading Sql parser");
//! let tree = parser.parse(code, None).unwrap();
//! assert!(!tree.root_node().has_error());
//! ```
//!
//! [Parser]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_sql() -> *const ();
    fn tree_sitter_spark_sql() -> *const ();
    fn tree_sitter_postgres_sql() -> *const ();
    fn tree_sitter_mysql_sql() -> *const ();
    fn tree_sitter_databricks_sql() -> *const ();
    fn tree_sitter_snowflake_sql() -> *const ();
    fn tree_sitter_bigquery_sql() -> *const ();
    fn tree_sitter_mariadb_sql() -> *const ();
    fn tree_sitter_sqlite_sql() -> *const ();
    fn tree_sitter_hive_sql() -> *const ();
    fn tree_sitter_oracle_sql() -> *const ();
    fn tree_sitter_db2_sql() -> *const ();
    fn tree_sitter_tsql() -> *const ();
    fn tree_sitter_duckdb_sql() -> *const ();
    fn tree_sitter_trino_sql() -> *const ();
    fn tree_sitter_athena_sql() -> *const ();
    fn tree_sitter_redshift_sql() -> *const ();
    fn tree_sitter_clickhouse_sql() -> *const ();
    fn tree_sitter_flink_sql() -> *const ();
    fn tree_sitter_cockroachdb_sql() -> *const ();
    fn tree_sitter_spanner_sql() -> *const ();
    fn tree_sitter_teradata_sql() -> *const ();
    fn tree_sitter_hana_sql() -> *const ();
}

/// The tree-sitter [`LanguageFn`][LanguageFn] for this grammar.
///
/// [LanguageFn]: https://docs.rs/tree-sitter-language/*/tree_sitter_language/struct.LanguageFn.html
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sql) };

/// The content of the [`node-types.json`][] file for this grammar.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers#static-node-types
pub const NODE_TYPES: &str = include_str!(concat!(env!("OUT_DIR"), "/base_node-types.json"));

pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the spark_sql dialect.
pub const LANGUAGE_SPARK: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_spark_sql) };

/// The content of the `node-types.json` file for the spark_sql dialect.
pub const NODE_TYPES_SPARK: &str = include_str!(concat!(env!("OUT_DIR"), "/spark_node-types.json"));

/// The syntax highlighting query for the spark_sql dialect.
pub const HIGHLIGHTS_QUERY_SPARK: &str = include_str!("../../spark/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the postgres_sql dialect.
pub const LANGUAGE_POSTGRES: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_postgres_sql) };

/// The content of the `node-types.json` file for the postgres_sql dialect.
pub const NODE_TYPES_POSTGRES: &str = include_str!(concat!(env!("OUT_DIR"), "/postgres_node-types.json"));

/// The syntax highlighting query for the postgres_sql dialect.
pub const HIGHLIGHTS_QUERY_POSTGRES: &str = include_str!("../../postgres/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the mysql_sql dialect.
pub const LANGUAGE_MYSQL: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_mysql_sql) };

/// The content of the `node-types.json` file for the mysql_sql dialect.
pub const NODE_TYPES_MYSQL: &str = include_str!(concat!(env!("OUT_DIR"), "/mysql_node-types.json"));

/// The syntax highlighting query for the mysql_sql dialect.
pub const HIGHLIGHTS_QUERY_MYSQL: &str = include_str!("../../mysql/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the databricks_sql dialect.
pub const LANGUAGE_DATABRICKS: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_databricks_sql) };

/// The content of the `node-types.json` file for the databricks_sql dialect.
pub const NODE_TYPES_DATABRICKS: &str = include_str!(concat!(env!("OUT_DIR"), "/databricks_node-types.json"));

/// The syntax highlighting query for the databricks_sql dialect.
pub const HIGHLIGHTS_QUERY_DATABRICKS: &str = include_str!("../../databricks/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the snowflake_sql dialect.
pub const LANGUAGE_SNOWFLAKE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_snowflake_sql) };

/// The content of the `node-types.json` file for the snowflake_sql dialect.
pub const NODE_TYPES_SNOWFLAKE: &str = include_str!(concat!(env!("OUT_DIR"), "/snowflake_node-types.json"));

/// The syntax highlighting query for the snowflake_sql dialect.
pub const HIGHLIGHTS_QUERY_SNOWFLAKE: &str = include_str!("../../snowflake/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the bigquery_sql dialect.
pub const LANGUAGE_BIGQUERY: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_bigquery_sql) };

/// The content of the `node-types.json` file for the bigquery_sql dialect.
pub const NODE_TYPES_BIGQUERY: &str = include_str!(concat!(env!("OUT_DIR"), "/bigquery_node-types.json"));

/// The syntax highlighting query for the bigquery_sql dialect.
pub const HIGHLIGHTS_QUERY_BIGQUERY: &str = include_str!("../../bigquery/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the mariadb_sql dialect.
pub const LANGUAGE_MARIADB: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_mariadb_sql) };

/// The content of the `node-types.json` file for the mariadb_sql dialect.
pub const NODE_TYPES_MARIADB: &str = include_str!(concat!(env!("OUT_DIR"), "/mariadb_node-types.json"));

/// The syntax highlighting query for the mariadb_sql dialect.
pub const HIGHLIGHTS_QUERY_MARIADB: &str = include_str!("../../mariadb/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the sqlite_sql dialect.
pub const LANGUAGE_SQLITE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sqlite_sql) };

/// The content of the `node-types.json` file for the sqlite_sql dialect.
pub const NODE_TYPES_SQLITE: &str = include_str!(concat!(env!("OUT_DIR"), "/sqlite_node-types.json"));

/// The syntax highlighting query for the sqlite_sql dialect.
pub const HIGHLIGHTS_QUERY_SQLITE: &str = include_str!("../../sqlite/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the hive_sql dialect.
pub const LANGUAGE_HIVE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_hive_sql) };

/// The content of the `node-types.json` file for the hive_sql dialect.
pub const NODE_TYPES_HIVE: &str = include_str!(concat!(env!("OUT_DIR"), "/hive_node-types.json"));

/// The syntax highlighting query for the hive_sql dialect.
pub const HIGHLIGHTS_QUERY_HIVE: &str = include_str!("../../hive/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the oracle_sql dialect.
pub const LANGUAGE_ORACLE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_oracle_sql) };

/// The content of the `node-types.json` file for the oracle_sql dialect.
pub const NODE_TYPES_ORACLE: &str = include_str!(concat!(env!("OUT_DIR"), "/oracle_node-types.json"));

/// The syntax highlighting query for the oracle_sql dialect.
pub const HIGHLIGHTS_QUERY_ORACLE: &str = include_str!("../../oracle/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the db2_sql dialect.
pub const LANGUAGE_DB2: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_db2_sql) };

/// The content of the `node-types.json` file for the db2_sql dialect.
pub const NODE_TYPES_DB2: &str = include_str!(concat!(env!("OUT_DIR"), "/db2_node-types.json"));

/// The syntax highlighting query for the db2_sql dialect.
pub const HIGHLIGHTS_QUERY_DB2: &str = include_str!("../../db2/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the tsql dialect.
pub const LANGUAGE_TSQL: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_tsql) };

/// The content of the `node-types.json` file for the tsql dialect.
pub const NODE_TYPES_TSQL: &str = include_str!(concat!(env!("OUT_DIR"), "/tsql_node-types.json"));

/// The syntax highlighting query for the tsql dialect.
pub const HIGHLIGHTS_QUERY_TSQL: &str = include_str!("../../tsql/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the duckdb_sql dialect.
pub const LANGUAGE_DUCKDB: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_duckdb_sql) };

/// The content of the `node-types.json` file for the duckdb_sql dialect.
pub const NODE_TYPES_DUCKDB: &str = include_str!(concat!(env!("OUT_DIR"), "/duckdb_node-types.json"));

/// The syntax highlighting query for the duckdb_sql dialect.
pub const HIGHLIGHTS_QUERY_DUCKDB: &str = include_str!("../../duckdb/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the trino_sql dialect.
pub const LANGUAGE_TRINO: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_trino_sql) };

/// The content of the `node-types.json` file for the trino_sql dialect.
pub const NODE_TYPES_TRINO: &str = include_str!(concat!(env!("OUT_DIR"), "/trino_node-types.json"));

/// The syntax highlighting query for the trino_sql dialect.
pub const HIGHLIGHTS_QUERY_TRINO: &str = include_str!("../../trino/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the athena_sql dialect.
pub const LANGUAGE_ATHENA: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_athena_sql) };

/// The content of the `node-types.json` file for the athena_sql dialect.
pub const NODE_TYPES_ATHENA: &str = include_str!(concat!(env!("OUT_DIR"), "/athena_node-types.json"));

/// The syntax highlighting query for the athena_sql dialect.
pub const HIGHLIGHTS_QUERY_ATHENA: &str = include_str!("../../athena/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the redshift_sql dialect.
pub const LANGUAGE_REDSHIFT: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_redshift_sql) };

/// The content of the `node-types.json` file for the redshift_sql dialect.
pub const NODE_TYPES_REDSHIFT: &str = include_str!(concat!(env!("OUT_DIR"), "/redshift_node-types.json"));

/// The syntax highlighting query for the redshift_sql dialect.
pub const HIGHLIGHTS_QUERY_REDSHIFT: &str = include_str!("../../redshift/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the clickhouse_sql dialect.
pub const LANGUAGE_CLICKHOUSE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_clickhouse_sql) };

/// The content of the `node-types.json` file for the clickhouse_sql dialect.
pub const NODE_TYPES_CLICKHOUSE: &str = include_str!(concat!(env!("OUT_DIR"), "/clickhouse_node-types.json"));

/// The syntax highlighting query for the clickhouse_sql dialect.
pub const HIGHLIGHTS_QUERY_CLICKHOUSE: &str = include_str!("../../clickhouse/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the flink_sql dialect.
pub const LANGUAGE_FLINK: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_flink_sql) };

/// The content of the `node-types.json` file for the flink_sql dialect.
pub const NODE_TYPES_FLINK: &str = include_str!(concat!(env!("OUT_DIR"), "/flink_node-types.json"));

/// The syntax highlighting query for the flink_sql dialect.
pub const HIGHLIGHTS_QUERY_FLINK: &str = include_str!("../../flink/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the cockroachdb_sql dialect.
pub const LANGUAGE_COCKROACHDB: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_cockroachdb_sql) };

/// The content of the `node-types.json` file for the cockroachdb_sql dialect.
pub const NODE_TYPES_COCKROACHDB: &str = include_str!(concat!(env!("OUT_DIR"), "/cockroachdb_node-types.json"));

/// The syntax highlighting query for the cockroachdb_sql dialect.
pub const HIGHLIGHTS_QUERY_COCKROACHDB: &str = include_str!("../../cockroachdb/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the spanner_sql dialect.
pub const LANGUAGE_SPANNER: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_spanner_sql) };

/// The content of the `node-types.json` file for the spanner_sql dialect.
pub const NODE_TYPES_SPANNER: &str = include_str!(concat!(env!("OUT_DIR"), "/spanner_node-types.json"));

/// The syntax highlighting query for the spanner_sql dialect.
pub const HIGHLIGHTS_QUERY_SPANNER: &str = include_str!("../../spanner/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the teradata_sql dialect.
pub const LANGUAGE_TERADATA: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_teradata_sql) };

/// The content of the `node-types.json` file for the teradata_sql dialect.
pub const NODE_TYPES_TERADATA: &str = include_str!(concat!(env!("OUT_DIR"), "/teradata_node-types.json"));

/// The syntax highlighting query for the teradata_sql dialect.
pub const HIGHLIGHTS_QUERY_TERADATA: &str = include_str!("../../teradata/queries/highlights.scm");

/// The tree-sitter [`LanguageFn`][LanguageFn] for the hana_sql dialect.
pub const LANGUAGE_HANA: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_hana_sql) };

/// The content of the `node-types.json` file for the hana_sql dialect.
pub const NODE_TYPES_HANA: &str = include_str!(concat!(env!("OUT_DIR"), "/hana_node-types.json"));

/// The syntax highlighting query for the hana_sql dialect.
pub const HIGHLIGHTS_QUERY_HANA: &str = include_str!("../../hana/queries/highlights.scm");

#[cfg(test)]
mod tests {
    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE.into())
            .expect("Error loading Sql parser");
    }

    #[test]
    fn test_can_load_spark_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SPARK.into())
            .expect("Error loading spark_sql parser");
    }

    #[test]
    fn test_can_load_postgres_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_POSTGRES.into())
            .expect("Error loading postgres_sql parser");
    }

    #[test]
    fn test_can_load_mysql_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_MYSQL.into())
            .expect("Error loading mysql_sql parser");
    }

    #[test]
    fn test_can_load_databricks_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_DATABRICKS.into())
            .expect("Error loading databricks_sql parser");
    }

    #[test]
    fn test_can_load_snowflake_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SNOWFLAKE.into())
            .expect("Error loading snowflake_sql parser");
    }

    #[test]
    fn test_can_load_bigquery_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_BIGQUERY.into())
            .expect("Error loading bigquery_sql parser");
    }

    #[test]
    fn test_can_load_mariadb_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_MARIADB.into())
            .expect("Error loading mariadb_sql parser");
    }

    #[test]
    fn test_can_load_sqlite_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SQLITE.into())
            .expect("Error loading sqlite_sql parser");
    }

    #[test]
    fn test_can_load_hive_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_HIVE.into())
            .expect("Error loading hive_sql parser");
    }

    #[test]
    fn test_can_load_oracle_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_ORACLE.into())
            .expect("Error loading oracle_sql parser");
    }

    #[test]
    fn test_can_load_db2_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_DB2.into())
            .expect("Error loading db2_sql parser");
    }

    #[test]
    fn test_can_load_tsql_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_TSQL.into())
            .expect("Error loading tsql parser");
    }

    #[test]
    fn test_can_load_duckdb_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_DUCKDB.into())
            .expect("Error loading duckdb_sql parser");
    }

    #[test]
    fn test_can_load_trino_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_TRINO.into())
            .expect("Error loading trino_sql parser");
    }

    #[test]
    fn test_can_load_athena_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_ATHENA.into())
            .expect("Error loading athena_sql parser");
    }

    #[test]
    fn test_can_load_redshift_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_REDSHIFT.into())
            .expect("Error loading redshift_sql parser");
    }

    #[test]
    fn test_can_load_clickhouse_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_CLICKHOUSE.into())
            .expect("Error loading clickhouse_sql parser");
    }

    #[test]
    fn test_can_load_flink_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_FLINK.into())
            .expect("Error loading flink_sql parser");
    }

    #[test]
    fn test_can_load_cockroachdb_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_COCKROACHDB.into())
            .expect("Error loading cockroachdb_sql parser");
    }

    #[test]
    fn test_can_load_spanner_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SPANNER.into())
            .expect("Error loading spanner_sql parser");
    }

    #[test]
    fn test_can_load_teradata_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_TERADATA.into())
            .expect("Error loading teradata_sql parser");
    }

    #[test]
    fn test_can_load_hana_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_HANA.into())
            .expect("Error loading hana_sql parser");
    }
}
