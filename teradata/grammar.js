import base from '../grammar.js';
import { comma_list, optional_parenthesis, make_keyword } from '../grammar/helpers.js';
import { createStatementChoices } from '../grammar/statements/create.js';
import teradata_statement_rules from './grammar/statements.js';

// Teradata SQL — standalone lineage (since 1979), extends the ANSI base.
// Adds SEL/DEL abbreviations, SET/MULTISET/VOLATILE tables, PRIMARY INDEX,
// RANGE_N/CASE_N partitioning, COLLECT STATISTICS, CREATE MACRO, TOP n,
// and QUALIFY.
export default grammar(base, {
  name: 'teradata_sql',

  // conflicts do not propagate from the parent — base's list is copied
  // verbatim.
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
    // BLOCKCOMPRESSION=mode(…) option args vs the table's column list
    [$.table_option],
    // BEGIN … ; is ambiguous between a transaction block and a compound
    // statement until END/COMMIT disambiguates (same as db2/hana)
    [$.transaction, $.compound_statement],
  ],

  rules: {

    // Re-add non-ANSI CREATE forms this dialect supports over the strict ANSI base.
    _create_statement: $ => seq(choice(...createStatementChoices($, { index: true }), $.create_join_index)),

    // CREATE {JOIN | HASH} INDEX name AS SELECT … [PRIMARY INDEX (…)]
    create_join_index: $ => prec.right(seq(
      $.keyword_create,
      choice($.keyword_join, $.keyword_hash),
      $.keyword_index,
      $.object_reference,
      optional($._if_not_exists),
      $.keyword_as,
      $.create_query,
      optional($.primary_index),
    )),

    keyword_hash: _ => token(prec(1, make_keyword("hash"))),

    // base statement dispatch plus Teradata statement forms
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
        $.collect_statistics_statement,
        $.create_macro_statement,
        $.replace_view,
        $.set_query_band_statement,
        $.help_statement,
        $.compound_statement,
      ),
    ),

    // SEL / DEL abbreviations: the keyword tokens accept both spellings.
    // Declared at default precedence (like all base keywords) so longest
    // match keeps identifiers such as "selection" intact.
    keyword_select: _ => /[Ss][Ee][Ll]([Ee][Cc][Tt])?/,
    keyword_delete: _ => /[Dd][Ee][Ll]([Ee][Tt][Ee])?/,

    // SELECT [TOP n [PERCENT] [WITH TIES]] [DISTINCT] …
    select: $ => seq(
      $.keyword_select,
      optional(seq(
        $.keyword_top,
        $.literal,
        optional($.keyword_percent),
        optional(seq($.keyword_with, $.keyword_ties)),
      )),
      seq(
        optional($.keyword_distinct),
        $.select_expression,
      ),
    ),

    // base from plus QUALIFY (after HAVING, before window/order)
    from: $ => seq(
      $.keyword_from,
      optional(
        $.keyword_only,
      ),
      comma_list($.relation, true),
      optional($.sample_clause),
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

    // base DDL dispatch plus COMMENT ON (Teradata: COMMENT ON TABLE t IS '…').
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

    // base parameter plus Teradata :name macro/host-variable references
    parameter: _ => /\?|(\$[0-9]+)|(:[a-zA-Z_][a-zA-Z0-9_]*)/,

    // Teradata-specific keywords (dialect-level per AGENTS.md)
    keyword_multiset:   _ => token(prec(1, make_keyword("multiset"))),
    keyword_fallback:   _ => token(prec(1, make_keyword("fallback"))),
    keyword_journal:    _ => token(prec(1, make_keyword("journal"))),
    keyword_dual:       _ => token(prec(1, make_keyword("dual"))),
    keyword_macro:      _ => token(prec(1, make_keyword("macro"))),
    keyword_top:        _ => token(prec(1, make_keyword("top"))),
    keyword_global:     _ => token(prec(1, make_keyword("global"))),
    keyword_collect:    _ => token(prec(1, make_keyword("collect"))),
    keyword_summary:    _ => token(prec(1, make_keyword("summary"))),
    keyword_statistics: _ => token(prec(1, make_keyword("statistics"))),
    keyword_stats:      _ => token(prec(1, make_keyword("stats"))),
    keyword_qualify:    _ => token(prec(1, make_keyword("qualify"))),
    keyword_range_n:    _ => token(prec(1, make_keyword("range_n"))),
    keyword_case_n:     _ => token(prec(1, make_keyword("case_n"))),
    keyword_unknown:    _ => token(prec(1, make_keyword("unknown"))),
    keyword_locking:    _ => token(prec(1, make_keyword("locking"))),
    keyword_access:     _ => token(prec(1, make_keyword("access"))),
    keyword_exclusive:  _ => token(prec(1, make_keyword("exclusive"))),
    keyword_protection: _ => token(prec(1, make_keyword("protection"))),
    // keyword_log at prec(1) would shadow base keyword_logged (precedence
    // beats length); guard with an equal-precedence re-declaration.
    keyword_log:        _ => token(prec(1, make_keyword("log"))),
    keyword_logged:     _ => token(prec(1, make_keyword("logged"))),
    keyword_minimum:    _ => token(prec(1, make_keyword("minimum"))),
    keyword_maximum:    _ => token(prec(1, make_keyword("maximum"))),
    keyword_datablocksize:   _ => token(prec(1, make_keyword("datablocksize"))),
    keyword_mergeblockratio: _ => token(prec(1, make_keyword("mergeblockratio"))),
    keyword_freespace:  _ => token(prec(1, make_keyword("freespace"))),
    keyword_blockcompression: _ => token(prec(1, make_keyword("blockcompression"))),
    keyword_checksum:   _ => token(prec(1, make_keyword("checksum"))),
    keyword_sample:     _ => token(prec(1, make_keyword("sample"))),
    keyword_format:     _ => token(prec(1, make_keyword("format"))),
    keyword_help:       _ => token(prec(1, make_keyword("help"))),
    keyword_minus:      _ => token(prec(1, make_keyword("minus"))),
    keyword_preserve:   _ => token(prec(1, make_keyword("preserve"))),
    keyword_query_band: _ => token(prec(1, make_keyword("query_band"))),
    keyword_none:       _ => token(prec(1, make_keyword("none"))),
    keyword_columns:    _ => token(prec(1, make_keyword("columns"))),
    keyword_compress:   _ => token(prec(1, make_keyword("compress"))),
    keyword_casespecific: _ => token(prec(1, make_keyword("casespecific"))),
    keyword_uppercase:  _ => token(prec(1, make_keyword("uppercase"))),
    keyword_title:      _ => token(prec(1, make_keyword("title"))),
    keyword_share:      _ => token(prec(1, make_keyword("share"))),

    ...teradata_statement_rules,

  },
});
