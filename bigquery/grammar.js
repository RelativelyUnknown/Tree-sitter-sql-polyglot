import base from '../grammar.js';
import { paren_list, comma_list, optional_parenthesis, wrapped_in_parenthesis, make_keyword } from '../grammar/helpers.js';

import select_rules    from './grammar/select.js';
import expr_rules      from './grammar/expressions.js';
import string_rules    from './grammar/strings.js';
import scripting_rules from './grammar/scripting.js';
import ddl_rules       from './grammar/ddl.js';
import ml_rules        from './grammar/ml.js';
import types_rules     from './grammar/types.js';

export default grammar(base, {
  name: 'bigquery_sql',

  conflicts: $ => [
    // Inherited base conflicts
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
    // BigQuery-specific
    [$.all_fields, $.all_fields_except],
    [$.qualify],
    [$.array_type, $.struct_type],
    [$.unnest],
  ],

  rules: {

    // ── Program: add scripting top-level blocks ─────────────────────────────
    program: $ => seq(
      repeat(seq(
        choice(
          $.transaction,
          $.statement,
          $.compound_statement,
        ),
        ';',
      )),
      optional($.statement),
    ),

    // ── Statement: add BigQuery scripting statements ────────────────────────
    statement: $ => seq(
      optional(seq(
        $.keyword_explain,
        optional($.keyword_analyze),
        optional($.keyword_verbose),
      )),
      choice(
        $._ddl_statement,
        $._dml_write,
        optional_parenthesis($._dml_read),
        $.declare_statement,
        $.set_variable_statement,
        $.for_statement,
        $.while_statement,
        $.loop_statement,
        $.if_statement,
        $.leave_statement,
        $.continue_statement,
      ),
    ),

    // ── DDL: add BigQuery-specific statements ───────────────────────────────
    _ddl_statement: $ => choice(
      // base ANSI DDL
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.set_statement,
      $.grant_statement,
      $.revoke_statement,
      // BigQuery additions
      $.export_data,
      $.assert_statement,
      $.call_statement,
    ),

    // ── CREATE: add BigQuery CREATE types ──────────────────────────────────
    _create_statement: $ => seq(
      choice(
        // base (re-enumerated from grammar/statements/create.js)
        $.create_table,
        $.create_view,
        $.create_materialized_view,
        $.create_index,
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
        // BigQuery-specific
        $.create_model,
      ),
    ),

    // ── term: allow SELECT * EXCEPT / REPLACE ──────────────────────────────
    term: $ => seq(
      field(
        'value',
        choice(
          $.all_fields,
          $.all_fields_except,
          $.all_fields_replace,
          $._expression,
        ),
      ),
      optional($._alias),
    ),

    // ── _expression: add BQ struct, array, typed literal, triple-string ────
    _expression: $ => prec(1, choice(
      $.literal,
      alias($._qualified_field, $.field),
      $.parameter,
      $.list,
      $.case,
      $.window_function,
      $.subquery,
      $.cast,
      $.exists,
      $.invocation,
      $.binary_expression,
      $.subscript,
      $.unary_expression,
      $.array,
      $.interval,
      $.between_expression,
      $.parenthesized_expression,
      // BigQuery-specific
      $.struct,
      $.typed_literal,
      $.triple_double_quoted_string,
      $.triple_single_quoted_string,
      $.ml_function,
    )),

    // ── from: add QUALIFY after HAVING ─────────────────────────────────────
    from: $ => seq(
      $.keyword_from,
      optional($.keyword_only),
      comma_list($.relation, true),
      repeat(
        choice(
          $.join,
          $.cross_join,
          $.lateral_join,
          $.lateral_cross_join,
        ),
      ),
      optional($.where),
      optional($.group_by),
      optional($.having),
      optional($.qualify),
      optional($.window_clause),
      optional($.order_by),
      optional($.limit),
      optional($.offset_fetch_clause),
    ),

    // ── relation: add UNNEST as a FROM source ───────────────────────────────
    relation: $ => prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
          $.unnest,
        ),
        optional($.tablesample),
        optional(
          seq(
            $._alias,
            optional(alias($._column_list, $.list)),
          ),
        ),
      ),
    ),

    // ── identifier: add backtick quoting ────────────────────────────────────
    _bq_backtick_quoted_string: _ => /`[^`]*`/,

    identifier: $ => choice(
      $._identifier,
      $._double_quote_string,
      $._bq_backtick_quoted_string,
    ),

    // BigQuery-specific keywords (not ANSI)
    // token(prec(1,...)) ensures they win over identifier in all lexer states
    keyword_struct:     _ => token(prec(1, make_keyword("struct"))),
    keyword_export:     _ => token(prec(1, make_keyword("export"))),
    keyword_model:      _ => token(prec(1, make_keyword("model"))),
    keyword_ml:         _ => token(prec(1, make_keyword("ml"))),
    keyword_predict:    _ => token(prec(1, make_keyword("predict"))),
    keyword_evaluate:   _ => token(prec(1, make_keyword("evaluate"))),
    keyword_assert:     _ => token(prec(1, make_keyword("assert"))),
    keyword_continue:   _ => token(prec(1, make_keyword("continue"))),
    keyword_error:      _ => token(prec(1, make_keyword("error"))),
    keyword_exception:  _ => token(prec(1, make_keyword("exception"))),
    keyword_qualify:    _ => token(prec(1, make_keyword("qualify"))),
    keyword_string:     _ => token(prec(1, make_keyword("string"))),
    keyword_while:      _ => token(prec(1, make_keyword("while"))),
    keyword_loop:       _ => token(prec(1, make_keyword("loop"))),
    keyword_leave:      _ => token(prec(1, make_keyword("leave"))),
    keyword_iterate:    _ => token(prec(1, make_keyword("iterate"))),
    keyword_elseif:     _ => token(prec(1, make_keyword("elseif"))),
    keyword_source:     _ => token(prec(1, make_keyword("source"))),
    keyword_options:    _ => token(prec(1, make_keyword("options"))),
    keyword_int64:      _ => token(prec(1, make_keyword("int64"))),
    keyword_float64:    _ => token(prec(1, make_keyword("float64"))),
    keyword_bytes:      _ => token(prec(1, make_keyword("bytes"))),
    keyword_bignumeric: _ => token(prec(1, make_keyword("bignumeric"))),
    keyword_geography:  _ => token(prec(1, make_keyword("geography"))),
    keyword_datetime:   _ => token(prec(1, make_keyword("datetime"))),
    keyword_unnest:     _ => token(prec(1, make_keyword("unnest"))),
    keyword_declare:    _ => token(prec(1, make_keyword("declare"))),
    keyword_call:       _ => token(prec(1, make_keyword("call"))),

    // ── Spread all BigQuery rule modules ────────────────────────────────────
    ...select_rules,
    ...expr_rules,
    ...string_rules,
    ...scripting_rules,
    ...ddl_rules,
    ...ml_rules,
    ...types_rules,

  },
});
