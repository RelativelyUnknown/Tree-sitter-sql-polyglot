import bigquery from '../bigquery/grammar.js';
import { make_keyword } from '../grammar/helpers.js';
import spanner_ddl_rules from './grammar/ddl.js';

// Google Cloud Spanner — GoogleSQL, the same language family as BigQuery
// (shared INT64/STRING types, backtick identifiers, THEN RETURN on DML).
// Adds the Spanner-native schema surface: trailing PRIMARY KEY, INTERLEAVE
// IN PARENT, STORING/NULL_FILTERED indexes, CHANGE STREAMs, ROW DELETION
// POLICY.
export default grammar(bigquery, {
  name: 'spanner_sql',

  // conflicts do not propagate from the parent — bigquery's list is copied
  // verbatim, followed by Spanner-specific entries.
  conflicts: $ => [
    // bigquery conflicts (copied verbatim)
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
    [$.all_fields, $.all_fields_except],
    [$.qualify],
    [$.array_type, $.struct_type],
    [$.unnest],
  ],

  rules: {

    // bigquery _create_statement plus Spanner CHANGE STREAM
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
        prec.left(seq(
          $.create_schema,
          repeat($._create_statement),
        )),
        $.create_model,
        $.create_change_stream,
      ),
    ),

    // Spanner-specific keywords (dialect-level per AGENTS.md)
    keyword_interleave:    _ => token(prec(1, make_keyword("interleave"))),
    keyword_parent:        _ => token(prec(1, make_keyword("parent"))),
    keyword_null_filtered: _ => token(prec(1, make_keyword("null_filtered"))),
    keyword_storing:       _ => token(prec(1, make_keyword("storing"))),
    keyword_stream:        _ => token(prec(1, make_keyword("stream"))),
    keyword_deletion:      _ => token(prec(1, make_keyword("deletion"))),
    keyword_policy:        _ => token(prec(1, make_keyword("policy"))),
    keyword_older_than:    _ => token(prec(1, make_keyword("older_than"))),
    keyword_max:           _ => token(prec(1, make_keyword("max"))),

    ...spanner_ddl_rules,

  },
});
