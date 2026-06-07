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
    $.exchange_partition,
  ),

  // ALTER TABLE t UPDATE col = expr [, ...] [IN PARTITION p] WHERE cond
  alter_update: $ => seq(
    $.keyword_update,
    comma_list($.assignment, true),
    optional($.in_partition_clause),
    $.where,
  ),

  // ALTER TABLE t DELETE [IN PARTITION p] WHERE cond
  alter_delete: $ => seq(
    $.keyword_delete,
    optional($.in_partition_clause),
    $.where,
  ),

  // IN PARTITION partition_expr — scopes a mutation to one partition.
  // `IN PARTITION` is disambiguated from the binary IN operator by the
  // keyword_partition token (see the conflicts entry in grammar.js).
  in_partition_clause: $ => seq(
    $.keyword_in,
    $.keyword_partition,
    field('partition', $._expression),
  ),

  // ALTER TABLE t {DROP|DETACH|ATTACH|FREEZE} PARTITION expr
  alter_partition: $ => seq(
    choice($.keyword_drop, $.keyword_detach, $.keyword_attach, $.keyword_freeze),
    $.keyword_partition,
    field('partition', $._expression),
  ),

  // ALTER TABLE t1 EXCHANGE PARTITION expr WITH TABLE t2 [WITHOUT VALIDATION]
  exchange_partition: $ => seq(
    $.keyword_exchange,
    $.keyword_partition,
    field('partition', $._expression),
    $.keyword_with,
    $.keyword_table,
    field('target', $.object_reference),
    optional(seq($.keyword_without, $.keyword_validation)),
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
