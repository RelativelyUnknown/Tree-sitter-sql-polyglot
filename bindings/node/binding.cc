#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_sql();
extern "C" TSLanguage *tree_sitter_spark_sql();
extern "C" TSLanguage *tree_sitter_postgres_sql();
extern "C" TSLanguage *tree_sitter_mysql_sql();
extern "C" TSLanguage *tree_sitter_databricks_sql();
extern "C" TSLanguage *tree_sitter_snowflake_sql();
extern "C" TSLanguage *tree_sitter_bigquery_sql();
extern "C" TSLanguage *tree_sitter_mariadb_sql();
extern "C" TSLanguage *tree_sitter_sqlite_sql();
extern "C" TSLanguage *tree_sitter_hive_sql();
extern "C" TSLanguage *tree_sitter_oracle_sql();
extern "C" TSLanguage *tree_sitter_db2_sql();
extern "C" TSLanguage *tree_sitter_tsql();
extern "C" TSLanguage *tree_sitter_duckdb_sql();
extern "C" TSLanguage *tree_sitter_trino_sql();
extern "C" TSLanguage *tree_sitter_athena_sql();
extern "C" TSLanguage *tree_sitter_redshift_sql();
extern "C" TSLanguage *tree_sitter_clickhouse_sql();
extern "C" TSLanguage *tree_sitter_flink_sql();
extern "C" TSLanguage *tree_sitter_cockroachdb_sql();
extern "C" TSLanguage *tree_sitter_spanner_sql();
extern "C" TSLanguage *tree_sitter_teradata_sql();
extern "C" TSLanguage *tree_sitter_hana_sql();

// "tree-sitter", "language" hashed with BLAKE2
const napi_type_tag LANGUAGE_TYPE_TAG = {
    0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "sql");
    auto language = Napi::External<TSLanguage>::New(env, tree_sitter_sql());
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_spark_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "spark_sql");
        dialect["language"] = lang;
        exports["spark"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_postgres_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "postgres_sql");
        dialect["language"] = lang;
        exports["postgres"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_mysql_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "mysql_sql");
        dialect["language"] = lang;
        exports["mysql"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_databricks_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "databricks_sql");
        dialect["language"] = lang;
        exports["databricks"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_snowflake_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "snowflake_sql");
        dialect["language"] = lang;
        exports["snowflake"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_bigquery_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "bigquery_sql");
        dialect["language"] = lang;
        exports["bigquery"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_mariadb_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "mariadb_sql");
        dialect["language"] = lang;
        exports["mariadb"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_sqlite_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "sqlite_sql");
        dialect["language"] = lang;
        exports["sqlite"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_hive_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "hive_sql");
        dialect["language"] = lang;
        exports["hive"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_oracle_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "oracle_sql");
        dialect["language"] = lang;
        exports["oracle"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_db2_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "db2_sql");
        dialect["language"] = lang;
        exports["db2"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_tsql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "tsql");
        dialect["language"] = lang;
        exports["tsql"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_duckdb_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "duckdb_sql");
        dialect["language"] = lang;
        exports["duckdb"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_trino_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "trino_sql");
        dialect["language"] = lang;
        exports["trino"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_athena_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "athena_sql");
        dialect["language"] = lang;
        exports["athena"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_redshift_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "redshift_sql");
        dialect["language"] = lang;
        exports["redshift"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_clickhouse_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "clickhouse_sql");
        dialect["language"] = lang;
        exports["clickhouse"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_flink_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "flink_sql");
        dialect["language"] = lang;
        exports["flink"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_cockroachdb_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "cockroachdb_sql");
        dialect["language"] = lang;
        exports["cockroachdb"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_spanner_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "spanner_sql");
        dialect["language"] = lang;
        exports["spanner"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_teradata_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "teradata_sql");
        dialect["language"] = lang;
        exports["teradata"] = dialect;
    }

    {
        auto lang = Napi::External<TSLanguage>::New(env, tree_sitter_hana_sql());
        lang.TypeTag(&LANGUAGE_TYPE_TAG);
        Napi::Object dialect = Napi::Object::New(env);
        dialect["name"] = Napi::String::New(env, "hana_sql");
        dialect["language"] = lang;
        exports["hana"] = dialect;
    }
    return exports;
}

NODE_API_MODULE(tree_sitter_sql_binding, Init)
