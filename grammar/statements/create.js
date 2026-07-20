import { comma_list, paren_list, wrapped_in_parenthesis } from "../helpers.js";

import create_function_rules from "./create-function.js";
import create_procedure_rules from "./create-procedure.js";

// Shared _create_statement choice builder. Base omits the non-ANSI
// CREATE MATERIALIZED VIEW and CREATE INDEX; dialects that support them pass
// { materializedView: true } / { index: true } from their own override instead
// of re-enumerating the whole choice.
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

export default {

  // Strict ANSI base: CREATE MATERIALIZED VIEW and CREATE INDEX are not ISO SQL;
  // dialects that support them opt in via createStatementChoices (below) in
  // their own _create_statement override. The rule definitions remain for reuse.
  _create_statement: $ => seq(
    choice(...createStatementChoices($)),
  ),

  // left precedence because 'quoted' table options otherwise conflict with
  // `create function` string bodies; if you remove this precedence you will
  // have to also disable the `_literal_string` choice for the `name` field
  // in =-assigned `table_option`s
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      optional($._temporary),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      seq(
        optional($.column_definitions),
        optional(seq($.keyword_as, $.create_query)),
      ),
    ),
  ),

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
    field('name', $.keyword_default),
    seq(
      field('name', choice($.identifier, $._literal_string)),
      '=',
      field('value', choice($.identifier, $._literal_string, alias($._integer, $.literal))),
    ),
  ),

  create_query: $ => $._dml_read,

  create_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      optional($._temporary),
      optional($.keyword_recursive),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional(paren_list($.identifier)),
      $.keyword_as,
      $.create_query,
      optional(
        seq(
          $.keyword_with,
          optional(
            choice(
              $.keyword_local,
              $.keyword_cascaded,
            )
          ),
          $._check_option,
        ),
      ),
    ),
  ),

  create_materialized_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      $.keyword_materialized,
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      $.keyword_as,
      $.create_query,
      optional(
        choice(
          seq(
            $.keyword_with,
            $.keyword_data,
          ),
          seq(
            $.keyword_with,
            $.keyword_no,
            $.keyword_data,
          )
        )
      )
    ),
  ),

  _operator_class: $ => seq(
    field('opclass', $.identifier),
    optional(
      field('opclass_parameters', wrapped_in_parenthesis(comma_list($.term)))
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

  _index_field: $ => seq(
    choice(
      field('expression', wrapped_in_parenthesis($._expression)),
      field('function', $.invocation),
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

  create_index: $ => seq(
    $.keyword_create,
    optional($.keyword_unique),
    $.keyword_index,
    optional(
      seq(
        optional($._if_not_exists),
        field('column', $._column),
      ),
    ),
    $.keyword_on,
    optional($.keyword_only),
    seq(
      $.object_reference,
      optional(
        seq(
          $.keyword_using,
          field('index_type', $.identifier),
        ),
      ),
      $.index_fields
    ),
    optional($.covering_columns),
    optional($.tablespace),
    optional(
      $.where,
    ),
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
        field('name', $.identifier),
        optional('='),
        field('value', choice($.identifier, alias($._single_quote_string, $.literal))),
  ),

  create_database: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_database,
    optional($._if_not_exists),
    $.identifier,
    optional($.keyword_with),
    repeat(
      $._with_settings
    ),
  )),

  create_role: $ => prec.left(seq(
    $.keyword_create,
    choice(
      $.keyword_user,
      $.keyword_role,
      $.keyword_group,
    ),
    $.identifier,
    optional($.keyword_with),
    repeat(
      choice(
        $._user_access_role_config,
        $._role_options,
      ),
    ),
  )),

  _role_options: $ => choice(
    field('option', $.identifier),
    seq(
      $.keyword_valid,
      $.keyword_until,
      field('valid_until', alias($._literal_string, $.literal))
    ),
    seq(
      $.keyword_connection,
      $.keyword_limit,
      field('connection_limit', alias($._integer, $.literal))
    ),
    seq(
      optional($.keyword_encrypted),
      $.keyword_password,
      choice(
        field('password', alias($._literal_string, $.literal)),
        $.keyword_null,
      ),
    ),
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

  create_sequence: $ => seq(
    $.keyword_create,
    optional(
      choice(
        choice($.keyword_temporary, $.keyword_temp),
        $.keyword_unlogged,
      )
    ),
    $.keyword_sequence,
    optional($._if_not_exists),
    $.object_reference,
    repeat(
      choice(
        seq($.keyword_as, $._type),
        seq($.keyword_increment, optional($.keyword_by), field('increment', alias($._integer, $.literal))),
        seq($.keyword_minvalue, choice($.literal, seq($.keyword_no, $.keyword_minvalue))),
        seq($.keyword_no, $.keyword_minvalue),
        seq($.keyword_maxvalue, choice($.literal, seq($.keyword_no, $.keyword_maxvalue))),
        seq($.keyword_no, $.keyword_maxvalue),
        seq($.keyword_start, optional($.keyword_with), field('start', alias($._integer, $.literal))),
        seq($.keyword_cache, field('cache', alias($._integer, $.literal))),
        seq(optional($.keyword_no), $.keyword_cycle),
        seq($.keyword_owned, $.keyword_by, choice($.keyword_none, $.object_reference)),
      )
    ),
  ),

  create_trigger: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($.keyword_constraint),
    // sqlite
    optional($._temporary),
    $.keyword_trigger,
    // sqlite
    optional($._if_not_exists),
    $.object_reference,
    choice(
      $.keyword_before,
      $.keyword_after,
      seq($.keyword_instead, $.keyword_of),
    ),
    $._create_trigger_event,
    repeat(seq($.keyword_or, $._create_trigger_event)),
    $.keyword_on,
    $.object_reference,
    repeat(
      choice(
        seq($.keyword_from, $.object_reference),
        choice(
          seq($.keyword_not, $.keyword_deferrable),
          $.keyword_deferrable,
          seq($.keyword_initially, $.keyword_immediate),
          seq($.keyword_initially, $.keyword_deferred),
        ),
        seq($.keyword_referencing, choice($.keyword_old, $.keyword_new), $.keyword_table, optional($.keyword_as), $.identifier),
        seq(
          $.keyword_for,
          optional($.keyword_each),
          choice($.keyword_row, $.keyword_statement),
        ),
        seq($.keyword_when, wrapped_in_parenthesis($._expression)),
      ),
    ),
    $.keyword_execute,
    choice($.keyword_function, $.keyword_procedure),
    $.object_reference,
    paren_list(field('parameter', $.term)),
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

  create_type: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_type,
    $.object_reference,
    optional(
      seq(
        choice(
          seq(
            $.keyword_as,
            $.column_definitions,
            optional(seq($.keyword_collate, $.identifier))
          ),
          seq(
            $.keyword_as,
            $.keyword_enum,
            $.enum_elements,
          ),
          seq(
            optional(
              seq(
                $.keyword_as,
                $.keyword_range,
              )
            ),
            paren_list(
              $._with_settings
            ),
          ),
        ),
      ),
    ),
  )),

  enum_elements: $ => seq(
    paren_list(field('enum_element', alias($._literal_string, $.literal))),
  ),

};
