import base from '../grammar.js';
import { optional_parenthesis, comma_list, make_keyword } from '../grammar/helpers.js';
import tsql_select_rules from './grammar/select.js';
import tsql_type_rules from './grammar/types.js';
import tsql_hint_rules from './grammar/hints.js';
import tsql_dml_rules from './grammar/dml.js';
import tsql_procedural_rules from './grammar/procedural.js';
import tsql_synapse_rules from './grammar/synapse.js';
import tsql_security_rules from './grammar/security.js';

export default grammar(base, {
  name: 'tsql',

  conflicts: $ => [
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
    // output_clause: optional paren column list after INTO @var is ambiguous
    [$.output_clause],
    // EXPLAIN followed by keyword_continue / keyword_break is ambiguous — resolved by tree-sitter
    // [$.statement] removed (tree-sitter reported it unnecessary)
    // output_clause INTO @var (col_list) is ambiguous with column_definitions
    [$.output_clause],
    // option_clause after optional_parenthesis(_dml_read) causes close-paren ambiguity
    [$.option_clause],
    [$._function_return, $.return_statement],
  ],

  rules: {

    // ── Program / batch separator ─────────────────────────────────────────────
    // T-SQL uses ';' OR 'GO' as statement terminators.  Both are optional after
    // the last statement (same as base).
    program: $ => seq(
      repeat(
        seq(
          choice($.transaction, $.statement),
          choice(';', $.keyword_go),
        ),
      ),
      optional(choice($.transaction, $.statement)),
    ),

    // ── Statement ─────────────────────────────────────────────────────────────
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
        $._transaction_statement,
        // T-SQL procedural constructs
        $.declare_statement,
        $.if_statement,
        $.while_statement,
        $.compound_statement,
        $.try_catch_statement,
        $.raiserror_statement,
        $.throw_statement,
        $.print_statement,
        // T-SQL BULK INSERT (DML data-loading)
        $.bulk_insert_statement,
        // T-SQL loop control
        $.keyword_break,
        $.keyword_continue,
        // T-SQL cursor lifecycle
        $.declare_cursor_statement,
        $.open_cursor_statement,
        $.fetch_cursor_statement,
        $.close_cursor_statement,
        $.deallocate_cursor_statement,
        // New: EXEC/EXECUTE, RETURN, WAITFOR
        $.exec_statement,
        $.return_statement,
        $.waitfor_statement,
      ),
    ),

    // ── _dml_read: add trailing OPTION clause ─────────────────────────────────
    _dml_read: $ => prec.right(seq(
      optional(optional_parenthesis($._cte)),
      optional_parenthesis(
        choice(
          $._select_statement,
          $.set_operation,
        ),
      ),
      optional($.option_clause),
    )),

    // ── DDL dispatch ─────────────────────────────────────────────────────────
    _ddl_statement: $ => choice(
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.set_statement,
      $.copy_into_statement,
      $.grant_statement,
      $.revoke_statement,
      $.use_statement,
      $.create_synonym_statement,
      $.drop_synonym_statement,
      $.create_login_statement,
      $.alter_login_statement,
      $.drop_login_statement,
      $.create_user_statement,
      $.alter_user_statement,
      $.drop_user_statement,
    ),

    // ── CREATE dispatch ───────────────────────────────────────────────────────
    _create_statement: $ => seq(
      choice(
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
        $.create_external_data_source,
        $.create_external_file_format,
        $.create_external_table,
        $.create_shortcut,
        prec.left(seq(
          $.create_schema,
          repeat($._create_statement),
        )),
      ),
    ),

    // ── CREATE TABLE with optional Synapse WITH (...) ────────────────────────
    create_table: $ => prec.left(
      seq(
        $.keyword_create,
        optional(choice($._temporary, $.keyword_external)),
        $.keyword_table,
        optional($._if_not_exists),
        $.object_reference,
        optional($.column_definitions),
        optional($.table_with_options),
        optional(seq($.keyword_as, $.create_query)),
      ),
    ),

    // ── Identifier — add [bracket] and #temp/##global forms ──────────────────
    // T-SQL allows [schema].[table].[column] with square-bracket quoting and
    // #temp / ##global temp table prefixes.
    identifier: $ => choice(
      $._identifier,
      $._double_quote_string,
      $._tsql_bracket_identifier,
      $._tsql_temp_identifier,
    ),

    _tsql_bracket_identifier: _ => token(/\[[^\]\n]*\]/),
    _tsql_temp_identifier: _ => token(/##?[A-Za-z_][0-9A-Za-z_]*/),

    // ── @variable syntax ──────────────────────────────────────────────────────
    // Matches both @@system_var and @local_var.
    // token(prec(1,...)) ensures the lexer prefers this over the '@' entry in
    // op_unary_other when followed by an identifier character.
    variable: _ => token(prec(1, /@@?[A-Za-z_][A-Za-z0-9_]*/)),

    // ── Expression — add @variable ────────────────────────────────────────────
    _expression: $ => prec(1,
      choice(
        $.literal,
        alias($._qualified_field, $.field),
        $.parameter,
        $.variable,
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
      ),
    ),

    // ── T-SQL keywords ───────────────────────────────────────────────────────
    // All defined with token(prec(1,...)) so the lexer prefers them over
    // the base _identifier pattern in ambiguous parse states.
    keyword_top:              _ => token(prec(1, make_keyword("top"))),
    keyword_output:           _ => token(prec(1, make_keyword("output"))),
    keyword_inserted:         _ => token(prec(1, make_keyword("inserted"))),
    keyword_deleted:          _ => token(prec(1, make_keyword("deleted"))),
    keyword_raiserror:        _ => token(prec(1, make_keyword("raiserror"))),
    keyword_throw:            _ => token(prec(1, make_keyword("throw"))),
    keyword_try:              _ => token(prec(1, make_keyword("try"))),
    keyword_catch:            _ => token(prec(1, make_keyword("catch"))),
    keyword_go:               _ => token(prec(1, make_keyword("go"))),
    keyword_bulk:             _ => token(prec(1, make_keyword("bulk"))),
    keyword_openrowset:       _ => token(prec(1, make_keyword("openrowset"))),
    keyword_nolock:           _ => token(prec(1, make_keyword("nolock"))),
    keyword_rowlock:          _ => token(prec(1, make_keyword("rowlock"))),
    keyword_updlock:          _ => token(prec(1, make_keyword("updlock"))),
    keyword_readpast:         _ => token(prec(1, make_keyword("readpast"))),
    keyword_tablock:          _ => token(prec(1, make_keyword("tablock"))),
    keyword_tablockx:         _ => token(prec(1, make_keyword("tablockx"))),
    keyword_datetime2:        _ => token(prec(1, make_keyword("datetime2"))),
    keyword_smalldatetime:    _ => token(prec(1, make_keyword("smalldatetime"))),
    keyword_money:            _ => token(prec(1, make_keyword("money"))),
    keyword_smallmoney:       _ => token(prec(1, make_keyword("smallmoney"))),
    keyword_uniqueidentifier: _ => token(prec(1, make_keyword("uniqueidentifier"))),
    keyword_pivot:            _ => token(prec(1, make_keyword("pivot"))),
    keyword_unpivot:          _ => token(prec(1, make_keyword("unpivot"))),
    keyword_apply:            _ => token(prec(1, make_keyword("apply"))),
    keyword_distribution:     _ => token(prec(1, make_keyword("distribution"))),
    keyword_round_robin:      _ => token(prec(1, make_keyword("round_robin"))),
    keyword_replicate:        _ => token(prec(1, make_keyword("replicate"))),
    keyword_shortcut:         _ => token(prec(1, make_keyword("shortcut"))),
    keyword_target:           _ => token(prec(1, make_keyword("target"))),
    keyword_print:            _ => token(prec(1, make_keyword("print"))),
    keyword_break:            _ => token(prec(1, make_keyword("break"))),
    keyword_log:              _ => token(prec(1, make_keyword("log"))),
    keyword_seterror:         _ => token(prec(1, make_keyword("seterror"))),
    // Note: keyword_continue is already in base (BigQuery); redefine here
    // with higher precedence so T-SQL parse states treat it as a keyword.
    keyword_continue:         _ => token(prec(1, make_keyword("continue"))),
    keyword_hash:             _ => token(prec(1, make_keyword("hash"))),
    keyword_columnstore:      _ => token(prec(1, make_keyword("columnstore"))),
    keyword_heap:             _ => token(prec(1, make_keyword("heap"))),
    keyword_file:             _ => token(prec(1, make_keyword("file"))),
    keyword_format:           _ => token(prec(1, make_keyword("format"))),
    keyword_clustered:        _ => token(prec(1, make_keyword("clustered"))),
    keyword_copy:             _ => token(prec(1, make_keyword("copy"))),
    keyword_while:            _ => token(prec(1, make_keyword("while"))),
    keyword_source:           _ => token(prec(1, make_keyword("source"))),
    keyword_declare:          _ => token(prec(1, make_keyword("declare"))),
    keyword_cursor:           _ => token(prec(1, make_keyword("cursor"))),
    keyword_open:             _ => token(prec(1, make_keyword("open"))),
    keyword_close:            _ => token(prec(1, make_keyword("close"))),
    keyword_deallocate:       _ => token(prec(1, make_keyword("deallocate"))),
    keyword_insensitive:      _ => token(prec(1, make_keyword("insensitive"))),
    keyword_scroll:           _ => token(prec(1, make_keyword("scroll"))),
    keyword_global:           _ => token(prec(1, make_keyword("global"))),
    keyword_forward_only:     _ => token(prec(1, make_keyword("forward_only"))),
    keyword_static:           _ => token(prec(1, make_keyword("static"))),
    keyword_keyset:           _ => token(prec(1, make_keyword("keyset"))),
    keyword_dynamic:          _ => token(prec(1, make_keyword("dynamic"))),
    keyword_fast_forward:     _ => token(prec(1, make_keyword("fast_forward"))),
    keyword_scroll_locks:     _ => token(prec(1, make_keyword("scroll_locks"))),
    keyword_optimistic:       _ => token(prec(1, make_keyword("optimistic"))),
    keyword_type_warning:     _ => token(prec(1, make_keyword("type_warning"))),
    keyword_absolute:         _ => token(prec(1, make_keyword("absolute"))),
    keyword_relative:         _ => token(prec(1, make_keyword("relative"))),
    keyword_prior:            _ => token(prec(1, make_keyword("prior"))),
    keyword_read_only:        _ => token(prec(1, /[Rr][Ee][Aa][Dd]_[Oo][Nn][Ll][Yy]/)),
    keyword_exec:             _ => token(prec(1, make_keyword("exec"))),
    keyword_execute:          _ => token(prec(1, make_keyword("execute"))),
    keyword_return:           _ => token(prec(1, make_keyword("return"))),
    keyword_waitfor:          _ => token(prec(1, make_keyword("waitfor"))),
    keyword_delay:            _ => token(prec(1, make_keyword("delay"))),
    keyword_timeout:          _ => token(prec(1, make_keyword("timeout"))),
    keyword_option:           _ => token(prec(1, make_keyword("option"))),
    keyword_synonym:          _ => token(prec(1, make_keyword("synonym"))),
    keyword_off:              _ => token(prec(1, make_keyword("off"))),
    keyword_login:            _ => token(prec(1, make_keyword("login"))),
    keyword_must_change:      _ => token(prec(1, /[Mm][Uu][Ss][Tt]_[Cc][Hh][Aa][Nn][Gg][Ee]/)),

    // T-SQL SET @variable = expression  (plus base transaction/constraint SET)
    set_statement: $ => prec.right(choice(
      seq($.keyword_set, $.variable, '=', $._expression),
      seq($.keyword_set, $.keyword_constraints, choice($.keyword_all, comma_list($.identifier, true)), choice($.keyword_deferred, $.keyword_immediate)),
      seq($.keyword_set, $.keyword_transaction, $._transaction_mode),
      seq($.keyword_set, $.keyword_transaction, $.keyword_snapshot, $._transaction_mode),
      seq($.keyword_set, $.keyword_session, $.keyword_characteristics, $.keyword_as, $.keyword_transaction, $._transaction_mode),
    )),

    ...tsql_select_rules,
    ...tsql_type_rules,
    ...tsql_hint_rules,
    ...tsql_dml_rules,
    ...tsql_procedural_rules,
    ...tsql_synapse_rules,
    ...tsql_security_rules,


    // Lexer-precedence guards: this dialect declares token(prec(1)) keywords
    // that are strict prefixes of the base keywords below. Explicit precedence
    // beats match length in the tree-sitter lexer, so without an equal-prec
    // re-declaration the longer keyword becomes unlexable in this dialect.
    keyword_logged: _ => token(prec(1, make_keyword("logged"))),
    keyword_offset: _ => token(prec(1, make_keyword("offset"))),
    keyword_returning: _ => token(prec(1, make_keyword("returning"))),
    keyword_returns: _ => token(prec(1, make_keyword("returns"))),

  },
});
