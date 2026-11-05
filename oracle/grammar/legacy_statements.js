import { make_keyword, comma_list, optional_parenthesis, paren_list, wrapped_in_parenthesis } from "../../grammar/helpers.js";
import create_function_rules from "../../grammar/statements/create-function.js";
import create_procedure_rules from "../../grammar/statements/create-procedure.js";

// The base grammar is ISO SQL. This is this dialect's own copy of the statement rules the base used
// to define before it was made ISO-only: CREATE / DROP / RENAME / REFRESH / TRUNCATE / INSERT /
// UPDATE / DELETE / MERGE with their vendor clauses (IF NOT EXISTS, OR REPLACE, TEMP, ON CONFLICT,
// ON DUPLICATE KEY, INSERT ... SET, multi-table UPDATE, ...). Spread first into `rules` so the
// dialect's own rules override it.

export function createStatementChoices($, { materializedView = false, index = false } = {}) {
  return [
    $.create_table,
    $.create_view,
    ...(materializedView ? [$.create_materialized_view] : []),
    ...(index ? [$.create_index] : []),
    $.create_function,
    $.create_procedure,
    $.create_type,
    $.create_database,
    $.create_role,
    $.create_sequence,
    $.create_trigger,
    prec.left(seq(
      $.create_schema,
      repeat($._create_statement),
    )),
  ];
}

// Shared _create_statement choice builder. Base omits the non-ANSI
// CREATE MATERIALIZED VIEW and CREATE INDEX; dialects that support them pass
// { materializedView: true } / { index: true } from their own override instead
// of re-enumerating the whole choice.

const create_rules = {

  storage_parameters: $ => seq(
    $.keyword_with,
    paren_list(
      seq($.identifier, optional(seq('=', choice($.literal, $.array)))),
      true
    ),
  ),

  table_option: $ => choice(
    seq($.keyword_default, $.keyword_character, $.keyword_set, $.identifier),
    seq($.keyword_collate, $.identifier),
    $.keyword_default,
    seq(
      choice($.identifier, $._literal_string),
      '=',
      field('value', choice($.identifier, $._literal_string, alias($._integer, $.literal))),
    ),
  ),

  _operator_class: $ => seq(
    $.identifier,
    optional(
      wrapped_in_parenthesis(comma_list($.term))
    )
  ),

  composite_field: $ => seq(
    wrapped_in_parenthesis(
      comma_list(
        alias($._index_field, $.field),
        true,
      ),
    ),
    optional($.keyword_hash),
  ),

  index_fields: $ => wrapped_in_parenthesis(
    comma_list(
      choice(
        $.composite_field,
        alias($._index_field, $.field),
      ),
      true,
    ),
  ),
  tablespace: $ => seq($.keyword_tablespace, $.identifier),

  covering_columns: $ => seq(
    $.keyword_include,
    $.index_fields,
  ),

  ...create_function_rules,
  ...create_procedure_rules,

  create_schema: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_schema,
    choice(
      seq(
        optional($._if_not_exists),
        $.identifier,
        optional(seq($.keyword_authorization, $.identifier)),
      ),
      seq(
        $.keyword_authorization,
        $.identifier,
      ),
    ),
  )),

  _with_settings: $ => seq(
        $.identifier,
        optional('='),
        field('value', choice($.identifier, alias($._single_quote_string, $.literal))),
  ),

  _user_access_role_config: $ => seq(
    choice(
      seq(optional($.keyword_in), $.keyword_role),
      seq($.keyword_in, $.keyword_group),
      $.keyword_admin,
      $.keyword_user,
    ),
    comma_list($.identifier, true),
  ),

  _create_trigger_event: $ => choice(
    $.keyword_insert,
    seq(
      $.keyword_update,
      optional(
        seq(
          $.keyword_of,
          comma_list($.identifier, true),
        ),
      ),
    ),
    $.keyword_delete,
    $.keyword_truncate,
  ),

  enum_elements: $ => seq(
    paren_list(alias($._literal_string, $.literal)),
  ),

};

const drop_rules = {

  drop_schema: $ => seq(
    $.keyword_drop,
    $.keyword_schema,
    optional($._if_exists),
    $.identifier,
    optional($._drop_behavior)
  ),

  drop_database: $ => prec.left(seq(
    $.keyword_drop,
    $.keyword_database,
    optional($._if_exists),
    $.identifier,
    optional($.keyword_with),
    optional($.keyword_force),
  )),

  drop_sequence: $ => seq(
    $.keyword_drop,
    $.keyword_sequence,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_function: $ => seq(
    $.keyword_drop,
    $.keyword_function,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_procedure: $ => seq(
    $.keyword_drop,
    $.keyword_procedure,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

};

const rename_rules = {

  _rename_statement: $ => seq(
    $.keyword_rename,
    choice(
      $.keyword_table,
      $.keyword_tables,
    ),
    optional($._if_exists),
    $.object_reference,
    optional(
      choice(
        $.keyword_nowait,
        seq(
          $.keyword_wait,
          alias($._natural_number, $.literal)
        )
      )
    ),
    $.keyword_to,
    $.object_reference,
    repeat(
      seq(
        ',',
        $._rename_table_names,
      )
    ),
  ),

  _rename_table_names: $ => seq(
    $.object_reference,
    $.keyword_to,
    $.object_reference,
  ),

};

const refresh_rules = {
  refresh_materialized_view: ($) =>
    prec.right(
      seq(
        $.keyword_refresh,
        $.keyword_materialized,
        $.keyword_view,
        optional($.keyword_concurrently),
        $.object_reference,
        optional(
          choice(
            seq($.keyword_with, $.keyword_data),
            seq($.keyword_with, $.keyword_no, $.keyword_data),
          ),
        ),
      ),
    ),
};

const truncate_rules = {

};

const insert_rules = {

  _on_conflict: $ => seq(
    $.keyword_on,
    $.keyword_conflict,
    optional($.conflict_target),
    $.keyword_do,
    choice(
      $.keyword_nothing,
      seq(
        $.keyword_update,
        $._set_values,
        optional($.where),
      ),
    ),
  ),

  // ON CONFLICT (col [, …]) [WHERE predicate] | ON CONSTRAINT name
  conflict_target: $ => choice(
    seq('(', comma_list($._expression), ')', optional($.where)),
    seq($.keyword_on, $.keyword_constraint, $.identifier),
  ),

  _on_duplicate_key_update: $ => seq(
    $.keyword_on,
    $.keyword_duplicate,
    $.keyword_key,
    $.keyword_update,
    $.assignment_list,
  ),

}

const update_rules = {

  _mysql_update_statement: $ => prec(0,
    seq(
      comma_list($.relation, true),
      repeat($.join),
      $._set_values,
      optional($.where),
    ),
  ),

  _postgres_update_statement: $ => prec(1,
    seq(
      $.relation,
      $._set_values,
      optional($.from),
    ),
  ),

};

const delete_rules = {

  _delete_from: $ => seq(
    $.keyword_from,
    optional(
      $.keyword_only,
    ),
    $.object_reference,
    optional($.where),
    optional($.order_by),
    // Strict ANSI base: no LIMIT on DELETE (dialects re-add it in their override)
  ),

};

const merge_rules = {

};

const misc_rules = {
  _comment_target: $ => choice(
    // TODO: access method
    // TODO: aggregate
    $.cast,
    // TODO: collation
    seq($.keyword_column, alias($._qualified_field, $.object_reference)),
    // TODO: constraint (on domain)
    // TODO: conversion
    seq($.keyword_database, $.identifier),
    // TODO: domain
    seq($.keyword_extension, $.object_reference),
    // TODO: event trigger
    // TODO: foreign data wrapper
    // TODO: foreign table
    seq($.keyword_function, $.object_reference, optional($.function_arguments)),
    seq($.keyword_index, $.object_reference),
    // TODO: large object
    seq($.keyword_materialized, $.keyword_view, $.object_reference),
    // TODO: operator (|class|family)
    // TODO: policy
    // TODO: (procedural) language
    seq($.keyword_procedure, $.object_reference, optional($.function_arguments)),
    // TODO: publication
    seq($.keyword_role, $.identifier),
    // TODO: routine
    // TODO: rule
    seq($.keyword_schema, $.identifier),
    seq($.keyword_sequence, $.object_reference),
    // TODO: server
    // TODO: statistics
    // TODO: subscription
    seq($.keyword_table, $.object_reference),
    seq($.keyword_tablespace, $.identifier),
    // TODO: text search (configuration|dictionary|parser|template)
    // TODO: transform for
    seq($.keyword_trigger, $.identifier, $.keyword_on, $.object_reference),
    seq($.keyword_type, $.identifier),
    seq($.keyword_view, $.object_reference),
  ),

  // SHOW TABLES [FROM table] [LIKE pattern]
  _show_tables: $ => seq(
    $.keyword_tables,
    optional(seq($.keyword_from, $._qualified_field)),
    optional(seq($.keyword_like, $._expression))
  ),

  reset_statement: $ => seq(
    $.keyword_reset,
    choice(
      $.object_reference,
      $.keyword_all,
      seq($.keyword_session, $.keyword_authorization),
      $.keyword_role,
    ),
  ),

  use_statement: $ => seq(
    $.keyword_use,
    optional(choice($.keyword_database, $.keyword_schema, $.keyword_catalog)),
    $.object_reference,
  ),

  index_hint: $ => seq(
    choice(
      $.keyword_force,
      $.keyword_use,
      $.keyword_ignore,
    ),
    $.keyword_index,
    optional(
      seq(
        $.keyword_for,
        $.keyword_join,
      ),
    ),
    wrapped_in_parenthesis(
      $.identifier,
    ),
  ),

  returning: $ => seq(
    $.keyword_returning,
    $.select_expression,
  ),
};

export default {
  ...misc_rules,

  // keywords only the vendor rules in this file use; defined here, not in the ISO base
  keyword_analyze: _ => make_keyword("analyze"),
  keyword_explain: _ => make_keyword("explain"),
  keyword_verbose: _ => make_keyword("verbose"),
  keyword_tables: _ => make_keyword("tables"),
  keyword_tablespace: _ => make_keyword("tablespace"),
  keyword_force: _ => make_keyword("force"),
  keyword_ignore: _ => make_keyword("ignore"),
  keyword_use: _ => make_keyword("use"),
  keyword_include: _ => make_keyword("include"),
  keyword_character: _ => make_keyword("character"),
  keyword_reset: _ => make_keyword("reset"),
  keyword_returning: _ => make_keyword("returning"),
  keyword_hash: _ => make_keyword("hash"),
  keyword_conflict: _ => make_keyword("conflict"),
  keyword_do: _ => make_keyword("do"),
  keyword_nothing: _ => make_keyword("nothing"),
  keyword_catalog: _ => make_keyword("catalog"),
  keyword_extension: _ => make_keyword("extension"),
  keyword_cache: _ => make_keyword("cache"),
  keyword_collate: _ => make_keyword("collate"),
  keyword_concurrently: _ => make_keyword("concurrently"),
  keyword_deferrable: _ => make_keyword("deferrable"),
  keyword_none: _ => make_keyword("none"),
  keyword_nowait: _ => make_keyword("nowait"),
  keyword_owned: _ => make_keyword("owned"),
  keyword_password: _ => make_keyword("password"),
  keyword_rename: _ => make_keyword("rename"),
  keyword_unlogged: _ => make_keyword("unlogged"),
  keyword_until: _ => make_keyword("until"),
  keyword_valid: _ => make_keyword("valid"),
  keyword_wait: _ => make_keyword("wait"),

  ...create_rules,
  ...drop_rules,
  ...rename_rules,
  ...refresh_rules,
  ...truncate_rules,
  ...insert_rules,
  ...update_rules,
  ...delete_rules,
  ...merge_rules,

  _refresh_statement: $ => $.refresh_materialized_view,
};
