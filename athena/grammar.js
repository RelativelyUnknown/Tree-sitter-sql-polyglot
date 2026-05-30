import trino from '../trino/grammar.js';
import { optional_parenthesis, make_keyword } from '../grammar/helpers.js';
import athena_statement_rules from './grammar/statements.js';

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
        $.prepare_statement,
        $.execute_statement,
        $.deallocate_statement,
        $.show_stats_statement,
        $.set_session_statement,
        $.reset_session_statement,
        $.unload_statement,
        $.msck_repair_statement,
      ),
    ),

    // Athena-specific keywords (not in Trino or base — defined here only)
    keyword_unload:      _ => token(prec(1, make_keyword("unload"))),
    keyword_msck:        _ => token(prec(1, make_keyword("msck"))),
    keyword_repair:      _ => token(prec(1, make_keyword("repair"))),
    keyword_sync:        _ => token(prec(1, make_keyword("sync"))),
    keyword_partitions:  _ => token(prec(1, make_keyword("partitions"))),

    ...athena_statement_rules,

  },
});
