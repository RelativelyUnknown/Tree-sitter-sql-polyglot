import { paren_list, comma_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

// Table and index partitioning (Oracle SQL Language Reference 26ai: CREATE TABLE
// table_partitioning_clauses, CREATE INDEX global_partitioned_index / local_partitioned_index,
// ALTER TABLE modify/move/split/merge/... partition clauses).

export default {

  // PARTITION BY {RANGE | LIST | HASH} (cols) | REFERENCE (fk) | SYSTEM | CONSISTENT HASH (cols)
  //   [INTERVAL (expr)] [AUTOMATIC] [PARTITIONS n | AUTO] [STORE IN (ts, …)]
  //   [SUBPARTITION BY … | SUBPARTITION TEMPLATE …] [(partition, …)]
  table_partition_by: $ => seq(
    $.keyword_partition, $.keyword_by,
    $._partition_method,
    repeat($._partition_option),
    optional(paren_list($.partition_definition, true)),
  ),

  _partition_method: $ => choice(
    seq(choice($.keyword_range, $.keyword_list, $.keyword_hash), paren_list($._expression, true)),
    seq($.keyword_reference, wrapped_in_parenthesis($.identifier)),
    $.keyword_system,
    seq($.keyword_consistent, $.keyword_hash, paren_list($._expression, true)),
  ),

  _partition_option: $ => choice(
    seq($.keyword_interval, wrapped_in_parenthesis($._expression)),
    $.keyword_automatic,
    seq($.keyword_partitions, choice(alias($._natural_number, $.literal), $.keyword_auto)),
    $.store_in_clause,
    seq(
      $.keyword_subpartition, $.keyword_by,
      choice($.keyword_hash, $.keyword_list, $.keyword_range),
      paren_list($._expression, true),
    ),
    seq($.keyword_subpartitions, alias($._natural_number, $.literal)),
    seq(
      $.keyword_subpartition, $.keyword_template,
      choice(
        alias($._natural_number, $.literal),
        paren_list($.subpartition_definition, true),
      ),
    ),
  ),

  // STORE IN (ts1, ts2)
  store_in_clause: $ => seq($.keyword_store, $.keyword_in, paren_list($.identifier, true)),

  // VALUES LESS THAN (…) | VALUES (…, DEFAULT)
  _partition_values: $ => choice(
    seq(
      $.keyword_values, $.keyword_less, $.keyword_than,
      paren_list(choice($._expression, $.keyword_maxvalue), true),
    ),
    seq($.keyword_values, paren_list(choice($._expression, $.keyword_default), true)),
  ),

  partition_definition: $ => seq(
    $.keyword_partition, optional($.identifier),
    optional($._partition_values),
    repeat($._oracle_physical_attribute),
    optional(choice(
      seq($.keyword_subpartitions, alias($._natural_number, $.literal)),
      paren_list($.subpartition_definition, true),
    )),
  ),

  subpartition_definition: $ => seq(
    $.keyword_subpartition, optional($.identifier),
    optional($._partition_values),
    repeat($._oracle_physical_attribute),
  ),

  // ALTER TABLE partition maintenance; wired into the Oracle ALTER TABLE actions
  alter_partition: $ => choice(
    // ADD PARTITION [p] [VALUES …] [attributes]
    seq(
      $.keyword_add, $.keyword_partition, optional($.identifier),
      optional($._partition_values),
      repeat($._oracle_physical_attribute),
    ),
    // DROP PARTITION p | DROP PARTITION FOR (…) | DROP SUBPARTITION sp
    seq(
      $.keyword_drop, choice($.keyword_partition, $.keyword_subpartition),
      choice($.identifier, seq($.keyword_for, paren_list($._expression, true))),
      repeat($._partition_maintenance_option),
    ),
    seq($.keyword_truncate, choice($.keyword_partition, $.keyword_subpartition),
      choice($.identifier, seq($.keyword_for, paren_list($._expression, true))),
      repeat($._partition_maintenance_option),
    ),
    // SPLIT PARTITION p {AT (…) | VALUES (…)} INTO (PARTITION …, PARTITION …)
    seq(
      $.keyword_split, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      choice(
        seq($.keyword_at, paren_list($._expression, true)),
        seq($.keyword_values, paren_list(choice($._expression, $.keyword_default), true)),
      ),
      optional(seq(
        $.keyword_into,
        wrapped_in_parenthesis(comma_list(choice($.partition_definition, $.subpartition_definition), true)),
      )),
      repeat($._partition_maintenance_option),
    ),
    // MERGE PARTITIONS p1, p2 [, …] INTO PARTITION p | MERGE PARTITIONS p1 TO p4 INTO PARTITION p
    seq(
      $.keyword_merge, choice($.keyword_partitions, $.keyword_subpartitions),
      choice(
        comma_list($.identifier, true),
        seq($.identifier, $.keyword_to, $.identifier),
      ),
      $.keyword_into, choice($.partition_definition, $.subpartition_definition),
      repeat($._partition_maintenance_option),
    ),
    // EXCHANGE PARTITION p WITH TABLE t [INCLUDING | EXCLUDING INDEXES] [WITH | WITHOUT VALIDATION]
    seq(
      $.keyword_exchange, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      $.keyword_with, $.keyword_table, $.object_reference,
      repeat(choice(
        seq(choice($.keyword_including, $.keyword_excluding), $.keyword_indexes),
        seq(choice($.keyword_with, $.keyword_without), $.keyword_validation),
        $._partition_maintenance_option,
      )),
    ),
    // COALESCE PARTITION | COALESCE SUBPARTITION
    seq($.keyword_coalesce, choice($.keyword_partition, $.keyword_subpartition),
      repeat($._partition_maintenance_option)),
    // RENAME PARTITION a TO b
    seq($.keyword_rename, choice($.keyword_partition, $.keyword_subpartition), $.identifier, $.keyword_to, $.identifier),
    // MOVE PARTITION p [attributes] [ONLINE] [UPDATE INDEXES]
    seq($.keyword_move, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      repeat(choice($._oracle_physical_attribute, $._partition_maintenance_option))),
    // MODIFY PARTITION p {UNUSABLE LOCAL INDEXES | ADD VALUES (…) | DROP VALUES (…) | COALESCE | attributes}
    seq(
      $.keyword_modify, choice($.keyword_partition, $.keyword_subpartition), $.identifier,
      repeat1(choice(
        seq($.keyword_unusable, $.keyword_local, $.keyword_indexes),
        seq($.keyword_rebuild, $.keyword_unusable, $.keyword_local, $.keyword_indexes),
        seq(choice($.keyword_add, $.keyword_drop), $.keyword_values, paren_list($._expression, true)),
        $.keyword_coalesce,
        $._oracle_physical_attribute,
        $._partition_maintenance_option,
      )),
    ),
    // MODIFY DEFAULT ATTRIBUTES [FOR PARTITION p] attributes
    seq(
      $.keyword_modify, $.keyword_default, $.keyword_attributes,
      optional(seq($.keyword_for, $.keyword_partition, $.identifier)),
      repeat($._oracle_physical_attribute),
    ),
    // MODIFY PARTITION BY {RANGE | LIST | HASH} … [ONLINE] [UPDATE INDEXES (…)]
    seq(
      $.keyword_modify, $.table_partition_by,
      repeat($._partition_maintenance_option),
    ),
    // SET INTERVAL (expr) | SET SUBPARTITION TEMPLATE (…)
    seq($.keyword_set, $.keyword_interval, wrapped_in_parenthesis(optional($._expression))),
    seq($.keyword_set, $.keyword_subpartition, $.keyword_template,
      choice(alias($._natural_number, $.literal), paren_list($.subpartition_definition, true))),
  ),

  // UPDATE [GLOBAL] INDEXES [(idx [LOCAL], …)] | INVALIDATE GLOBAL INDEXES | ONLINE | PARALLEL
  _partition_maintenance_option: $ => choice(
    seq($.keyword_update, optional($.keyword_global), $.keyword_indexes,
      optional(wrapped_in_parenthesis(comma_list(seq($.identifier, optional($.keyword_local)), true)))),
    seq($.keyword_invalidate, $.keyword_global, $.keyword_indexes),
    $.keyword_online,
    seq($.keyword_drop, $.keyword_storage),
    seq($.keyword_reuse, $.keyword_storage),
  ),

};
