import bigquery from '../bigquery/grammar.js';
import { make_keyword, optional_parenthesis, paren_list, wrapped_in_parenthesis } from '../grammar/helpers.js';
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
    // Local shift/reduce ambiguity shared with like_expression's optional
    // ESCAPE tail — kept in sync with the base grammar's conflicts.
    [$.between_expression, $.binary_expression, $.like_expression],
    [$.create_function],
    [$.list, $.grouping_set],
    [$.list, $.rollup_element],
    [$.list, $.cube_element],
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

    // base insert plus Spanner INSERT {OR UPDATE | OR IGNORE} upsert forms
    // (bigquery's _insert_statement wrapper with THEN RETURN is preserved)
    insert: $ => seq(
      $.keyword_insert,
      optional(seq($.keyword_or, choice($.keyword_update, $.keyword_ignore))),
      optional($.keyword_into),
      $.object_reference,
      optional(
        seq(
          $.keyword_as,
          field('alias', $.identifier),
        ),
      ),
      choice(
        $._insert_values,
        $._set_values,
      ),
    ),

    // base _select_statement plus Spanner FOR UPDATE (GoogleSQL locking hint)
    _select_statement: $ => optional_parenthesis(
      seq(
        $.select,
        optional(
          seq(
            $.keyword_into,
            $.select_expression,
          ),
        ),
        optional($.from),
        optional($.locking_clause),
      ),
    ),

    // FOR UPDATE — Spanner supports no OF/NOWAIT/SKIP LOCKED modifiers
    locking_clause: $ => seq(
      $.keyword_for,
      $.keyword_update,
    ),

    // Spanner-specific keywords (dialect-level per AGENTS.md)
    keyword_stored:        _ => token(prec(1, make_keyword("stored"))),
    keyword_sql:           _ => token(prec(1, make_keyword("sql"))),

    // Spanner GoogleSQL has no SQL-level FOR SYSTEM_TIME AS OF (stale reads are
    // an API concern), so drop the inherited clause that otherwise shadows the
    // FOR UPDATE locking clause.
    relation: $ => prec.right(seq(
      choice(
        $.subquery,
        $.invocation,
        $.object_reference,
        wrapped_in_parenthesis($.values),
        $.unnest,
      ),
      optional($.tablesample),
      optional(choice($.pivot_clause, $.unpivot_clause)),
      optional(seq(
        $._alias,
        optional(alias($._column_list, $.list)),
      )),
    )),

    // CREATE SEQUENCE name [OPTIONS (…)]
    create_sequence: $ => seq(
      $.keyword_create,
      $.keyword_sequence,
      optional($._if_not_exists),
      $.object_reference,
      optional($.options_clause),
    ),

    // Generated column: … AS (expr) STORED (re-enumerates base _column_constraint).
    _column_constraint: $ => prec.left(choice(
      choice($.keyword_null, $._not_null),
      seq(
        $.keyword_references,
        $.object_reference,
        paren_list($.identifier, true),
        repeat(seq(
          $.keyword_on,
          choice($.keyword_delete, $.keyword_update),
          choice(
            seq($.keyword_no, $.keyword_action),
            $.keyword_restrict,
            $.keyword_cascade,
            seq($.keyword_set, choice($.keyword_null, $.keyword_default), optional(paren_list($.identifier, true))),
          ),
        )),
      ),
      $._default_expression,
      $._primary_key,
      $.direction,
      $._column_comment,
      $._check_constraint,
      seq(
        optional(seq($.keyword_generated, $.keyword_always)),
        $.keyword_as,
        $._expression,
        optional($.keyword_stored),
      ),
      $.keyword_unique,
    )),

    // CREATE VIEW … SQL SECURITY {INVOKER|DEFINER} AS query (Spanner requires it).
    create_view: $ => prec.right(seq(
      $.keyword_create,
      optional($._or_replace),
      optional($.keyword_recursive),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional(paren_list($.identifier)),
      optional(seq($.keyword_sql, $.keyword_security, choice($.keyword_invoker, $.keyword_definer))),
      optional($.options_clause),
      $.keyword_as,
      $.create_query,
    )),

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
