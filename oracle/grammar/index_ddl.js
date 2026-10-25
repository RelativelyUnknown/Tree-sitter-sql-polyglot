import { paren_list, comma_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

// CREATE INDEX / ALTER INDEX (Oracle SQL Language Reference 26ai). Segment attributes, compression
// and partitioning come from storage.js and partition.js.

export default {

  create_index: $ => seq(
    $.keyword_create,
    optional(choice($.keyword_unique, $.keyword_bitmap, $.keyword_multivalue)),
    $.keyword_index,
    optional(
      seq(
        optional($._if_not_exists),
        choice(field('column', $._column), $._qualified_index_name),
      ),
    ),
    $.keyword_on,
    choice(
      // ON CLUSTER c
      seq($.keyword_cluster, $.object_reference),
      seq(
        optional($.keyword_only),
        $.object_reference,
        optional(field('alias', $.identifier)),
        optional(seq($.keyword_using, field('index_type', $.identifier))),
        $.index_fields,
        // bitmap join index: … FROM t, u WHERE …
        optional(seq(
          $.keyword_from,
          comma_list(seq($.object_reference, optional(field('alias', $.identifier))), true),
        )),
      ),
    ),
    repeat($._index_property),
  ),

  // An index key: column, function, or expression (c + (c * d)); same shape as the base rule.
  _index_field: $ => seq(
    choice(
      field('expression', wrapped_in_parenthesis($._expression)),
      field('expression', $.binary_expression),
      field('function', $.invocation),
      field('column', $._qualified_field),
      field('column', $._column),
    ),
    optional(seq($.keyword_collate, $.identifier)),
    optional($._operator_class),
    optional(choice($.keyword_hash, $.direction)),
    optional(
      seq(
        $.keyword_nulls,
        choice(
          $.keyword_first,
          $.keyword_last
        )
      )
    ),
  ),

  _qualified_index_name: $ => alias(
    seq(field('schema', $.identifier), '.', field('name', $.identifier)),
    $.object_reference,
  ),

  _index_property: $ => choice(
    $._oracle_physical_attribute,
    $.covering_columns,
    $.where,
    $.keyword_online,
    $.keyword_unusable,
    $.keyword_invisible,
    $.keyword_visible,
    $.keyword_reverse,
    $.keyword_noreverse,
    $.keyword_sort,
    $.keyword_nosort,
    // LOCAL [STORE IN (ts, …)] [(PARTITION …, …)]
    seq(
      $.keyword_local,
      optional($.store_in_clause),
      optional(paren_list($.partition_definition, true)),
    ),
    // GLOBAL PARTITION BY {RANGE | HASH} (cols) …
    seq($.keyword_global, $.table_partition_by),
    seq($.keyword_indexing, choice($.keyword_partial, $.keyword_full)),
    seq(choice($.keyword_deferred, $.keyword_immediate), $.keyword_invalidation),
    seq($.keyword_indextype, $.keyword_is, $.object_reference),
    $.parameters_clause,
    $.annotations_clause,
  ),

  parameters_clause: $ => seq($.keyword_parameters, wrapped_in_parenthesis(alias($._literal_string, $.literal))),

  // ALTER INDEX i {REBUILD [...] | UNUSABLE | COALESCE | RENAME TO … | MONITORING USAGE
  //   | VISIBLE | INVISIBLE | ENABLE | DISABLE | partition maintenance | PARAMETERS (…) | …}
  alter_index: $ => prec.right(seq(
    $.keyword_alter,
    $.keyword_index,
    optional($._if_exists),
    $.object_reference,
    repeat1(choice(
      $.rename_object,
      // The physical attributes that may follow REBUILD are collected by the
      // outer repeat1, not nested here; nesting them makes the two repeats
      // ambiguous for a shared attribute.
      $.keyword_rebuild,
      $.keyword_reverse,
      $.keyword_noreverse,
      $.keyword_online,
      $.keyword_compute,
      $.keyword_unusable,
      seq($.keyword_coalesce, optional($.keyword_cleanup)),
      $.keyword_compile,
      $.keyword_visible,
      $.keyword_invisible,
      $.keyword_enable,
      $.keyword_disable,
      seq(optional($.keyword_no), $.keyword_monitoring, $.keyword_usage),
      seq($.keyword_reset, paren_list($.identifier)),
      seq($.keyword_set, $.keyword_tablespace, $.identifier),
      $._oracle_physical_attribute,
      $.parameters_clause,
      $.annotations_clause,
      $.index_partition_action,
      seq($.keyword_shrink, $.keyword_space, optional($.keyword_compact), optional($.keyword_cascade)),
    )),
  )),

  // ADD / DROP / MODIFY / REBUILD / RENAME / SPLIT PARTITION and MODIFY DEFAULT ATTRIBUTES
  index_partition_action: $ => choice(
    seq($.keyword_add, $.keyword_partition, optional($.identifier), repeat($._oracle_physical_attribute)),
    seq($.keyword_drop, $.keyword_partition, $.identifier),
    seq(
      $.keyword_modify, $.keyword_default, $.keyword_attributes,
      optional(seq($.keyword_for, $.keyword_partition, $.identifier)),
      repeat($._oracle_physical_attribute),
    ),
    seq(
      $.keyword_modify, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      repeat1(choice($.keyword_unusable, $.keyword_coalesce, $._oracle_physical_attribute)),
    ),
    seq(
      $.keyword_rebuild, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      repeat($._oracle_physical_attribute),
    ),
    seq($.keyword_rename, choice($.keyword_partition, $.keyword_subpartition), $.identifier, $.keyword_to, $.identifier),
    seq(
      $.keyword_split, $.keyword_partition, $.identifier,
      $.keyword_at, paren_list($._expression, true),
      $.keyword_into, wrapped_in_parenthesis(comma_list($.partition_definition, true)),
    ),
  ),

};
