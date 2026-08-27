#include <Python.h>

typedef struct TSLanguage TSLanguage;

TSLanguage *tree_sitter_sql(void);
TSLanguage *tree_sitter_spark_sql(void);
TSLanguage *tree_sitter_postgres_sql(void);
TSLanguage *tree_sitter_mysql_sql(void);
TSLanguage *tree_sitter_databricks_sql(void);
TSLanguage *tree_sitter_snowflake_sql(void);
TSLanguage *tree_sitter_bigquery_sql(void);
TSLanguage *tree_sitter_mariadb_sql(void);
TSLanguage *tree_sitter_sqlite_sql(void);
TSLanguage *tree_sitter_hive_sql(void);
TSLanguage *tree_sitter_oracle_sql(void);
TSLanguage *tree_sitter_db2_sql(void);
TSLanguage *tree_sitter_tsql(void);
TSLanguage *tree_sitter_duckdb_sql(void);
TSLanguage *tree_sitter_trino_sql(void);
TSLanguage *tree_sitter_athena_sql(void);
TSLanguage *tree_sitter_redshift_sql(void);
TSLanguage *tree_sitter_clickhouse_sql(void);
TSLanguage *tree_sitter_flink_sql(void);
TSLanguage *tree_sitter_cockroachdb_sql(void);
TSLanguage *tree_sitter_spanner_sql(void);
TSLanguage *tree_sitter_teradata_sql(void);
TSLanguage *tree_sitter_hana_sql(void);

static PyObject* _binding_language(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_spark(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_spark_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_postgres(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_postgres_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_mysql(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_mysql_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_databricks(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_databricks_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_snowflake(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_snowflake_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_bigquery(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_bigquery_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_mariadb(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_mariadb_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_sqlite(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_sqlite_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_hive(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_hive_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_oracle(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_oracle_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_db2(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_db2_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_tsql(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_tsql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_duckdb(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_duckdb_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_trino(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_trino_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_athena(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_athena_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_redshift(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_redshift_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_clickhouse(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_clickhouse_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_flink(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_flink_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_cockroachdb(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_cockroachdb_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_spanner(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_spanner_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_teradata(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_teradata_sql(), "tree_sitter.Language", NULL);
}

static PyObject* _binding_language_hana(PyObject *Py_UNUSED(self), PyObject *Py_UNUSED(args)) {
    return PyCapsule_New(tree_sitter_hana_sql(), "tree_sitter.Language", NULL);
}

static struct PyModuleDef_Slot slots[] = {
#ifdef Py_GIL_DISABLED
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
#endif
    {0, NULL}
};

static PyMethodDef methods[] = {
    {"language", _binding_language, METH_NOARGS,
     "Get the tree-sitter language for this grammar."},
    {"language_spark", _binding_language_spark, METH_NOARGS,
     "Get the tree-sitter language for the spark_sql dialect."},
    {"language_postgres", _binding_language_postgres, METH_NOARGS,
     "Get the tree-sitter language for the postgres_sql dialect."},
    {"language_mysql", _binding_language_mysql, METH_NOARGS,
     "Get the tree-sitter language for the mysql_sql dialect."},
    {"language_databricks", _binding_language_databricks, METH_NOARGS,
     "Get the tree-sitter language for the databricks_sql dialect."},
    {"language_snowflake", _binding_language_snowflake, METH_NOARGS,
     "Get the tree-sitter language for the snowflake_sql dialect."},
    {"language_bigquery", _binding_language_bigquery, METH_NOARGS,
     "Get the tree-sitter language for the bigquery_sql dialect."},
    {"language_mariadb", _binding_language_mariadb, METH_NOARGS,
     "Get the tree-sitter language for the mariadb_sql dialect."},
    {"language_sqlite", _binding_language_sqlite, METH_NOARGS,
     "Get the tree-sitter language for the sqlite_sql dialect."},
    {"language_hive", _binding_language_hive, METH_NOARGS,
     "Get the tree-sitter language for the hive_sql dialect."},
    {"language_oracle", _binding_language_oracle, METH_NOARGS,
     "Get the tree-sitter language for the oracle_sql dialect."},
    {"language_db2", _binding_language_db2, METH_NOARGS,
     "Get the tree-sitter language for the db2_sql dialect."},
    {"language_tsql", _binding_language_tsql, METH_NOARGS,
     "Get the tree-sitter language for the tsql dialect."},
    {"language_duckdb", _binding_language_duckdb, METH_NOARGS,
     "Get the tree-sitter language for the duckdb_sql dialect."},
    {"language_trino", _binding_language_trino, METH_NOARGS,
     "Get the tree-sitter language for the trino_sql dialect."},
    {"language_athena", _binding_language_athena, METH_NOARGS,
     "Get the tree-sitter language for the athena_sql dialect."},
    {"language_redshift", _binding_language_redshift, METH_NOARGS,
     "Get the tree-sitter language for the redshift_sql dialect."},
    {"language_clickhouse", _binding_language_clickhouse, METH_NOARGS,
     "Get the tree-sitter language for the clickhouse_sql dialect."},
    {"language_flink", _binding_language_flink, METH_NOARGS,
     "Get the tree-sitter language for the flink_sql dialect."},
    {"language_cockroachdb", _binding_language_cockroachdb, METH_NOARGS,
     "Get the tree-sitter language for the cockroachdb_sql dialect."},
    {"language_spanner", _binding_language_spanner, METH_NOARGS,
     "Get the tree-sitter language for the spanner_sql dialect."},
    {"language_teradata", _binding_language_teradata, METH_NOARGS,
     "Get the tree-sitter language for the teradata_sql dialect."},
    {"language_hana", _binding_language_hana, METH_NOARGS,
     "Get the tree-sitter language for the hana_sql dialect."},
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
