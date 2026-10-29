import { paren_list, comma_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

// ALTER TABLE (Oracle SQL Language Reference 26ai). Oracle chains clauses with whitespace, MySQL
// style commas stay accepted, and every clause the previous list took is still here.

export default {

  alter_table: $ => seq(
    $.keyword_alter,
    $.keyword_table,
    optional($._if_exists),
    optional($.keyword_only),
    $.object_reference,
    choice(
      repeat1(seq($._alter_specifications, optional(','))),
      seq(
        choice(
          $.keyword_enable,
          $.keyword_disable,
          seq(optional($.keyword_no), $.keyword_force),
        ),
        $.keyword_row,
        $.keyword_level,
        $.keyword_security,
      ),
    ),
  ),

  _alter_specifications: $ => choice(
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
    $.alter_partition,
    $._oracle_physical_attribute,
    $._oracle_table_attribute,
    $.add_columns_clause,
    $.add_unnamed_constraint,
    $.add_overflow_clause,
    $.modify_columns_clause,
    $.modify_column_annotations,
    $.modify_constraint_clause,
    $.drop_columns_clause,
    $.drop_unused_columns_clause,
    $.drop_key_clause,
    $.alter_constraint_state,
    $.rename_constraint_clause,
    $.set_unused_clause,
    $.move_clause,
    $.shrink_clause,
    $.allocate_extent_clause,
    $.deallocate_unused_clause,
    $.modify_lob_clause,
    $.modify_nested_table_clause,
    $.modify_opaque_type_clause,
    $.table_lock_clause,
    $.all_triggers_clause,
  ),

  // ADD (column | constraint | PERIOD FOR … | REF (column_value) WITH ROWID | SCOPE FOR (c) IS t, …)
  add_columns_clause: $ => seq(
    $.keyword_add,
    paren_list(
      choice($.column_definition, $.typeless_column_definition, $.constraint, $.ref_column_clause, $.scope_clause),
      true,
    ),
  ),

  ref_column_clause: $ => seq(
    $.keyword_ref, wrapped_in_parenthesis($.identifier),
    $.keyword_with, $.keyword_rowid,
  ),

  scope_clause: $ => seq(
    $.keyword_scope, $.keyword_for, wrapped_in_parenthesis($.identifier),
    $.keyword_is, $.object_reference,
  ),

  // ADD UNIQUE (c, d) | ADD PRIMARY KEY (c) | ADD CHECK (…) | ADD FOREIGN KEY …
  add_unnamed_constraint: $ => seq(
    $.keyword_add,
    choice($._key_constraint, $._primary_key_constraint, $._check_constraint),
    repeat($._constraint_state),
  ),

  // ADD OVERFLOW [segment attributes]
  add_overflow_clause: $ => seq($.keyword_add, $.keyword_overflow, repeat($._oracle_physical_attribute)),

  // MODIFY (column [type] [properties], …) [ADD DOMAIN d | DROP DOMAIN [PRESERVE CONSTRAINTS]]
  modify_columns_clause: $ => seq(
    $.keyword_modify,
    paren_list($.modify_column_definition, true),
    optional(choice(
      seq($.keyword_add, $.keyword_domain, $.object_reference),
      $._drop_domain,
    )),
  ),

  // MODIFY c ANNOTATIONS (ADD x, DROP y)
  modify_column_annotations: $ => seq(
    $.keyword_modify, optional($.keyword_column), $.identifier, $.annotations_clause,
  ),

  modify_column_definition: $ => prec.left(seq(
    field('name', $._column),
    optional(field('type', $._type)),
    repeat(choice(
      $._column_constraint,
      seq($.keyword_drop, $.keyword_identity),
      $._drop_domain,
    )),
  )),

  _drop_domain: $ => seq($.keyword_drop, $.keyword_domain, optional(seq($.keyword_preserve, $.keyword_constraints))),

  // MODIFY {CONSTRAINT c | PRIMARY KEY | UNIQUE (cols)} state …
  modify_constraint_clause: $ => seq(
    $.keyword_modify,
    choice(
      seq($.keyword_constraint, $.identifier),
      $._primary_key,
      seq($.keyword_unique, $.ordered_columns),
    ),
    repeat1(choice(
      $._constraint_state,
      $.keyword_precheck,
      $.keyword_noprecheck,
      $._drop_behavior,
      seq(choice($.keyword_keep, $.keyword_drop), $.keyword_index),
    )),
  ),

  // DROP (c, d) [CASCADE CONSTRAINTS] [INVALIDATE] [CHECKPOINT n]
  drop_columns_clause: $ => seq(
    $.keyword_drop,
    choice(
      seq(paren_list($.identifier, true), repeat($._drop_column_option)),
      seq($.keyword_columns, $.keyword_continue, repeat($._drop_column_option)),
      wrapped_in_parenthesis($.period_definition),
    ),
  ),

  drop_unused_columns_clause: $ => seq(
    $.keyword_drop, $.keyword_unused, $.keyword_columns, repeat($._drop_column_option),
  ),

  _drop_column_option: $ => choice(
    seq($.keyword_cascade, $.keyword_constraints),
    $.keyword_invalidate,
    seq($.keyword_checkpoint, alias($._natural_number, $.literal)),
    $.keyword_online,
  ),

  drop_column: $ => seq(
    $.keyword_drop,
    optional($.keyword_column),
    optional($._if_exists),
    field('name', $.identifier),
    repeat($._drop_column_option),
  ),

  drop_constraint: $ => seq(
    $.keyword_drop,
    $.keyword_constraint,
    optional($._if_exists),
    $.identifier,
    repeat($._drop_constraint_option),
  ),

  // DROP PRIMARY KEY | DROP UNIQUE (c, d)
  drop_key_clause: $ => seq(
    $.keyword_drop,
    choice($._primary_key, seq($.keyword_unique, $.ordered_columns)),
    repeat($._drop_constraint_option),
  ),

  _drop_constraint_option: $ => choice(
    $._drop_behavior,
    seq(choice($.keyword_keep, $.keyword_drop), $.keyword_index),
    $.keyword_online,
  ),

  // {ENABLE | DISABLE} [VALIDATE | NOVALIDATE] {UNIQUE (c) | PRIMARY KEY | CONSTRAINT c} [options]
  alter_constraint_state: $ => seq(
    choice($.keyword_enable, $.keyword_disable),
    optional(choice($.keyword_validate, $.keyword_novalidate)),
    choice(
      seq($.keyword_unique, $.ordered_columns),
      $._primary_key,
      seq($.keyword_constraint, $.identifier),
    ),
    repeat(choice(
      $._constraint_state,
      $._drop_behavior,
      seq(choice($.keyword_keep, $.keyword_drop), $.keyword_index),
    )),
  ),

  rename_constraint_clause: $ => seq(
    $.keyword_rename, $.keyword_constraint, $.identifier, $.keyword_to, $.identifier,
  ),

  // SET UNUSED (c, d) | SET UNUSED COLUMN c, with CASCADE CONSTRAINTS / INVALIDATE / ONLINE
  set_unused_clause: $ => seq(
    $.keyword_set, $.keyword_unused,
    choice(
      paren_list($.identifier, true),
      seq($.keyword_column, $.identifier),
    ),
    repeat($._drop_column_option),
  ),

  // MOVE [ONLINE] [attributes] [UPDATE INDEXES] [LOB / NESTED TABLE storage]
  move_clause: $ => seq(
    $.keyword_move,
    repeat(choice(
      $._oracle_physical_attribute,
      $.lob_storage_clause,
      $.nested_table_clause,
      $._partition_maintenance_option,
    )),
  ),

  // SHRINK SPACE [COMPACT] [CASCADE]
  shrink_clause: $ => seq(
    $.keyword_shrink, $.keyword_space,
    optional($.keyword_compact),
    optional($.keyword_cascade),
  ),

  // ALLOCATE EXTENT [(SIZE n DATAFILE 'f' INSTANCE n)]
  allocate_extent_clause: $ => seq(
    $.keyword_allocate, $.keyword_extent,
    optional(wrapped_in_parenthesis(repeat1(choice(
      seq($.keyword_size, $._size),
      seq($.keyword_datafile, alias($._literal_string, $.literal)),
      seq($.keyword_instance, alias($._natural_number, $.literal)),
    )))),
  ),

  // DEALLOCATE UNUSED [KEEP size]
  deallocate_unused_clause: $ => seq(
    $.keyword_deallocate, $.keyword_unused,
    optional(seq($.keyword_keep, $._size)),
  ),

  // MODIFY LOB (c) (storage parameters)
  modify_lob_clause: $ => seq(
    $.keyword_modify, $.keyword_lob, paren_list($.identifier, true),
    wrapped_in_parenthesis(repeat1($._lob_parameter)),
  ),

  // MODIFY NESTED TABLE nt RETURN AS {VALUE | LOCATOR}
  modify_nested_table_clause: $ => seq(
    $.keyword_modify, $.keyword_nested, $.keyword_table, $.identifier,
    $.keyword_return, $.keyword_as, choice($.keyword_value, $.keyword_locator),
  ),

  // MODIFY OPAQUE TYPE t STORE (type, …) UNPACKED
  modify_opaque_type_clause: $ => seq(
    $.keyword_modify, $.keyword_opaque, $.keyword_type, $.object_reference,
    $.keyword_store, paren_list($.object_reference, true),
    choice($.keyword_unpacked, $.keyword_packed),
  ),

  // {ENABLE | DISABLE} TABLE LOCK
  table_lock_clause: $ => seq(
    choice($.keyword_enable, $.keyword_disable), $.keyword_table, $.keyword_lock,
  ),

  // {ENABLE | DISABLE} ALL TRIGGERS
  all_triggers_clause: $ => seq(
    choice($.keyword_enable, $.keyword_disable), $.keyword_all, $.keyword_triggers,
  ),

};
