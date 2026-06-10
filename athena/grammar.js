import trino from '../trino/grammar.js';
import { optional_parenthesis, make_keyword } from '../grammar/helpers.js';
import athena_statement_rules from './grammar/statements.js';
import athena_create_rules from './grammar/create.js';

export default grammar(trino, {
  name: 'athena_sql',

  conflicts: $ => [
    [$.object_reference, $._qualified_field],
    [$.field, $._qualified_field],
    [$._column, $._qualified_field],
    [$.object_reference],
    [$.between_expression, $.binary_expression],
    [$.from],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
    [$.interval],
    [$.time],
    [$.timestamp],
    [$.term],
    [$.values],
    [$.select_expression],
    [$.set_operation],
    [$.group_by],
    [$.order_target],
    [$.object_reference, $._qualified_field, $.lambda_expression],
    [$._qualified_field, $.lambda_expression],
    [$.lambda_expression],
    [$.binary_expression, $.lambda_expression],
    [$.row_type, $.invocation],
    [$.match_recognize_clause],
    [$.array_type, $.array],
    [$.set_session_statement, $.set_statement],
  ],

  rules: {

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
        $.unload_statement,
        $.msck_repair_statement,
        $.create_external_table,
        $.show_statement,
        $.describe_statement,
        $.analyze_statement,
        $.comment_on_statement,
        $.show_partitions_statement,
        $.show_create_statement,
      ),
    ),

    // Athena-specific keywords (not in Trino or base — defined here only)
    keyword_unload:       _ => token(prec(1, make_keyword("unload"))),
    keyword_msck:         _ => token(prec(1, make_keyword("msck"))),
    keyword_repair:       _ => token(prec(1, make_keyword("repair"))),
    keyword_sync:         _ => token(prec(1, make_keyword("sync"))),
    keyword_partitions:   _ => token(prec(1, make_keyword("partitions"))),
    keyword_partitioned:  _ => token(prec(1, make_keyword("partitioned"))),
    keyword_location:     _ => token(prec(1, make_keyword("location"))),
    keyword_serde:        _ => token(prec(1, make_keyword("serde"))),
    keyword_serdeproperties: _ => token(prec(1, make_keyword("serdeproperties"))),
    keyword_stored:       _ => token(prec(1, make_keyword("stored"))),
    keyword_tblproperties: _ => token(prec(1, make_keyword("tblproperties"))),
    keyword_textfile:     _ => token(prec(1, make_keyword("textfile"))),
    keyword_parquet:      _ => token(prec(1, make_keyword("parquet"))),
    keyword_orc:          _ => token(prec(1, make_keyword("orc"))),
    keyword_avro:         _ => token(prec(1, make_keyword("avro"))),
    keyword_rcfile:       _ => token(prec(1, make_keyword("rcfile"))),
    keyword_sequencefile: _ => token(prec(1, make_keyword("sequencefile"))),
    keyword_inputformat:  _ => token(prec(1, make_keyword("inputformat"))),
    keyword_delimited:    _ => token(prec(1, make_keyword("delimited"))),
    keyword_terminated:   _ => token(prec(1, make_keyword("terminated"))),
    keyword_fields:       _ => token(prec(1, make_keyword("fields"))),
    keyword_lines:        _ => token(prec(1, make_keyword("lines"))),

    ...athena_statement_rules,
    ...athena_create_rules,

  },
});
