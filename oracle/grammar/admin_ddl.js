import { comma_list, paren_list } from '../../grammar/helpers.js';

// Oracle statements that had no rule at all. Shapes follow the examples on
// each statement's page under
// https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/
export default {

  _lock_mode: $ => choice(
    seq($.keyword_row, $.keyword_share),
    seq($.keyword_row, $.keyword_exclusive),
    seq($.keyword_share, $.keyword_row, $.keyword_exclusive),
    seq($.keyword_share, $.keyword_update),
    $.keyword_share,
    $.keyword_exclusive,
  ),

  // CREATE [CLEAN] RESTORE POINT name [FOR PLUGGABLE DATABASE pdb] [AS OF {SCN | TIMESTAMP} expr]
  //   [PRESERVE | GUARANTEE FLASHBACK DATABASE]
  // DROP RESTORE POINT name [FOR PLUGGABLE DATABASE pdb]
  restore_point_statement: $ => choice(
    seq(
      $.keyword_create,
      optional($.keyword_clean),
      $.keyword_restore,
      $.keyword_point,
      $.identifier,
      optional(seq($.keyword_for, $.keyword_pluggable, $.keyword_database, $.identifier)),
      optional(seq($.keyword_as, $.keyword_of, choice($.keyword_scn, $.keyword_timestamp), $._expression)),
      optional(choice($.keyword_preserve, seq($.keyword_guarantee, $.keyword_flashback, $.keyword_database))),
    ),
    seq(
      $.keyword_drop,
      $.keyword_restore,
      $.keyword_point,
      $.identifier,
      optional(seq($.keyword_for, $.keyword_pluggable, $.keyword_database, $.identifier)),
    ),
  ),

  // CREATE CLUSTER c (col type [, …]) [option …]
  // TRUNCATE CLUSTER c [{DROP | REUSE} STORAGE]
  // DROP CLUSTER c [INCLUDING TABLES [CASCADE CONSTRAINTS]]
  create_cluster_statement: $ => prec.right(seq(
    $.keyword_create,
    $.keyword_cluster,
    $.object_reference,
    $.column_definitions,
    repeat($._cluster_option),
  )),

  // SIZE 512 | STORAGE (initial 100K next 50K) | <name> <value>
  // The STORAGE list is space-separated name/value words, not a comma list.
  _cluster_option: $ => choice(
    seq($.keyword_size, field('size', choice($.literal, $.identifier))),
    seq($.keyword_storage, '(', repeat1(choice($.identifier, $.literal)), ')'),
    seq($.identifier, field('value', choice($.literal, $.identifier))),
  ),

  truncate_cluster_statement: $ => prec.right(seq(
    $.keyword_truncate,
    $.keyword_cluster,
    $.object_reference,
    optional(seq(choice($.keyword_drop, $.keyword_reuse), $.keyword_storage)),
  )),

  drop_cluster_statement: $ => prec.right(seq(
    $.keyword_drop,
    $.keyword_cluster,
    $.object_reference,
    optional(seq(
      $.keyword_including,
      $.keyword_tables,
      optional(seq($.keyword_cascade, $.keyword_constraints)),
    )),
  )),

  // CREATE [OR REPLACE] CONTEXT c USING package [ACCESSED GLOBALLY | …]
  // DROP CONTEXT c
  context_statement: $ => prec.right(seq(
    choice(seq($.keyword_create, optional($._or_replace)), $.keyword_drop),
    $.keyword_context,
    $.identifier,
    optional(seq($.keyword_using, field('package', $.object_reference))),
    repeat($.identifier),
  )),

  // AUDIT POLICY p [BY u [, …] | EXCEPT u [, …]] [WHENEVER [NOT] SUCCESSFUL]
  // NOAUDIT POLICY p [BY u [, …]]
  audit_policy_statement: $ => prec.right(seq(
    choice($.keyword_audit, $.keyword_noaudit),
    $.keyword_policy,
    $.identifier,
    optional(seq(
      choice($.keyword_by, $.keyword_except),
      comma_list(field('user', $.identifier), true),
    )),
    optional(seq(
      $.keyword_whenever,
      optional($.keyword_not),
      $.keyword_successful,
    )),
  )),

  // ASSOCIATE STATISTICS WITH <kind> obj [, …] <association>
  // DISASSOCIATE STATISTICS FROM <kind> obj [, …] [FORCE]
  associate_statistics_statement: $ => prec.right(seq(
    choice($.keyword_associate, $.keyword_disassociate),
    $.keyword_statistics,
    choice($.keyword_with, $.keyword_from),
    field('kind', $.identifier),
    comma_list($.object_reference, true),
    repeat($._statistics_association),
    optional($.keyword_force),
  )),

  _statistics_association: $ => choice(
    seq($.keyword_default, $.keyword_selectivity, field('selectivity', $.literal)),
    seq($.keyword_default, $.keyword_cost, paren_list($._expression, true)),
    seq($.keyword_using, $.object_reference),
  ),

  // EXPLAIN PLAN [SET STATEMENT_ID = '…'] [INTO table] FOR <statement>
  explain_plan_statement: $ => seq(
    $.keyword_explain,
    $.keyword_plan,
    optional(seq(
      $.keyword_set,
      $.identifier,
      '=',
      alias($._literal_string, $.literal),
    )),
    optional(seq($.keyword_into, $.object_reference)),
    $.keyword_for,
    $.statement,
  ),

  // SET ROLE { role [IDENTIFIED BY pw] [, …] | ALL [EXCEPT role [, …]] | NONE }
  set_role_statement: $ => prec.right(seq(
    $.keyword_set,
    $.keyword_role,
    choice(
      seq(
        $.keyword_all,
        optional(seq($.keyword_except, comma_list(field('role', $.identifier), true))),
      ),
      $.keyword_none,
      comma_list($.role_grant, true),
    ),
  )),

  role_grant: $ => prec.right(seq(
    field('role', $.identifier),
    optional(seq($.keyword_identified, $.keyword_by, $.identifier)),
  )),

};
