import { comma_list, paren_list, optional_parenthesis } from "../../grammar/helpers.js";

export default {

  // Spark 4.0: DECLARE [OR REPLACE] [VARIABLE] var_name [type] [DEFAULT | = expr]
  declare_variable_statement: $ => seq(
    $.keyword_declare,
    optional($._or_replace),
    optional($.keyword_variable),
    field('name', $.identifier),
    optional($._type),
    optional(
      seq(
        choice($.keyword_default, '='),
        $._expression,
      ),
    ),
  ),

  // Spark 4.0: SET VAR var_name = expr | SET VARIABLE var_name = expr
  set_variable_statement: $ => seq(
    $.keyword_set,
    choice($.keyword_var, $.keyword_variable),
    field('name', $.identifier),
    choice('=', $.keyword_to),
    $._expression,
  ),

  // Spark 4.0: LATERAL (subquery) as standalone relation in FROM clause
  // This is distinct from LATERAL JOIN and LATERAL VIEW
  lateral_subquery: $ => seq(
    $.keyword_lateral,
    optional_parenthesis(
      seq(
        $._dml_read,
        optional(seq($.keyword_as, field('alias', $.identifier))),
      ),
    ),
  ),

  // Spark 4.0: SELECT * EXCEPT (col1, col2) FROM t
  // Extends the base all_fields or select_expression
  select_except_clause: $ => seq(
    $.keyword_except,
    paren_list(field('column', $.identifier), true),
  ),

  // Spark 4.0: expr COLLATE collation_name
  collate_expression: $ => prec.left(5, seq(
    $._expression,
    $.keyword_collate,
    field('collation', $.identifier),
  )),

  // Spark 4.0: col:key1:key2  (semi-structured variant path access)
  variant_path_expression: $ => prec.left(10, seq(
    $._expression,
    ':',
    $.identifier,
  )),

};
