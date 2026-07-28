import base from '../grammar.js';
import { optional_parenthesis, paren_list, make_keyword } from '../grammar/helpers.js';
import { createStatementChoices } from '../grammar/statements/create.js';
import { fromClause } from '../grammar/statements/select.js';
import hana_statement_rules from './grammar/statements.js';

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
    [$.interval],
    // BEGIN … ; is ambiguous between a transaction block and a SQLScript
    // compound statement until END/COMMIT disambiguates (same as db2)
    [$.transaction, $.compound_statement],
    [$.transaction, $._sqlscript_statement],
  ],

  rules: {

    // Re-add non-ANSI CREATE forms this dialect supports over the strict ANSI base.
    _create_statement: $ => seq(choice(...createStatementChoices($, { materializedView: true, index: true }))),

    // LIMIT is supported: fromClause with limit re-adds it over the ANSI base.
    from: $ => fromClause($, { limit: true }),

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
    ),

    // base parameter plus HANA :name SQLScript variable references
    parameter: _ => /\?|(\$[0-9]+)|(:[a-zA-Z_][a-zA-Z0-9_]*)/,

    // HANA-specific keywords (dialect-level per AGENTS.md)
    keyword_upsert:    _ => token(prec(1, make_keyword("upsert"))),
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

  },
});
