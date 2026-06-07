import { comma_list, paren_list } from "../../grammar/helpers.js";

export default {

  // PERIOD FOR SYSTEM_TIME (start_col, end_col) — table-level pseudo-constraint
  period_for_system_time: $ => seq(
    $.keyword_period,
    $.keyword_for,
    $.keyword_system_time,
    '(',
    field('start_col', $.identifier),
    ',',
    field('end_col', $.identifier),
    ')',
  ),

  // PERIOD FOR APPLICATION_TIME (start_col, end_col) — table-level pseudo-constraint
  // APPLICATION_TIME is a single identifier token (contains underscore).
  period_for_application_time: $ => seq(
    $.keyword_period,
    $.keyword_for,
    field('period_name', alias($.identifier, $.application_time)),
    '(',
    field('start_col', $.identifier),
    ',',
    field('end_col', $.identifier),
    ')',
  ),

  // Override column_definitions to allow PERIOD FOR SYSTEM_TIME / PERIOD FOR APPLICATION_TIME
  column_definitions: $ => seq(
    '(',
    comma_list(
      choice(
        $.column_definition,
        $.constraint,
        $.period_for_system_time,
        $.period_for_application_time,
      ),
      true,
    ),
    ')',
  ),

  // Override create_table to allow WITH SYSTEM VERSIONING at the end
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      optional($._temporary),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      seq(
        optional($.column_definitions),
        repeat($.table_option),
        optional(seq($.keyword_as, $.create_query)),
      ),
      optional(seq($.keyword_with, $.keyword_system, $.keyword_versioning)),
    ),
  ),

  // ADD PERIOD FOR APPLICATION_TIME (start_col, end_col) — ALTER TABLE action
  // APPLICATION_TIME is a single identifier token (contains underscore).
  add_period_for_application_time: $ => seq(
    $.keyword_add,
    $.keyword_period,
    $.keyword_for,
    field('period_name', alias($.identifier, $.application_time)),
    '(',
    field('start_col', $.identifier),
    ',',
    field('end_col', $.identifier),
    ')',
  ),

  // DROP PERIOD FOR APPLICATION_TIME — ALTER TABLE action
  // APPLICATION_TIME is a single identifier token (contains underscore).
  drop_period_for_application_time: $ => seq(
    $.keyword_drop,
    $.keyword_period,
    $.keyword_for,
    field('period_name', alias($.identifier, $.application_time)),
  ),

  // Override _alter_specifications to include APPLICATION_TIME period operations
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
    $.add_period_for_application_time,
    $.drop_period_for_application_time,
  ),

};
