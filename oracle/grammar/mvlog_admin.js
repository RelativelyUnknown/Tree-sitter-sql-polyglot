import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

// Materialized view logs, plus small additions to ALTER MATERIALIZED VIEW, ALTER DATABASE LINK,
// FLASHBACK TABLE and PURGE (Oracle SQL Language Reference 26ai). Each rule replaces the one in
// mviews.js / admin_ddl.js it extends and keeps every form that one accepted.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_asynchronous: _ => kw('asynchronous'),
  keyword_hour:         _ => kw('hour'),
  keyword_minute:       _ => kw('minute'),
  keyword_synchronous:  _ => kw('synchronous'),
  keyword_triggers:     _ => kw('triggers'),

  // ── Materialized view logs ─────────────────────────────────────────────

  _mv_log_value: $ => choice(
    seq(
      choice(
        seq($.keyword_primary, $.keyword_key),
        $.keyword_rowid,
        $.keyword_sequence,
        seq($.keyword_object, $.keyword_id),
        seq($.keyword_commit, $.keyword_scn),
      ),
      optional(paren_list($.identifier, true)),
    ),
    paren_list($.identifier, true),
  ),

  // FOR [FAST | SYNCHRONOUS] REFRESH [USING staging_log]
  _mv_log_refresh: $ => seq(
    $.keyword_for,
    optional(choice($.keyword_fast, $.keyword_synchronous)),
    $.keyword_refresh,
    optional(seq($.keyword_using, $.object_reference)),
  ),

  // PURGE IMMEDIATE [SYNCHRONOUS | ASYNCHRONOUS] | START WITH e [NEXT e] | REPEAT INTERVAL e
  _mv_log_purge: $ => seq(
    $.keyword_purge,
    choice(
      seq($.keyword_immediate, optional(choice($.keyword_synchronous, $.keyword_asynchronous))),
      seq(
        optional(seq($.keyword_start, $.keyword_with, $._expression)),
        optional(seq($.keyword_next, $._expression)),
      ),
      seq($.keyword_repeat, $.keyword_interval, $._expression, optional($._interval_unit_name)),
    ),
  ),

  _interval_unit_name: $ => choice(
    $.keyword_year, $.keyword_month, $.keyword_day, $.keyword_hour, $.keyword_minute, $.keyword_second,
  ),

  create_materialized_view_log: $ => prec.right(seq(
    $.keyword_create,
    $.keyword_materialized,
    $.keyword_view,
    $.keyword_log,
    optional($._if_not_exists),
    $.keyword_on,
    field('table', $.object_reference),
    repeat(choice(
      $._oracle_physical_attribute,
      $.table_partition_by,
      $.sharing_clause,
      seq($.keyword_with, comma_list($._mv_log_value, true)),
      $._mv_log_new_values,
      $._mv_log_refresh,
      $._mv_log_purge,
    )),
  )),

  alter_materialized_view_log: $ => prec.right(seq(
    $.keyword_alter,
    choice(seq($.keyword_materialized, $.keyword_view), $.keyword_snapshot),
    $.keyword_log,
    optional($.keyword_force),
    optional($._if_exists),
    $.keyword_on,
    field('table', $.object_reference),
    repeat1(choice(
      seq($.keyword_add, comma_list($._mv_log_value, true)),
      $._mv_log_new_values,
      $._oracle_physical_attribute,
      $.table_partition_by,
      $._mv_log_refresh,
      $._mv_log_purge,
      seq($.keyword_move, $.keyword_tablespace, $.identifier),
      seq($.keyword_allocate, $.keyword_extent),
      seq($.keyword_shrink, $.keyword_space, optional($.keyword_cascade)),
    )),
  )),

  drop_materialized_view_log: $ => seq(
    $.keyword_drop,
    choice(seq($.keyword_materialized, $.keyword_view), $.keyword_snapshot),
    $.keyword_log,
    optional($._if_exists),
    $.keyword_on,
    field('table', $.object_reference),
  ),

  // ── Small additions ────────────────────────────────────────────────────

  alter_materialized_view: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_materialized,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    repeat1(choice(
      $.rename_object,
      $.set_schema,
      $.change_ownership,
      $.mv_refresh_clause,
      $._mv_query_rewrite,
      $.keyword_compile,
      seq($.keyword_consider, $.keyword_fresh),
      $._oracle_physical_attribute,
      $.annotations_clause,
      seq($.keyword_shrink, $.keyword_space, optional($.keyword_cascade)),
    )),
  )),

  alter_database_link_statement: $ => prec.right(seq(
    $.keyword_alter,
    optional($.keyword_shared),
    optional($.keyword_public),
    $.keyword_database,
    $.keyword_link,
    optional($._if_exists),
    $.object_reference,
    repeat1(choice(
      seq($.keyword_connect, $.keyword_to, $.identifier, $.keyword_identified, $.keyword_by, $._expression),
      seq($.keyword_authenticated, $.keyword_by, $.identifier, $.keyword_identified, $.keyword_by, $._expression),
    )),
  )),

  flashback_statement: $ => prec.right(seq(
    $.keyword_flashback,
    choice(
      seq($.keyword_table, comma_list($.object_reference, true)),
      seq($.keyword_database, optional(field('name', $.object_reference))),
    ),
    $.keyword_to,
    choice(
      seq($.keyword_scn, field('scn', $._expression)),
      seq($.keyword_timestamp, field('timestamp', $._expression)),
      seq($.keyword_restore, $.keyword_point, field('restore_point', $.identifier)),
      seq(
        $.keyword_before, $.keyword_drop,
        optional(seq($.keyword_rename, $.keyword_to, field('new_name', $.object_reference))),
      ),
    ),
    optional(seq(choice($.keyword_enable, $.keyword_disable), $.keyword_triggers)),
  )),

  purge_statement: $ => prec.right(seq(
    $.keyword_purge,
    choice(
      seq($.keyword_table, field('name', $.object_reference)),
      seq($.keyword_index, field('name', $.object_reference)),
      seq(
        $.keyword_tablespace,
        optional($.keyword_set),
        field('name', $.object_reference),
        optional(seq($.keyword_user, field('user', $.identifier))),
      ),
      field('scope', $.identifier),
    ),
  )),

};
