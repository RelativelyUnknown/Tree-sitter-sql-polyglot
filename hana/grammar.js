import base from '../grammar.js';
import { optional_parenthesis, paren_list, make_keyword } from '../grammar/helpers.js';
import { createStatementChoices } from '../grammar/statements/create.js';
import { fromClause } from '../grammar/statements/select.js';
import hana_statement_rules from './grammar/statements.js';
import hana_admin_rules from './grammar/admin.js';

// SAP HANA SQL — standalone lineage (SQLScript is HANA's own procedural
// language; the Sybase heritage is wire-level, not syntactic), extends the
// ANSI base. Adds COLUMN/ROW tables, UPSERT, WITH HINT, and SQLScript
// procedures with :param references.
export default grammar(base, {
  name: 'hana_sql',

  // conflicts do not propagate from the parent — base's list is copied
  // verbatim.
  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    // Local shift/reduce ambiguity shared with like_expression's optional
    // ESCAPE tail — kept in sync with the base grammar's conflicts.
    [$.between_expression, $.binary_expression, $.like_expression],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    // BEGIN … ; is ambiguous between a transaction block and a SQLScript
    // compound statement until END/COMMIT disambiguates (same as db2)
    [$.transaction, $.compound_statement],
    [$.transaction, $._sqlscript_statement],
  ],

  rules: {

    // Re-add non-ANSI CREATE forms this dialect supports over the strict ANSI base.
    _create_statement: $ => seq(choice(...createStatementChoices($, { materializedView: true, index: true }))),

    // LIMIT is supported (HANA has no ANSI OFFSET…FETCH FIRST paging).
    from: $ => fromClause($, { limit: true, offsetFetch: false }),

    // SELECT TOP n … row limiting.
    select: $ => seq(
      $.keyword_select,
      optional(seq($.keyword_top, alias($._integer, $.literal))),
      optional($.keyword_distinct),
      $.select_expression,
    ),

    keyword_top: _ => token(prec(1, make_keyword("top"))),

    // ALTER TABLE t ADD (col type, …): HANA requires the parenthesized list.
    add_column: $ => choice(
      seq(
        optional($.keyword_add),
        optional($.keyword_column),
        optional($._if_not_exists),
        $.column_definition,
        optional($.column_position),
      ),
      seq($.keyword_add, paren_list($.column_definition, true)),
    ),

    // base statement dispatch plus HANA statement forms; WITH HINT is wired
    // on query statements (its main HANA use) to avoid trailing-WITH
    // ambiguity with GRANT/type clauses
    statement: $ => seq(
      optional(seq(
        $.keyword_explain,
        optional($.keyword_analyze),
        optional($.keyword_verbose),
      )),
      choice(
        $._ddl_statement,
        $._dml_write,
        prec.right(seq(
          optional_parenthesis($._dml_read),
          optional($.with_hint_clause),
        )),
        $._transaction_statement,
        $.upsert_statement,
        $.compound_statement,
        $.declare_cursor_statement,
        // grammar/admin.js
        $.lock_table_statement,
        $.merge_delta_statement,
        $.load_unload_statement,
        $.refresh_object_statement,
        $.rename_object_statement,
        $.set_schema_statement,
        $.alter_system_statement,
        $.validate_statement,
        $.annotate_statement,
        $.cancel_async_call_statement,
        $.call_statement,
        $.connect_statement,
      ),
    ),

    // SAP HANA SQLScript cursor: DECLARE CURSOR name FOR <select> (ISO E121,
    // CURSOR-first order, unlike the ANSI name-first form).
    declare_cursor_statement: $ => seq(
      $.keyword_declare,
      $.keyword_cursor,
      field('name', $.identifier),
      $.keyword_for,
      $._dml_read,
    ),

    // base DDL dispatch plus COMMENT ON (HANA supports COMMENT ON TABLE/COLUMN/VIEW).
    // Full re-enumeration: an override replaces the base rule entirely.
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
      $.comment_statement,
      // grammar/admin.js
      $.hana_object_statement,
    ),

    // base parameter plus HANA :name SQLScript variable references
    parameter: _ => /\?|(\$[0-9]+)|(:[a-zA-Z_][a-zA-Z0-9_]*)/,

    // HANA-specific keywords (dialect-level per AGENTS.md)
    keyword_upsert:    _ => token(prec(1, make_keyword("upsert"))),

    // ── Keywords for the statements in grammar/admin.js ────────────────────
    // prec-1 rather than plain make_keyword: an extracted keyword loses to
    // the word token wherever an identifier is also legal, which at statement
    // start would leave every one of these statements unparsed.
    keyword_lock:        _ => token(prec(1, make_keyword("lock"))),
    keyword_mode:        _ => token(prec(1, make_keyword("mode"))),
    keyword_exclusive:   _ => token(prec(1, make_keyword("exclusive"))),
    keyword_share:       _ => token(prec(1, make_keyword("share"))),
    keyword_delta:       _ => token(prec(1, make_keyword("delta"))),
    keyword_load:        _ => token(prec(1, make_keyword("load"))),
    keyword_unload:      _ => token(prec(1, make_keyword("unload"))),
    keyword_statistics:  _ => token(prec(1, make_keyword("statistics"))),
    keyword_pse:         _ => token(prec(1, make_keyword("pse"))),
    keyword_vector:      _ => token(prec(1, make_keyword("vector"))),
    keyword_audit:       _ => token(prec(1, make_keyword("audit"))),
    keyword_policy:      _ => token(prec(1, make_keyword("policy"))),
    keyword_credential:  _ => token(prec(1, make_keyword("credential"))),
    keyword_certificate: _ => token(prec(1, make_keyword("certificate"))),
    keyword_synonym:     _ => token(prec(1, make_keyword("synonym"))),
    keyword_workload:    _ => token(prec(1, make_keyword("workload"))),
    keyword_class:       _ => token(prec(1, make_keyword("class"))),
    keyword_mapping:     _ => token(prec(1, make_keyword("mapping"))),
    keyword_usergroup:   _ => token(prec(1, make_keyword("usergroup"))),
    keyword_rolegroup:   _ => token(prec(1, make_keyword("rolegroup"))),
    keyword_jwt:         _ => token(prec(1, make_keyword("jwt"))),
    keyword_ldap:        _ => token(prec(1, make_keyword("ldap"))),
    keyword_saml:        _ => token(prec(1, make_keyword("saml"))),
    keyword_x509:        _ => token(prec(1, make_keyword("x509"))),
    keyword_provider:    _ => token(prec(1, make_keyword("provider"))),
    keyword_remote:      _ => token(prec(1, make_keyword("remote"))),
    keyword_source:      _ => token(prec(1, make_keyword("source"))),
    keyword_scheduler:   _ => token(prec(1, make_keyword("scheduler"))),
    keyword_job:         _ => token(prec(1, make_keyword("job"))),
    keyword_validate:    _ => token(prec(1, make_keyword("validate"))),
    keyword_annotate:    _ => token(prec(1, make_keyword("annotate"))),
    keyword_cancel:      _ => token(prec(1, make_keyword("cancel"))),
    keyword_async:       _ => token(prec(1, make_keyword("async"))),
    keyword_call:        _ => token(prec(1, make_keyword("call"))),
    keyword_connect:     _ => token(prec(1, make_keyword("connect"))),
    keyword_parameters:  _ => token(prec(1, make_keyword("parameters"))),
    keyword_unset:       _ => token(prec(1, make_keyword("unset"))),

    // Lexer-precedence guards for the longer keywords whose prefixes the
    // tokens above now claim.
    keyword_called:      _ => token(prec(1, make_keyword("called"))),
    keyword_connection:  _ => token(prec(1, make_keyword("connection"))),
    keyword_locked:      _ => token(prec(1, make_keyword("locked"))),
    keyword_locked:    _ => token(prec(1, make_keyword("locked"))),
    keyword_hint:      _ => token(prec(1, make_keyword("hint"))),
    keyword_sqlscript: _ => token(prec(1, make_keyword("sqlscript"))),
    keyword_invoker:   _ => token(prec(1, make_keyword("invoker"))),
    keyword_definer:   _ => token(prec(1, make_keyword("definer"))),
    keyword_reads:     _ => token(prec(1, make_keyword("reads"))),
    keyword_declare:   _ => token(prec(1, make_keyword("declare"))),
    keyword_cursor:    _ => token(prec(1, make_keyword("cursor"))),
    keyword_constant:  _ => token(prec(1, make_keyword("constant"))),
    keyword_inout:     _ => token(prec(1, make_keyword("inout"))),
    keyword_global:    _ => token(prec(1, make_keyword("global"))),
    keyword_sql:       _ => token(prec(1, make_keyword("sql"))),

    ...hana_statement_rules,
    ...hana_admin_rules,

  },
});
