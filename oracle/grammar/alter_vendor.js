// Non-ISO ALTER syntax this dialect accepts (the former shared base rules, kept as this dialect's own
// copy). ISO 9075 has only ALTER TABLE (one action), ALTER TYPE (ADD/DROP ATTRIBUTE), ALTER SEQUENCE
// (RESTART / INCREMENT BY / MAXVALUE / MINVALUE / CYCLE), ALTER DOMAIN, ALTER ROUTINE and ALTER
// TRANSFORM. IF EXISTS, ONLY, comma-separated actions, MODIFY/CHANGE COLUMN, column positions,
// ROW LEVEL SECURITY, RENAME, OWNER TO, ALTER VIEW/INDEX/SCHEMA/DATABASE/ROLE are vendor syntax.
// Spread first into `rules` so the dialect's own rules override it.
import { paren_list, comma_list, make_keyword } from "../../grammar/helpers.js";

export default {

  // keywords only the rules below use; defined here, not in the ISO base
  keyword_change: _ => make_keyword("change"),
  keyword_disable: _ => make_keyword("disable"),
  keyword_enable: _ => make_keyword("enable"),
  keyword_modify: _ => make_keyword("modify"),
  keyword_owner: _ => make_keyword("owner"),
  keyword_value: _ => make_keyword("value"),

  _alter_statement: $ => seq(
    choice(
      $.alter_table,
      $.alter_view,
      $.alter_materialized_view,
      $.alter_schema,
      $.alter_type,
      $.alter_index,
      $.alter_database,
      $.alter_role,
      $.alter_sequence,
    ),
  ),

  // TODO: optional `keyword_add` is necessary to allow for chained alter statements in t-sql
  // maybe needs refactoring
  add_column: $ => seq(
    optional($.keyword_add),
    optional(
      $.keyword_column,
    ),
    optional($._if_not_exists),
    $.column_definition,
    optional($.column_position),
  ),

  add_constraint: $ => seq(
    $.keyword_add,
    optional($.keyword_constraint),
    $.identifier,
    $.constraint,
  ),

  alter_column: $ => seq(
    $.keyword_alter,
    optional($.keyword_column),
    $.identifier,
    choice(
      seq(
        choice($.keyword_set, $.keyword_drop),
        $.keyword_not,
        $.keyword_null,
      ),
      seq(
        optional(seq($.keyword_set, $.keyword_data)),
        $.keyword_type,
        field('type', $._type),
      ),
      seq($.keyword_set, $.keyword_default, $._expression),
      seq($.keyword_drop, $.keyword_default),
    ),
  ),

  modify_column: $ => seq(
    $.keyword_modify,
    optional(
      $.keyword_column,
    ),
    optional($._if_exists),
    $.column_definition,
    optional($.column_position),
  ),

  change_column: $ => seq(
    $.keyword_change,
    optional(
      $.keyword_column,
    ),
    optional($._if_exists),
    $.identifier,
    $.column_definition,
    optional($.column_position),
  ),

  column_position: $ => choice(
    $.keyword_first,
    seq(
      $.keyword_after,
      $.identifier,
    ),
  ),

  rename_column: $ => seq(
    $.keyword_rename,
    optional(
      $.keyword_column,
    ),
    $.identifier,
    $.keyword_to,
    $.identifier,
  ),

  alter_schema: $ => seq(
    $.keyword_alter,
    $.keyword_schema,
    $.identifier,
    choice(
      $.keyword_rename,
      $.keyword_owner,
    ),
    $.keyword_to,
    $.identifier,
  ),

  alter_database: $ => seq(
    $.keyword_alter,
    $.keyword_database,
    $.identifier,
    optional($.keyword_with),
    choice(
      seq($.rename_object),
      seq($.change_ownership),
      seq(
        $.keyword_reset,
        choice(
          $.keyword_all,
          $.identifier
        ),
      ),
      seq(
        $.keyword_set,
        choice(
          seq($.keyword_tablespace, $.identifier),
            $.set_configuration,
          ),
        ),
      ),
    ),

  set_configuration: $ => seq(
    $.identifier,
    choice(
      seq($.keyword_from, $.keyword_current),
      seq(
        choice($.keyword_to, "="),
        choice(
          field('parameter', $.identifier),
          $.literal,
          $.keyword_default
        )
      )
    ),
  ),

  rename_object: $ => seq(
    $.keyword_rename,
    $.keyword_to,
    $.object_reference,
  ),

  set_schema: $ => seq(
    $.keyword_set,
    $.keyword_schema,
    field('schema', $.identifier),
  ),

  change_ownership: $ => seq(
    $.keyword_owner,
    $.keyword_to,
    $.identifier,
  ),

};
