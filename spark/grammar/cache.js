// Spark SQL cache management.
//
// These are OSS Spark statements, not Databricks extensions:
//   CACHE TABLE   https://spark.apache.org/docs/latest/sql-ref-syntax-aux-cache-cache-table.html
//   UNCACHE TABLE https://spark.apache.org/docs/latest/sql-ref-syntax-aux-cache-uncache-table.html
//   CLEAR CACHE   https://spark.apache.org/docs/latest/sql-ref-syntax-aux-cache-clear-cache.html
// They previously lived in the databricks grammar, which meant plain Spark
// could not parse syntax its own reference documents. Databricks inherits
// them from here unchanged.
export default {

  // CACHE [LAZY] TABLE name [AS query]
  cache_table: $ => prec.left(seq(
    $.keyword_cache,
    optional($.keyword_lazy),
    $.keyword_table,
    $.object_reference,
    optional(seq($.keyword_as, $._dml_read)),
  )),

  // UNCACHE TABLE [IF EXISTS] name
  uncache_table: $ => seq(
    $.keyword_uncache,
    $.keyword_table,
    optional($._if_exists),
    $.object_reference,
  ),

  // CLEAR CACHE
  clear_cache: $ => seq(
    $.keyword_clear,
    $.keyword_cache,
  ),

};
