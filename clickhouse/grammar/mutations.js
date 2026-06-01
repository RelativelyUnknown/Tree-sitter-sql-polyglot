import { comma_list } from '../../grammar/helpers.js';

export default {

  // Override _alter_specifications to add ClickHouse mutation specs
  // (UPDATE / DELETE) alongside the re-enumerated ANSI base specs.
  _alter_specifications: $ => choice(
    // ANSI base specs (overrides replace, so re-enumerate)
    $.add_column,
    $.add_constraint,
    $.drop_constraint,
    $.alter_column,
    $.modify_column,
    $.change_column,
    $.drop_column,
    $.rename_object,
    $.rename_column,
    $.set_schema,
    $.change_ownership,
    // ClickHouse mutations
    $.alter_update,
    $.alter_delete,
    $.alter_partition,
  ),

  // ALTER TABLE t UPDATE col = expr [, ...] WHERE cond
  alter_update: $ => seq(
    $.keyword_update,
    comma_list($.assignment, true),
    $.where,
  ),

  // ALTER TABLE t DELETE WHERE cond
  alter_delete: $ => seq(
    $.keyword_delete,
    $.where,
  ),

  // ALTER TABLE t {DROP|DETACH|ATTACH|FREEZE} PARTITION expr
  alter_partition: $ => seq(
    choice($.keyword_drop, $.keyword_detach, $.keyword_attach, $.keyword_freeze),
    $.keyword_partition,
    field('partition', $._expression),
  ),

  // OPTIMIZE TABLE t [ON CLUSTER c] [PARTITION expr] [FINAL] [DEDUPLICATE [BY expr]]
  optimize_statement: $ => prec.left(seq(
    $.keyword_optimize,
    $.keyword_table,
    $.object_reference,
    optional($.on_cluster),
    optional(seq($.keyword_partition, field('partition', $._expression))),
    optional($.keyword_final),
    optional(seq(
      $.keyword_deduplicate,
      optional(seq($.keyword_by, comma_list($._expression, true))),
    )),
  )),

};
