import { comma_list, paren_list } from '../../grammar/helpers.js';

// ALTER TABLE actions Snowflake documents beyond the shared ones:
// https://docs.snowflake.com/en/sql-reference/sql/alter-table
// https://docs.snowflake.com/en/sql-reference/sql/alter-table-column
// Actions are comma-separated by the shared alter_table rule.
export default {

  // ADD [CONSTRAINT name] { UNIQUE | PRIMARY KEY | FOREIGN KEY ... } (cols) [properties]
  add_constraint: $ => seq($.keyword_add, $.table_constraint),

  // DROP CONSTRAINT name | DROP { PRIMARY KEY | UNIQUE | FOREIGN KEY } [(cols)] [CASCADE | RESTRICT]
  drop_constraint: $ => seq(
    $.keyword_drop,
    choice(
      seq($.keyword_constraint, optional($._if_exists), $.identifier),
      seq($.keyword_primary, $.keyword_key),
      $.keyword_unique,
      seq($.keyword_foreign, $.keyword_key),
    ),
    optional(paren_list($.identifier, true)),
    optional($._drop_behavior),
  ),

  // ALTER CONSTRAINT name [(cols)] properties
  alter_constraint: $ => seq(
    $.keyword_alter,
    $.keyword_constraint,
    $.identifier,
    optional(paren_list($.identifier, true)),
    repeat1($._constraint_property),
  ),

  // MODIFY { PRIMARY KEY | UNIQUE | FOREIGN KEY } (cols) properties
  modify_constraint: $ => seq(
    $.keyword_modify,
    choice(
      seq($.keyword_primary, $.keyword_key),
      $.keyword_unique,
      seq($.keyword_foreign, $.keyword_key),
    ),
    paren_list($.identifier, true),
    repeat1($._constraint_property),
  ),

  rename_constraint: $ => seq(
    $.keyword_rename,
    $.keyword_constraint,
    $.identifier,
    $.keyword_to,
    $.identifier,
  ),

  // ALTER | MODIFY [COLUMN] col action, or ALTER ( col action, ... ). Further columns after a
  // comma are column_alteration specifications of their own.
  alter_column: $ => seq(
    choice($.keyword_alter, $.keyword_modify),
    choice(
      $.column_alteration,
      paren_list($.column_alteration, true),
    ),
  ),

  column_alteration: $ => seq(
    optional($.keyword_column),
    field('name', $.identifier),
    $._column_action,
  ),

  _column_action: $ => choice(
    seq(choice($.keyword_set, $.keyword_drop), $.keyword_not, $.keyword_null),
    seq(optional(seq($.keyword_set, $.keyword_data)), $.keyword_type, field('type', $._type)),
    field('type', $._type),
    seq($.keyword_set, $.keyword_default, $._expression),
    seq($.keyword_drop, $.keyword_default),
    seq($.keyword_comment, alias($._literal_string, $.literal)),
    seq($.keyword_unset, $.keyword_comment),
    seq(
      $.keyword_set, $.keyword_masking, $.keyword_policy, $.object_reference,
      optional(seq($.keyword_using, paren_list($._expression, true))),
      optional($.keyword_force),
    ),
    seq($.keyword_unset, $.keyword_masking, $.keyword_policy),
    seq($.keyword_set, $.keyword_projection, $.keyword_policy, $.object_reference, optional($.keyword_force)),
    seq($.keyword_unset, $.keyword_projection, $.keyword_policy),
    seq($.keyword_set, $.keyword_tag, comma_list($.tag_assignment, true)),
    seq($.keyword_unset, $.keyword_tag, comma_list($.object_reference, true)),
  ),

  tag_assignment: $ => seq($.object_reference, '=', $.literal),

  // Table-level actions that take no column.
  snowflake_table_action: $ => choice(
    seq($.keyword_set, $.keyword_tag, comma_list($.tag_assignment, true)),
    seq($.keyword_unset, $.keyword_tag, comma_list($.object_reference, true)),

    // [ADD | DROP] ROW ACCESS POLICY
    seq($.keyword_add, $.keyword_row, $.keyword_access, $.keyword_policy, $.object_reference, $.keyword_on, paren_list($.identifier, true)),
    seq($.keyword_drop, $.keyword_row, $.keyword_access, $.keyword_policy, $.object_reference),
    seq($.keyword_drop, $.keyword_all, $.keyword_row, $.keyword_access, $.keyword_policies),

    seq($.keyword_add, $.keyword_storage, $.keyword_lifecycle, $.keyword_policy, $.object_reference, $.keyword_on, paren_list($.identifier, true)),
    seq($.keyword_drop, $.keyword_storage, $.keyword_lifecycle, $.keyword_policy),

    // SET / UNSET AGGREGATION | JOIN POLICY
    seq($.keyword_set, $.keyword_aggregation, $.keyword_policy, $.object_reference,
      optional(seq($.keyword_entity, $.keyword_key, paren_list($.identifier, true))), optional($.keyword_force)),
    seq($.keyword_unset, $.keyword_aggregation, $.keyword_policy),
    seq($.keyword_set, $.keyword_join, $.keyword_policy, $.object_reference,
      optional(seq($.keyword_allowed, $.keyword_join, $.keyword_keys, paren_list($.identifier, true))), optional($.keyword_force)),
    seq($.keyword_unset, $.keyword_join, $.keyword_policy),

    // SET CONTACT purpose = contact | UNSET CONTACT purpose
    seq($.keyword_set, $.keyword_contact, comma_list(seq($.identifier, '=', $.identifier), true)),
    seq($.keyword_unset, $.keyword_contact, comma_list($.identifier, true)),

    // ADD | DROP SEARCH OPTIMIZATION [ON method(cols), ...]
    seq($.keyword_add, $.keyword_search, $.keyword_optimization, optional(seq($.keyword_on, comma_list($.search_optimization_method, true)))),
    seq($.keyword_drop, $.keyword_search, $.keyword_optimization, optional(seq($.keyword_on, comma_list($.search_optimization_method, true)))),

    seq($.keyword_swap, $.keyword_with, $.object_reference),
    seq($.keyword_recluster, optional($.snowflake_property), optional($.where)),
  ),

  // EQUALITY(c1, c2) | SUBSTRING(c3) | GEO(c4) | FULL_TEXT(*)
  search_optimization_method: $ => seq(
    $.identifier,
    paren_list(choice($.identifier, '*'), true),
  ),

};
