import { comma_list, paren_list } from '../../grammar/helpers.js';

// ALTER for the Snowflake objects that share one action vocabulary (rename, swap, SET / UNSET,
// SUSPEND / RESUME, tags, policies). Each object takes a subset of the actions; the union is
// accepted per object kind and anchored by the object keyword.
// https://docs.snowflake.com/en/sql-reference/sql/alter-view (and the sibling ALTER pages)
export default {

  alter_object: $ => seq(
    $.keyword_alter,
    choice(
      $.keyword_view,
      seq($.keyword_materialized, $.keyword_view),
      $.keyword_task,
      seq($.keyword_dynamic, $.keyword_table),
      $.keyword_alert,
      $.keyword_warehouse,
      $.keyword_stream,
      $.keyword_pipe,
      $.keyword_user,
      $.keyword_role,
    ),
    optional($._if_exists),
    $.object_reference,
    $._snowflake_alter_action,
  ),

  alter_routine: $ => seq(
    $.keyword_alter,
    choice($.keyword_function, $.keyword_procedure),
    optional($._if_exists),
    $.object_reference,
    paren_list($._type, false),
    choice(
      $.rename_object,
      seq($.keyword_set, choice(
        $.keyword_secure,
        seq($.keyword_tag, comma_list($.tag_assignment, true)),
        repeat1($.snowflake_property),
      )),
      seq($.keyword_unset, choice(
        $.keyword_secure,
        seq($.keyword_tag, comma_list($.object_reference, true)),
        comma_list($.identifier, true),
      )),
      seq($.keyword_execute, $.keyword_as, choice(
        $.keyword_owner,
        $.keyword_caller,
        seq($.keyword_restricted, $.keyword_caller),
      )),
    ),
  ),

  tag_assignment: $ => seq($.object_reference, '=', alias($._literal_string, $.literal)),

  _snowflake_alter_action: $ => choice(
    $.rename_object,
    seq($.keyword_swap, $.keyword_with, $.object_reference),
    seq($.keyword_set, $._snowflake_set_item),
    seq($.keyword_unset, $._snowflake_unset_item),
    seq($.keyword_suspend, optional($.keyword_recluster), optional(seq($.keyword_search, $.keyword_optimization, $.keyword_on, $.identifier, paren_list($.identifier, true)))),
    seq($.keyword_resume, optional(choice($.keyword_recluster, seq($.keyword_if, $.keyword_suspended)))),
    seq($.keyword_refresh, optional(seq($.keyword_copy, $.keyword_session)), repeat($.snowflake_property)),
    seq($.keyword_abort, $.keyword_all, $.keyword_queries),
    $.keyword_enable,
    $.keyword_disable,
    seq($.keyword_add, $.keyword_tables, paren_list($.object_reference, true)),
    seq($.keyword_drop, $.keyword_tables, paren_list($.object_reference, true)),
    seq($.keyword_cluster, $.keyword_by, paren_list($._expression, true)),
    seq($.keyword_drop, $.keyword_clustering, $.keyword_key),
    seq($.keyword_add, $.row_access_policy_clause),
    seq($.keyword_drop, $.keyword_row, $.keyword_access, $.keyword_policy, $.object_reference, optional(seq(',', $.keyword_add, $.row_access_policy_clause))),
    seq($.keyword_drop, $.keyword_all, $.keyword_row, $.keyword_access, $.keyword_policies),
    seq($.keyword_add, $.keyword_storage, $.keyword_lifecycle, $.keyword_policy, $.object_reference, $.keyword_on, paren_list($.identifier, true)),
    seq(choice($.keyword_alter, $.keyword_modify), optional($.keyword_column), $.identifier, $._snowflake_column_action),
    // tasks
    seq($.keyword_add, $.keyword_after, prec.right(comma_list($.object_reference, true))),
    seq($.keyword_remove, $.keyword_after, prec.right(comma_list($.object_reference, true))),
    seq($.keyword_modify, $.keyword_as, $._dml_read),
    seq($.keyword_modify, $.keyword_when, $._expression),
    seq($.keyword_remove, $.keyword_when),
    // alerts
    seq($.keyword_modify, $.keyword_action, $._dml_read),
    seq($.keyword_modify, $.keyword_condition, $.keyword_exists, '(', $._dml_read, ')'),
  ),

  _snowflake_set_item: $ => choice(
    $.keyword_secure,
    seq($.keyword_tag, prec.right(comma_list($.tag_assignment, true))),
    seq($.keyword_contact, $.identifier, '=', $.identifier),
    seq($.keyword_join, $.keyword_policy, $.object_reference),
    seq($.keyword_aggregation, $.keyword_policy, $.object_reference, optional(seq($.keyword_entity, $.keyword_key, paren_list($.identifier, true))), optional($.keyword_force)),
    seq($.keyword_frozen, $.keyword_where, '(', $._expression, ')'),
    seq($.keyword_authentication, $.keyword_policy, $.object_reference, optional($.keyword_force)),
    repeat1($.snowflake_property),
  ),

  _snowflake_unset_item: $ => choice(
    $.keyword_secure,
    seq($.keyword_tag, prec.right(comma_list($.object_reference, true))),
    seq($.keyword_join, $.keyword_policy),
    seq($.keyword_frozen, optional($.keyword_where)),
    prec.right(comma_list($.identifier, true)),
  ),

  _snowflake_column_action: $ => choice(
    seq($.keyword_set, $.keyword_masking, $.keyword_policy, $.object_reference, optional(seq($.keyword_using, paren_list($.identifier, true))), optional($.keyword_force)),
    seq($.keyword_unset, $.keyword_masking, $.keyword_policy),
    seq($.keyword_set, $.keyword_projection, $.keyword_policy, $.object_reference, optional($.keyword_force)),
    seq($.keyword_unset, $.keyword_projection, $.keyword_policy),
    seq($.keyword_set, $.keyword_tag, prec.right(comma_list($.tag_assignment, true))),
    seq($.keyword_unset, $.keyword_tag, prec.right(comma_list($.object_reference, true))),
    seq($.keyword_comment, alias($._literal_string, $.literal)),
  ),

};
