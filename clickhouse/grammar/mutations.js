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

  // ALTER TABLE t {DROP|DETACH|ATTACH} PARTITION expr
  // ALTER TABLE t FREEZE [PARTITION expr] [WITH NAME 'backup']
  // ALTER TABLE t UNFREEZE [PARTITION expr] WITH NAME 'backup'
  alter_partition: $ => prec.right(choice(
    seq(
      choice($.keyword_drop, $.keyword_detach, $.keyword_attach),
      $.keyword_partition,
      field('partition', $._expression),
    ),
    seq(
      choice($.keyword_freeze, $.keyword_unfreeze),
      optional(seq($.keyword_partition, field('partition', $._expression))),
      optional(seq(
        $.keyword_with,
        $.keyword_name,
        field('name', alias($._literal_string, $.literal)),
      )),
    ),
  )),

  // EXCHANGE TABLES t1 AND t2 [ON CLUSTER c] — atomic table swap
  exchange_tables_statement: $ => seq(
    $.keyword_exchange,
    $.keyword_tables,
    $.object_reference,
    $.keyword_and,
    $.object_reference,
    optional($.on_cluster),
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
