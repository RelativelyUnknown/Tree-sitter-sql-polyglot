"""Tree-sitter Grammar for SQL"""

from importlib.resources import files as _files

from ._binding import language, language_spark, language_postgres, language_mysql, language_databricks, language_snowflake, language_bigquery, language_mariadb, language_sqlite, language_hive, language_oracle, language_db2, language_tsql, language_duckdb, language_trino, language_athena, language_redshift, language_clickhouse, language_flink, language_cockroachdb, language_spanner, language_teradata, language_hana


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
    "language_spark",
    "language_postgres",
    "language_mysql",
    "language_databricks",
    "language_snowflake",
    "language_bigquery",
    "language_mariadb",
    "language_sqlite",
    "language_hive",
    "language_oracle",
    "language_db2",
    "language_tsql",
    "language_duckdb",
    "language_trino",
    "language_athena",
    "language_redshift",
    "language_clickhouse",
    "language_flink",
    "language_cockroachdb",
    "language_spanner",
    "language_teradata",
    "language_hana",
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
