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

  // Hive's show_statement plus Spark's SHOW VIEWS and SHOW COLLATIONS.
  // An override replaces the parent rule wholesale, so Hive's alternatives
  // are re-enumerated verbatim below.
  //   https://spark.apache.org/docs/latest/sql-ref-syntax-aux-show-views.html
  //   https://spark.apache.org/docs/latest/sql-ref-syntax-aux-show-collations.html
  show_statement: $ => prec.right(seq(
    $.keyword_show,
    choice(
      // ── inherited from hive ──
      seq(
        $.keyword_partitions,
        $.object_reference,
        optional($.partition_spec),
      ),
      seq(
        $.keyword_tables,
        optional(seq(choice($.keyword_from, $.keyword_in), $.object_reference)),
        optional(seq(optional($.keyword_like), alias($._literal_string, $.literal))),
      ),
      seq(
        choice($.keyword_databases, $.keyword_schemas),
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
      ),
      seq(
        $.keyword_functions,
        optional(seq($.keyword_like, alias($._literal_string, $.literal))),
      ),
      $.keyword_roles,
      seq($.keyword_current, $.keyword_roles),
      seq(
        $.keyword_role,
        $.keyword_grant,
        choice($.keyword_user, $.keyword_group, $.keyword_role),
        $.identifier,
      ),
      // ── Spark additions ──
      // SHOW VIEWS [ { FROM | IN } database ] [ LIKE pattern ]
      seq(
        $.keyword_views,
        optional(seq(choice($.keyword_from, $.keyword_in), $.object_reference)),
        optional(seq(optional($.keyword_like), alias($._literal_string, $.literal))),
      ),
      // SHOW COLLATIONS [ LIKE pattern ]
      seq(
        $.keyword_collations,
        optional(seq(optional($.keyword_like), alias($._literal_string, $.literal))),
      ),
    ),
  )),

};
