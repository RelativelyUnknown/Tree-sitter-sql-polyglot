#!/usr/bin/env python3
"""
Parser-size experiments for snowflake: each variant reverts one group of recent grammar changes in the
working tree (never committed) so the generated STATE_COUNT can be compared with the baseline.
Usage: python3 variants.py <variant>      (edits the checkout in place; fails loudly if a pattern is gone)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
G = ROOT / "snowflake"


def edit(path, pairs):
    p = G / path
    s = p.read_text()
    for old, new in pairs:
        if old not in s:
            sys.exit(f"variant pattern not found in {path}: {old[:70]!r}")
        s = s.replace(old, new, 1)
    p.write_text(s)


VARIANTS = {}


def variant(fn):
    VARIANTS[fn.__name__] = fn
    return fn


@variant
def baseline():
    pass


@variant
def no_pipe():
    edit("grammar.js", [("""      $._statement_body,
      // Pipe operator: stmt ->> stmt ->> ..., later statements read earlier results as $1, $2, ...
      repeat(seq($.pipe_operator, $._statement_body)),
""", """      $._statement_body,
""")])


@variant
def no_archive_where_conflict():
    edit("grammar.js", [("""    // CREATE TABLE ... FROM ARCHIVE OF t WHERE cond LIKE ...: the condition can continue with LIKE or the
    // next table clause (LIKE other_table) can start.
    [$.where, $.like_expression],
""", "")])
    edit("grammar/create_table.js", [("""    // FROM ARCHIVE OF src [AS alias] [WHERE cond]
    prec.right(seq($.keyword_from, $.keyword_archive, $.keyword_of, $.object_reference, optional(seq($.keyword_as, $.identifier)), optional($.where))),
""", "")])


@variant
def no_set_op_tail_and_from_prec():
    edit("grammar/query_extras.js", [
        ("  set_operation: $ => prec(-1, seq(", "  set_operation: $ => seq("),
        ("""    optional(choice(
      seq($.order_by, optional(choice($.limit, $.offset_fetch_clause))),
      $.limit,
      $.offset_fetch_clause,
    )),
  )),""", """  ),"""),
    ])
    edit("grammar.js", [
        ("    from: $ => prec.right(seq(", "    from: $ => seq("),
        ("""      optional($.limit),
      optional($.offset_fetch_clause),
    )),

    // Add PRIOR""", """      optional($.limit),
      optional($.offset_fetch_clause),
    ),

    // Add PRIOR"""),
    ])


@variant
def no_dmf():
    edit("grammar/alter_table.js", [("""    seq($.keyword_add, $.keyword_data, $.keyword_metric, $.keyword_function, $.object_reference, $.keyword_on, $._dmf_arguments, repeat($._dmf_option)),
    seq($.keyword_drop, $.keyword_data, $.keyword_metric, $.keyword_function, $.object_reference, $.keyword_on, $._dmf_arguments),
    seq($.keyword_modify, $.keyword_data, $.keyword_metric, $.keyword_function, $.object_reference, $.keyword_on, $._dmf_arguments, choice(
      $.keyword_suspend,
      $.keyword_resume,
      seq($.keyword_add, $.keyword_expectation, $.identifier, wrapped_in_parenthesis($._expression)),
      seq($.keyword_drop, $.keyword_expectation, $.identifier),
    )),
""", "")])


@variant
def no_resample():
    edit("grammar.js", [("""        optional($.tablesample),
        optional($.resample_clause),
      ),""", """        optional($.tablesample),
      ),""")])


@variant
def no_comma_column():
    edit("grammar/alter_table.js", [("""      seq($.column_alteration, repeat(choice(
        seq(',', $.column_alteration),
        // ", COLUMN d ..." is one token: after a SET TAG list a plain ',' would be ambiguous between the
        // next tag and the next column
        seq(alias($._comma_column, ','), alias($._column_alteration_body, $.column_alteration)),
      ))),""", """      seq($.column_alteration, repeat(seq(',', $.column_alteration))),""")])


@variant
def no_inline_check():
    edit("grammar/create_table.js", [
        ("""    seq($.keyword_default, $._expression),
    $.identity_clause,""", """    seq($.keyword_default, $._expression),
    seq($.keyword_check, wrapped_in_parenthesis($._expression)),
    $.identity_clause,"""),
        ("""    choice(
      seq($.keyword_check, wrapped_in_parenthesis($._expression)),
      $.keyword_unique,""", """    choice(
      $.keyword_unique,"""),
    ])


@variant
def no_integration_changes():
    edit("grammar.js", [
        ("      field('value', choice($.literal, $.object_reference, $.integration_option_group)),",
         "      field('value', choice($.literal, $.identifier, $.integration_option_group)),"),
        ("""        // values, or 'header' = 'value' pairs (WEBHOOK_HEADERS)
        comma_list(choice(seq($.literal, '=', $.literal), $.literal, $.identifier), true),""",
         """        comma_list(choice($.literal, $.identifier), true),"""),
    ])


@variant
def no_copy_changes():
    edit("grammar/copy.js", [
        ("choice($.stage_ref, $.literal, $.unquoted_url),", "choice($.stage_ref, $.literal),"),
        ("    $.literal,\n    $.unquoted_url,\n", "    $.literal,\n"),
    ])
    edit("grammar/files.js", [("field('source', choice($.stage_ref, seq('(', $._dml_read, ')'))),", "field('source', $.stage_ref),")])


@variant
def no_grant_changes():
    edit("grammar/grant.js", [
        ("""      seq($.keyword_inherited, $.keyword_caller, $._grant_privileges, $.keyword_on, $._inherited_target, $.keyword_to, $._grantee),
      seq($.keyword_service, $.keyword_role, $.service_role_reference, $.keyword_to, $._grantee),
""", ""),
        ("""      seq(optional($.keyword_all), $.keyword_inherited, $.keyword_caller, optional($.keyword_privileges), $.keyword_on, $._inherited_target, $.keyword_from, $._grantee),
      seq($.keyword_service, $.keyword_role, $.service_role_reference, $.keyword_from, $._grantee),
""", ""),
    ])


@variant
def no_partition_excluding():
    edit("grammar/query_extras.js", [("""    optional($.keyword_excluding),
    comma_list($._expression, true),""", """    comma_list($._expression, true),""")])


@variant
def no_join_first_last():
    edit("grammar/query_extras.js", [("""    // FIRST(u) | LAST(u): which side's row a join keeps when matches repeat
    optional(seq(choice($.keyword_first, $.keyword_last), wrapped_in_parenthesis($.identifier))),
""", "")])


@variant
def no_exec_immediate():
    edit("grammar/execute.js", [("""          $.parameter,
          $.bind_variable,
          $.identifier,
        ),""", """          $.parameter,
        ),""")])
    edit("grammar/scripting.js", [
        ("    wrapped_in_parenthesis($.execute_immediate_statement),\n  ),\n\n  // <var> :=", "  ),\n\n  // <var> :="),
        (", wrapped_in_parenthesis($.execute_immediate_statement))),", ")),"),
    ])


@variant
def no_unset_and_misc():
    edit("grammar/alter_objects.js", [("""  _unset_properties: $ => prec.right(repeat1(seq($._unset_name, optional(',')))),
  _unset_name: $ => choice($.identifier, $.keyword_warehouse, seq($.keyword_dcm, $.keyword_project)),""",
        """  _unset_properties: $ => comma_list($._unset_name, true),
  _unset_name: $ => choice($.identifier, $.keyword_warehouse),""")])


@variant
def no_alter_column_extras():
    edit("grammar/alter_table.js", [
        (", optional(seq($.keyword_rename, $.keyword_fields))),\n    field('type', $._type),", "),\n    field('type', $._type),"),
        ("    seq($.keyword_set, $.keyword_write, $.keyword_default, $._expression),\n", ""),
    ])


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    if name == "--list":
        print("\n".join(VARIANTS))
        sys.exit(0)
    if name not in VARIANTS:
        sys.exit(f"unknown variant {name!r}; known: {', '.join(VARIANTS)}")
    VARIANTS[name]()
    print(f"applied {name}")
