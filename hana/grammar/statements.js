import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // HANA: CREATE [COLUMN|ROW] [GLOBAL TEMPORARY|LOCAL TEMPORARY] TABLE
  create_table: $ => prec.right(
    seq(
      $.keyword_create,
      optional(choice($.keyword_column, $.keyword_row)),
      optional(choice(
        seq($.keyword_global, $.keyword_temporary),
        seq($.keyword_local, $.keyword_temporary),
        $._temporary,
      )),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      optional($.column_definitions),
      optional(seq($.keyword_as, $.create_query)),
    ),
  ),

  // HANA: UPSERT t [(cols)] VALUES (…) [WITH PRIMARY KEY | WHERE cond]
  //       UPSERT t SELECT …
  upsert_statement: $ => prec.right(seq(
    $.keyword_upsert,
    $.object_reference,
    choice(
      seq(
        optional(alias($._column_list, $.list)),
        $.keyword_values,
        paren_list($._expression, true),
        optional(choice(
          seq($.keyword_with, $.keyword_primary, $.keyword_key),
          $.where,
        )),
      ),
      $._dml_read,
    ),
  )),

  // HANA: statement-level WITH HINT (HINT_NAME(args), …)
  with_hint_clause: $ => seq(
    $.keyword_with,
    $.keyword_hint,
    paren_list(choice($.invocation, $.identifier), true),
  ),

  // HANA: CREATE [OR REPLACE] PROCEDURE p (params) [LANGUAGE SQLSCRIPT]
  //   [SQL SECURITY INVOKER|DEFINER] [READS SQL DATA] AS BEGIN … END
  create_procedure: $ => seq(
    $.keyword_create,
    optional(seq($.keyword_or, $.keyword_replace)),
    $.keyword_procedure,
    $.object_reference,
    optional(paren_list($.procedure_parameter, false)),
    optional(seq($.keyword_language, $.keyword_sqlscript)),
    optional(seq($.keyword_sql, $.keyword_security, choice($.keyword_invoker, $.keyword_definer))),
    optional(seq($.keyword_reads, $.keyword_sql, $.keyword_data)),
    $.keyword_as,
    $.compound_statement,
  ),

  procedure_parameter: $ => seq(
    optional(choice($.keyword_in, $.keyword_out, $.keyword_inout)),
    field('name', $.identifier),
    field('type', $._type),
  ),

  // SQLScript block: BEGIN [declares] statements END
  // (shared node name: db2 and others also expose compound_statement)
  compound_statement: $ => seq(
    $.keyword_begin,
    repeat(choice(
      seq($.declare_statement, ';'),
      seq($.assignment_statement, ';'),
      seq($.statement, ';'),
    )),
    $.keyword_end,
  ),

  // DECLARE v [CONSTANT] TYPE [:= expr | DEFAULT expr]
  declare_statement: $ => seq(
    $.keyword_declare,
    field('name', $.identifier),
    optional($.keyword_constant),
    field('type', $._type),
    optional(choice(
      seq(':=', $._expression),
      seq($.keyword_default, $._expression),
    )),
  ),

  // v := expr  (SQLScript scalar assignment)
  assignment_statement: $ => seq(
    field('name', $.identifier),
    ':=',
    $._expression,
  ),

};
