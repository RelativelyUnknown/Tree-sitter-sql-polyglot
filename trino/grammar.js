import base from '../grammar.js';
import { optional_parenthesis, paren_list, comma_list, make_keyword } from '../grammar/helpers.js';
import { createStatementChoices } from '../grammar/statements/create.js';
import trino_statement_rules from './grammar/statements.js';
import trino_type_rules     from './grammar/types.js';
import trino_expression_rules from './grammar/expressions.js';
import trino_select_rules   from './grammar/select.js';
import trino_ddl_rules      from './grammar/ddl.js';

export default grammar(base, {
  name: 'trino_sql',

  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    // Local shift/reduce ambiguity shared with like_expression's optional
    // ESCAPE tail — kept in sync with the base grammar's conflicts.
    [$.between_expression, $.binary_expression, $.like_expression],
    [$.from],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.time],
    [$.timestamp],
    [$.term],
    [$.values],
    [$.select_expression],
    [$.set_operation],
    [$.group_by],
    [$.order_target],
    // Lambda: x -> expr vs field reference
    [$.object_reference, $._qualified_field, $.lambda_expression],
    [$._qualified_field, $.lambda_expression],
    [$.lambda_expression],
    [$.binary_expression, $.lambda_expression],
    // ROW(...) vs function invocation
    [$.row_type, $.invocation],
    // MATCH_RECOGNIZE internal GLR
    [$.match_recognize_clause],
    // ARRAY(type) vs ARRAY[...] expression
    [$.array_type, $.array],
    // set_session_statement vs set_statement (both start with SET SESSION)
    [$.set_session_statement, $.set_statement],
    // SET SESSION AUTHORIZATION vs SET SESSION var = value (shared SET SESSION prefix)
    [$.set_session_statement, $.set_session_authorization_statement],
  ],

  rules: {

    // Re-add non-ANSI CREATE forms this dialect supports over the strict ANSI base.
    _create_statement: $ => seq(choice(...createStatementChoices($, { materializedView: true }))),

    // Trino has its own comment_on_statement (richer than base comment_statement);
    // exclude the base rule from the inherited DDL dispatch to avoid ambiguity (#126)
    _ddl_statement: $ => choice(
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.set_statement,
      $.grant_statement,
      $.revoke_statement,
    ),


    statement: $ => seq(
      optional(seq(
        $.keyword_explain,
        optional($.keyword_analyze),
        optional($.keyword_verbose),
        optional($.explain_options),
      )),
      choice(
        $._ddl_statement,
        $._dml_write,
        optional_parenthesis($._dml_read),
        $._transaction_statement,
        $.prepare_statement,
        $.execute_statement,
        $.deallocate_statement,
        $.show_stats_statement,
        $.set_session_statement,
        $.reset_session_statement,
        $.show_statement,
        $.describe_statement,
        $.analyze_statement,
        $.comment_on_statement,
        $.deny_statement,
        $.set_role_statement,
        $.set_time_zone_statement,
        $.set_path_statement,
        $.set_session_authorization_statement,
      ),
    ),

    // DENY privilege [, …] ON object TO grantee [, …]
    deny_statement: $ => seq(
      $.keyword_deny,
      $._privilege_list,
      $.keyword_on,
      $._grant_object,
      $.keyword_to,
      $._grantee_list,
    ),

    // SET ROLE {role | ALL | NONE}
    set_role_statement: $ => seq(
      $.keyword_set,
      $.keyword_role,
      choice($.keyword_all, $.keyword_none, $.identifier),
    ),

    // SET TIME ZONE {LOCAL | expr}
    set_time_zone_statement: $ => seq(
      $.keyword_set,
      $.keyword_time,
      $.keyword_zone,
      choice($.keyword_local, $._expression),
    ),

    // SET PATH element [, …]  (each element is [catalog.]schema)
    set_path_statement: $ => seq(
      $.keyword_set,
      $.keyword_path,
      comma_list($.object_reference, true),
    ),

    keyword_path: _ => make_keyword("path"),

    // SET SESSION AUTHORIZATION { user | 'user' }
    set_session_authorization_statement: $ => seq(
      $.keyword_set,
      $.keyword_session,
      $.keyword_authorization,
      choice($.identifier, alias($._literal_string, $.literal)),
    ),

    // Add ALTER TABLE … EXECUTE proc(arg => value, …) to the base alter specs.
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
      seq(
        $.keyword_execute,
        $.identifier,
        optional(seq(
          '(',
          comma_list(choice(seq($.identifier, '=>', $._expression), $._expression), true),
          ')',
        )),
        optional($.where),
      ),
    ),

    keyword_deny: _ => token(prec(1, make_keyword("deny"))),

    // Override _expression to add lambda
    _expression: $ => prec(1,
      choice(
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
        // Inherited from base but this dialect fully re-enumerates
        // _expression: LIKE/NOT LIKE now parse exclusively through
        // like_expression (with optional ESCAPE), not binary_expression.
        $.like_expression,
        // ANSI typed temporal literal (F051-03): DATE/TIME/TIMESTAMP '…'.
        $.typed_temporal_literal,
        $.parenthesized_expression,
        $.trim_expression,
        $.lambda_expression,
      ),
    ),

    // Trino-specific keywords (not ANSI — defined here only, not in base)
    keyword_prepare:         _ => token(prec(1, make_keyword("prepare"))),
    keyword_deallocate:      _ => token(prec(1, make_keyword("deallocate"))),
    keyword_stats:           _ => token(prec(1, make_keyword("stats"))),
    keyword_match_recognize: _ => token(prec(1, make_keyword("match_recognize"))),
    keyword_measures:        _ => token(prec(1, make_keyword("measures"))),
    keyword_pattern:         _ => token(prec(1, make_keyword("pattern"))),
    keyword_define:          _ => token(prec(1, make_keyword("define"))),
    keyword_running:         _ => token(prec(1, make_keyword("running"))),
    keyword_final:           _ => token(prec(1, make_keyword("final"))),
    keyword_skip:            _ => token(prec(1, make_keyword("skip"))),
    keyword_past:            _ => token(prec(1, make_keyword("past"))),
    keyword_map:             _ => token(prec(1, make_keyword("map"))),
    keyword_qualify:         _ => token(prec(1, make_keyword("qualify"))),
    keyword_one:             _ => token(prec(1, make_keyword("one"))),
    keyword_per:             _ => token(prec(1, make_keyword("per"))),
    keyword_logical:         _ => token(prec(1, make_keyword("logical"))),
    keyword_distributed:     _ => token(prec(1, make_keyword("distributed"))),
    keyword_validate:        _ => token(prec(1, make_keyword("validate"))),
    keyword_io:              _ => token(prec(1, make_keyword("io"))),
    keyword_graphviz:        _ => token(prec(1, make_keyword("graphviz"))),
    keyword_format:          _ => token(prec(1, make_keyword("format"))),
    keyword_bernoulli:       _ => token(prec(1, make_keyword("bernoulli"))),
    keyword_system:          _ => token(prec(1, make_keyword("system"))),
    // Trino native type keywords (use token(prec) to ensure extraction works
    // alongside the other token(prec(1,...)) keywords defined in this dialect)
    keyword_tinyint:         _ => token(prec(1, make_keyword("tinyint"))),
    keyword_ipaddress:       _ => token(prec(1, make_keyword("ipaddress"))),
    keyword_uuid:            _ => token(prec(1, make_keyword("uuid"))),
    // Override base keywords that appear in dialect-specific positions to ensure
    // consistent keyword extraction alongside the token(prec(1,...)) keywords above
    keyword_row:             _ => token(prec(1, make_keyword("row"))),
    keyword_next:            _ => token(prec(1, make_keyword("next"))),
    keyword_show:            _ => token(prec(1, make_keyword("show"))),
    keyword_catalogs:        _ => token(prec(1, make_keyword("catalogs"))),
    keyword_schemas:         _ => token(prec(1, make_keyword("schemas"))),
    keyword_columns:         _ => token(prec(1, make_keyword("columns"))),
    keyword_functions:       _ => token(prec(1, make_keyword("functions"))),
    keyword_grants:          _ => token(prec(1, make_keyword("grants"))),
    keyword_roles:           _ => token(prec(1, make_keyword("roles"))),
    keyword_describe:        _ => token(prec(1, make_keyword("describe"))),
    keyword_extended:        _ => token(prec(1, make_keyword("extended"))),
    keyword_comment:         _ => token(prec(1, make_keyword("comment"))),
    keyword_match:           _ => token(prec(1, make_keyword("match"))),
    keyword_text:            _ => token(prec(1, make_keyword("text"))),

    // Exclude '->' from op_other so it is reserved for lambda_expression.
    // Trino does not use PostgreSQL-style JSON arrow operators.
    op_other: _ => token(
      choice(
        '->>',
        '#>',
        '#>>',
        '~',
        '!~',
        '~*',
        '!~*',
        '|',
        '&',
        '#',
        '<<',
        '>>',
        '<<=',
        '>>=',
        '##',
        '<->',
        '@>',
        '<@',
        '&<',
        '&>',
        '|>>',
        '<<|',
        '&<|',
        '|&>',
        '<^',
        '^>',
        '?#',
        '?-',
        '?|',
        '?-|',
        '?||',
        '@@',
        '@@@',
        '@?',
        '#-',
        '?&',
        '?',
      )
    ),

    ...trino_statement_rules,
    ...trino_type_rules,
    ...trino_expression_rules,
    ...trino_select_rules,
    ...trino_ddl_rules,


    // Lexer-precedence guards: this dialect declares token(prec(1)) keywords
    // that are strict prefixes of the base keywords below. Explicit precedence
    // beats match length in the tree-sitter lexer, so without an equal-prec
    // re-declaration the longer keyword becomes unlexable in this dialect.
    // CREATE [OR REPLACE] VIEW … [COMMENT '…'] [SECURITY {DEFINER|INVOKER}] AS query
    create_view: $ => prec.right(seq(
      $.keyword_create,
      optional($._or_replace),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional(paren_list($.identifier)),
      optional(seq($.keyword_comment, alias($._literal_string, $.literal))),
      optional(seq($.keyword_security, choice($.keyword_definer, $.keyword_invoker))),
      $.keyword_as,
      $.create_query,
    )),

    keyword_definer: _ => token(prec(1, make_keyword("definer"))),
    keyword_matched: _ => token(prec(1, make_keyword("matched"))),
    keyword_percent: _ => token(prec(1, make_keyword("percent"))),
    keyword_rows: _ => token(prec(1, make_keyword("rows"))),

  },
});
