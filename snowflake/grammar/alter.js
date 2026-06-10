import { paren_list } from '../../grammar/helpers.js';

export default {

  // ALTER SESSION SET param = value
  alter_session: $ => seq(
    $.keyword_alter,
    $.keyword_session,
    $.keyword_set,
    $.identifier,
    '=',
    $._expression,
  ),

  // ALTER WAREHOUSE [IF EXISTS] name SET|SUSPEND|RESUME|ABORT ALL QUERIES
  alter_warehouse_statement: $ => seq(
    $.keyword_alter,
    $.keyword_warehouse,
    optional($._if_exists),
    $.object_reference,
    choice(
      seq($.keyword_set, $.warehouse_properties),
      $.keyword_suspend,
      seq($.keyword_resume, optional(seq($.keyword_if, $.keyword_suspend))),
      seq($.keyword_abort, $.keyword_all, $.keyword_queries),
    ),
  ),

  // ALTER TABLE t MODIFY COLUMN col SET MASKING POLICY policy_name
  alter_table_masking: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    $.object_reference,
    $.keyword_modify,
    $.keyword_column,
    $.identifier,
    $.keyword_set,
    $.keyword_masking,
    $.keyword_policy,
    $.object_reference,
  ),

  // ALTER TABLE [IF EXISTS] name CLUSTER BY (exprs) | DROP CLUSTERING KEY
  alter_table_cluster: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    optional($._if_exists),
    $.object_reference,
    choice(
      seq($.keyword_cluster, $.keyword_by, paren_list($._expression, true)),
      seq($.keyword_drop, $.keyword_clustering, $.keyword_key),
    ),
  ),

};
