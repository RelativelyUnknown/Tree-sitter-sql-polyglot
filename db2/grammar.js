import base from '../grammar.js';
import { optional_parenthesis, comma_list, make_keyword, wrapped_in_parenthesis } from '../grammar/helpers.js';
import db2_modules_rules from './grammar/modules.js';
import db2_data_control_rules from './grammar/data_control.js';
import db2_isolation_rules from './grammar/isolation.js';
import db2_special_register_rules from './grammar/special_registers.js';
import db2_diagnostics_rules from './grammar/diagnostics.js';
import db2_audit_rules from './grammar/audit.js';
import db2_procedural_rules from './grammar/procedural.js';

export default grammar(base, {
  name: 'db2_sql',

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
    [$.from],
    [$.transaction, $.compound_statement],
    [$.set_variable_statement, $.object_reference],
  ],

  rules: {

    // Extend _ddl_statement to add Db2-specific DDL
    _ddl_statement: $ => choice(
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $._rename_statement,
      $._merge_statement,
      $._refresh_statement,
      $.set_statement,
      $.transfer_ownership,
      $.signal_statement,
      $.resignal_statement,
      $.get_diagnostics_statement,
      $.grant_statement,
      $.revoke_statement,
      $.comment_statement,
      $.label_statement,
    ),

    // LABEL ON {TABLE ref | COLUMN ref.col} IS 'string' (comment sibling)
    label_statement: $ => seq(
      $.keyword_label,
      $.keyword_on,
      choice(
        seq(optional($.keyword_table), $.object_reference),
        seq($.keyword_column, alias($._qualified_field, $.object_reference)),
      ),
      $.keyword_is,
      alias($._literal_string, $.literal),
    ),

    keyword_label: _ => token(prec(1, make_keyword("label"))),

    // Extend statement to add Db2 SQL PL procedural constructs
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
        $.compound_statement,
        $.declare_statement,
        $.set_variable_statement,
        $.if_statement,
        $.while_statement,
        $.loop_statement,
        $.leave_statement,
        $.iterate_statement,
        $.declare_cursor_statement,
        $.open_cursor_statement,
        $.fetch_cursor_statement,
        $.close_cursor_statement,
        $.for_statement,
        $.prepare_statement,
        $.execute_statement,
      ),
    ),

    // Extend _create_statement to add Db2-specific CREATE statements
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
        $.create_wrapper,
        $.create_server,
        $.create_nickname,
        $.create_module,
        $.create_mask,
        $.create_permission,
        $.create_audit_policy,
        prec.left(seq(
          $.create_schema,
          repeat($._create_statement),
        )),
      ),
    ),

    // Extend _drop_statement to add DROP AUDIT POLICY
    _drop_statement: $ => seq(
      choice(
        $.drop_table,
        $.drop_view,
        $.drop_materialized_view,
        $.drop_index,
        $.drop_type,
        $.drop_schema,
        $.drop_database,
        $.drop_role,
        $.drop_sequence,
        $.drop_function,
        $.drop_procedure,
        $.drop_audit_policy,
      ),
    ),

    // Extend set_statement to add SET CURRENT SCHEMA = value
    set_statement: $ => seq(
      $.keyword_set,
      choice(
        seq($.keyword_constraints, choice($.keyword_all, comma_list($.identifier, true)), choice($.keyword_deferred, $.keyword_immediate)),
        seq($.keyword_transaction, $._transaction_mode),
        seq($.keyword_transaction, $.keyword_snapshot, $._transaction_mode),
        seq($.keyword_session, $.keyword_characteristics, $.keyword_as, $.keyword_transaction, $._transaction_mode),
        seq($.special_register, '=', $._expression),
        seq($.object_reference, '=', $._expression),
      ),
    ),

    // Db2: SELECT … FROM FINAL/NEW/OLD TABLE (INSERT/UPDATE/DELETE …)
    // (data-change-table-reference — Db2's mechanism for returning modified rows)
    relation: $ => prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
          $.data_change_table_reference,
        ),
        optional($.temporal_clause),
        optional($.tablesample),
        optional(
          seq(
            $._alias,
            optional(alias($._column_list, $.list)),
          ),
        ),
      ),
    ),

    // FOR {SYSTEM_TIME | BUSINESS_TIME} {AS OF t | BETWEEN t AND t | FROM t TO t}
    temporal_clause: $ => seq(
      $.keyword_for,
      choice($.keyword_system_time, $.keyword_business_time),
      choice(
        seq($.keyword_as, $.keyword_of, $._expression),
        seq($.keyword_between, $._expression, $.keyword_and, $._expression),
        seq($.keyword_from, $._expression, $.keyword_to, $._expression),
      ),
    ),

    keyword_system_time:   _ => token(prec(1, /[Ss][Yy][Ss][Tt][Ee][Mm]_[Tt][Ii][Mm][Ee]/)),
    keyword_business_time: _ => token(prec(1, /[Bb][Uu][Ss][Ii][Nn][Ee][Ss][Ss]_[Tt][Ii][Mm][Ee]/)),

    data_change_table_reference: $ => seq(
      choice(
        seq($.keyword_final, $.keyword_table),
        seq($.keyword_new, $.keyword_table),
        seq($.keyword_old, $.keyword_table),
      ),
      wrapped_in_parenthesis(
        choice(
          $.insert,
          $.update,
          seq($.delete, alias($._delete_from, $.from)),
        ),
      ),
    ),

    // Extend FROM to support OPTIMIZE FOR n ROWS and WITH isolation level at end
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
      optional($.window_clause),
      optional($.order_by),
      optional($.limit),
      optional($.offset_fetch_clause),
      optional($.optimize_for_clause),
      optional($.with_isolation_clause),
    ),

    // Db2-specific keywords — token(prec(1,...)) needed so lexer prefers
    // these over base _identifier when both are valid in the same state.
    keyword_prepare:    _ => token(prec(1, make_keyword("prepare"))),
    keyword_final:      _ => token(prec(1, make_keyword("final"))),
    keyword_wrapper:    _ => token(prec(1, make_keyword("wrapper"))),
    keyword_nickname:   _ => token(prec(1, make_keyword("nickname"))),
    keyword_module:     _ => token(prec(1, make_keyword("module"))),
    keyword_server:     _ => token(prec(1, make_keyword("server"))),
    keyword_mask:       _ => token(prec(1, make_keyword("mask"))),
    keyword_permission: _ => token(prec(1, make_keyword("permission"))),
    keyword_transfer:   _ => token(prec(1, make_keyword("transfer"))),
    keyword_ownership:  _ => token(prec(1, make_keyword("ownership"))),
    keyword_enforced:   _ => token(prec(1, make_keyword("enforced"))),
    keyword_ur:         _ => token(prec(1, make_keyword("ur"))),
    keyword_cs:         _ => token(prec(1, make_keyword("cs"))),
    keyword_rs:         _ => token(prec(1, make_keyword("rs"))),
    keyword_rr:         _ => token(prec(1, make_keyword("rr"))),
    keyword_preserve:   _ => token(prec(1, make_keyword("preserve"))),
    keyword_path:       _ => token(prec(1, make_keyword("path"))),
    keyword_audit:      _ => token(prec(1, make_keyword("audit"))),
    keyword_categories: _ => token(prec(1, make_keyword("categories"))),
    keyword_status:     _ => token(prec(1, make_keyword("status"))),
    keyword_both:       _ => token(prec(1, make_keyword("both"))),
    keyword_failure:    _ => token(prec(1, make_keyword("failure"))),
    keyword_success:    _ => token(prec(1, make_keyword("success"))),
    keyword_value:      _ => token(prec(1, make_keyword("value"))),
    // keyword_value's explicit prec(1) outranks the base keyword_values token
    // (precedence beats match length in the lexer), which broke INSERT … VALUES.
    // Re-declare keyword_values at the same precedence so longest-match wins.
    keyword_values:     _ => token(prec(1, make_keyword("values"))),
    keyword_do:         _ => token(prec(1, make_keyword("do"))),
    keyword_leave:      _ => token(prec(1, make_keyword("leave"))),
    keyword_iterate:    _ => token(prec(1, make_keyword("iterate"))),
    keyword_loop:       _ => token(prec(1, make_keyword("loop"))),
    keyword_elseif:     _ => token(prec(1, make_keyword("elseif"))),
    keyword_while:      _ => token(prec(1, make_keyword("while"))),
    keyword_declare:    _ => token(prec(1, make_keyword("declare"))),
    keyword_atomic:     _ => token(prec(1, make_keyword("atomic"))),
    keyword_signal:         _ => token(prec(1, make_keyword("signal"))),
    keyword_sqlstate:       _ => token(prec(1, make_keyword("sqlstate"))),
    keyword_resignal:       _ => token(prec(1, make_keyword("resignal"))),
    keyword_message_text:   _ => token(prec(1, make_keyword("message_text"))),
    keyword_get:            _ => token(prec(1, make_keyword("get"))),
    keyword_diagnostics:    _ => token(prec(1, make_keyword("diagnostics"))),
    keyword_access:         _ => token(prec(1, make_keyword("access"))),
    keyword_optimize:       _ => token(prec(1, make_keyword("optimize"))),
    keyword_options:        _ => token(prec(1, make_keyword("options"))),
    keyword_version:        _ => token(prec(1, make_keyword("version"))),
    keyword_policy:         _ => token(prec(1, make_keyword("policy"))),
    keyword_cursor:         _ => token(prec(1, make_keyword("cursor"))),
    keyword_open:           _ => token(prec(1, make_keyword("open"))),
    keyword_close:          _ => token(prec(1, make_keyword("close"))),
    keyword_hold:           _ => token(prec(1, make_keyword("hold"))),

    ...db2_modules_rules,
    ...db2_data_control_rules,
    ...db2_isolation_rules,
    ...db2_special_register_rules,
    ...db2_diagnostics_rules,
    ...db2_audit_rules,
    ...db2_procedural_rules,


    // Lexer-precedence guards: this dialect declares token(prec(1)) keywords
    // that are strict prefixes of the base keywords below. Explicit precedence
    // beats match length in the tree-sitter lexer, so without an equal-prec
    // re-declaration the longer keyword becomes unlexable in this dialect.
    keyword_double: _ => token(prec(1, make_keyword("double"))),

  },
});
