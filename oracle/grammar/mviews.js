import { paren_list } from '../../grammar/helpers.js';

// Oracle's materialized-view family (view, view log, zonemap), the remaining
// DATABASE LINK statements, and the Oracle-only tails on DROP TABLE/TYPE,
// ALTER INDEX and ALTER VIEW. Transcribed from the SQL Language Reference.
export default {

  // ── Materialized views ──────────────────────────────────────────────────

  // BUILD {IMMEDIATE | DEFERRED}
  _mv_build_clause: $ => seq(
    $.keyword_build,
    choice($.keyword_immediate, $.keyword_deferred),
  ),

  // {ENABLE | DISABLE} QUERY REWRITE
  _mv_query_rewrite: $ => seq(
    choice($.keyword_enable, $.keyword_disable),
    $.keyword_query,
    $.keyword_rewrite,
  ),

  _mv_log_value_list: $ => seq(
    $._mv_log_value,
    repeat(seq(',', $._mv_log_value)),
  ),

  _mv_log_new_values: $ => seq(
    choice($.keyword_including, $.keyword_excluding),
    $.keyword_new,
    $.keyword_values,
  ),

  // CREATE MATERIALIZED ZONEMAP z ON t (col, …)
  create_materialized_zonemap: $ => prec.right(seq(
    $.keyword_create,
    $.keyword_materialized,
    $.keyword_zonemap,
    $.object_reference,
    repeat(choice(
      $._mv_query_rewrite,
      $.keyword_pruning,
      $._oracle_physical_attribute,
    )),
    choice(
      seq(
        $.keyword_on,
        $.object_reference,
        paren_list($._expression, true),
      ),
      seq($.keyword_as, $.create_query),
    ),
  )),

  // ALTER MATERIALIZED ZONEMAP z {REBUILD | COMPILE | …}
  alter_materialized_zonemap: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_materialized,
    $.keyword_zonemap,
    $.object_reference,
    repeat1(choice(
      $.keyword_rebuild,
      $.keyword_compile,
      $.keyword_pruning,
      $._mv_query_rewrite,
      $._oracle_physical_attribute,
    )),
  )),

  // DROP MATERIALIZED ZONEMAP z
  drop_materialized_zonemap: $ => seq(
    $.keyword_drop,
    $.keyword_materialized,
    $.keyword_zonemap,
    $.object_reference,
  ),

  _oracle_storage_option: $ => seq(
    $.identifier,
    field('value', choice($.literal, $.identifier)),
  ),

  // ── DATABASE LINK ───────────────────────────────────────────────────────

  // ── Oracle tails on inherited statements ────────────────────────────────

  // DROP TABLE t [CASCADE CONSTRAINTS] [PURGE]
  drop_table: $ => prec.right(seq(
    $.keyword_drop,
    $.keyword_table,
    optional($._if_exists),
    $.object_reference,
    optional(seq($.keyword_cascade, $.keyword_constraints)),
    optional($.keyword_purge),
  )),

  // DROP TYPE [BODY] t [FORCE | VALIDATE]
  drop_type: $ => prec.right(seq(
    $.keyword_drop,
    $.keyword_type,
    optional($.keyword_body),
    optional($._if_exists),
    $.object_reference,
    optional(choice($.keyword_force, $.keyword_validate)),
  )),

};
