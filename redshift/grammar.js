import base from '../grammar.js';
import { optional_parenthesis, make_keyword } from '../grammar/helpers.js';
import rs_create_rules from './grammar/create.js';
import rs_copy_rules   from './grammar/copy.js';
import rs_optimize_rules from './grammar/optimize.js';

export default grammar(base, {
  name: 'redshift_sql',

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
    [$.time],
    [$.timestamp],
    // CREATE EXTERNAL TABLE vs CREATE EXTERNAL SCHEMA both start with CREATE EXTERNAL
    [$.create_external_table, $.create_external_schema],
    // Optional CREATE EXTERNAL DATABASE tail at end of create_external_schema
    [$.create_external_schema],
  ],

  rules: {

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
        $.copy_statement,
        $.unload_statement,
      ),
    ),

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
      $._optimize_statement,
    ),

    // Override _expression to add approximate_count
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
        $.parenthesized_expression,
        $.trim_expression,
        $.approximate_count,
      ),
    ),

    // APPROXIMATE COUNT(DISTINCT col)
    approximate_count: $ => seq(
      $.keyword_approximate,
      $.invocation,
    ),

    // ── Redshift-specific keywords ───────────────────────────────────────────
    // COPY / UNLOAD
    keyword_copy:         _ => token(prec(1, make_keyword("copy"))),
    keyword_unload:       _ => token(prec(1, make_keyword("unload"))),
    keyword_iam_role:     _ => token(prec(1, make_keyword("iam_role"))),
    keyword_ignoreheader: _ => token(prec(1, make_keyword("ignoreheader"))),
    keyword_maxfilesize:  _ => token(prec(1, make_keyword("maxfilesize"))),
    keyword_gzip:         _ => token(prec(1, make_keyword("gzip"))),
    keyword_bzip2:        _ => token(prec(1, make_keyword("bzip2"))),
    keyword_lzop:         _ => token(prec(1, make_keyword("lzop"))),
    keyword_zstd:         _ => token(prec(1, make_keyword("zstd"))),
    keyword_format:       _ => token(prec(1, make_keyword("format"))),
    keyword_csv:          _ => token(prec(1, make_keyword("csv"))),
    keyword_delimiter:    _ => token(prec(1, make_keyword("delimiter"))),
    keyword_quote:        _ => token(prec(1, make_keyword("quote"))),
    keyword_parquet:      _ => token(prec(1, make_keyword("parquet"))),
    keyword_orc:          _ => token(prec(1, make_keyword("orc"))),
    keyword_avro:         _ => token(prec(1, make_keyword("avro"))),
    keyword_rcfile:       _ => token(prec(1, make_keyword("rcfile"))),
    keyword_compression:  _ => token(prec(1, make_keyword("compression"))),

    // VACUUM / ANALYZE COMPRESSION
    keyword_vacuum:       _ => token(prec(1, make_keyword("vacuum"))),
    keyword_reindex:      _ => token(prec(1, make_keyword("reindex"))),
    // keyword_sort prefix-check: keyword_sortkey also prec(1) — longest match wins
    keyword_sort:         _ => token(prec(1, make_keyword("sort"))),

    // Distribution / Sort keys
    // keyword_distkey prefix-check: keyword_diststyle shares 'dist' prefix,
    // both prec(1), different suffix 'k' vs 's' — no shadowing.
    keyword_distkey:      _ => token(prec(1, make_keyword("distkey"))),
    keyword_sortkey:      _ => token(prec(1, make_keyword("sortkey"))),
    keyword_diststyle:    _ => token(prec(1, make_keyword("diststyle"))),
    keyword_encode:       _ => token(prec(1, make_keyword("encode"))),
    keyword_compound:     _ => token(prec(1, make_keyword("compound"))),
    keyword_interleaved:  _ => token(prec(1, make_keyword("interleaved"))),
    keyword_even:         _ => token(prec(1, make_keyword("even"))),
    keyword_auto:         _ => token(prec(1, make_keyword("auto"))),

    // EXTERNAL SCHEMA / TABLE
    keyword_stored:       _ => token(prec(1, make_keyword("stored"))),
    keyword_location:     _ => token(prec(1, make_keyword("location"))),

    // APPROXIMATE COUNT
    keyword_approximate:  _ => token(prec(1, make_keyword("approximate"))),

    ...rs_create_rules,
    ...rs_copy_rules,
    ...rs_optimize_rules,

  },
});
