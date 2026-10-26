import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';
import create_function_rules from '../../grammar/statements/create-function.js';
import create_procedure_rules from '../../grammar/statements/create-procedure.js';

// PL/SQL: blocks, declarations, subprograms, control flow and CREATE FUNCTION / PROCEDURE
// (Oracle PL/SQL Language Reference 26ai). Statements inside a body end with ';' and may carry
// <<labels>>.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_bulk_exceptions: _ => kw('bulk_exceptions'),
  keyword_bulk_rowcount:  _ => kw('bulk_rowcount'),
  keyword_found:          _ => kw('found'),
  keyword_isopen:         _ => kw('isopen'),
  keyword_notfound:       _ => kw('notfound'),
  keyword_rowcount:       _ => kw('rowcount'),
  keyword_sequence: _ => kw('sequence'),
  keyword_definer:        _ => kw('definer'),
  keyword_aggregate:      _ => kw('aggregate'),
  keyword_accessible:     _ => kw('accessible'),
  keyword_array:          _ => kw('array'),
  keyword_constant:       _ => kw('constant'),
  keyword_deterministic:  _ => kw('deterministic'),
  keyword_goto:           _ => kw('goto'),
  keyword_java:           _ => kw('java'),
  keyword_javascript:     _ => kw('javascript'),
  keyword_language:       _ => kw('language'),
  keyword_library:        _ => kw('library'),
  keyword_mle:            _ => kw('mle'),
  keyword_module:         _ => kw('module'),
  keyword_nocopy:         _ => kw('nocopy'),
  keyword_parallel_enable: _ => kw('parallel_enable'),
  keyword_pipelined:      _ => kw('pipelined'),
  keyword_polymorphic:    _ => kw('polymorphic'),
  keyword_raise:          _ => kw('raise'),
  keyword_record:         _ => kw('record'),
  keyword_relies_on:      _ => kw('relies_on'),
  keyword_shard_enable:   _ => kw('shard_enable'),
  keyword_signature:      _ => kw('signature'),
  keyword_sql_macro:      _ => kw('sql_macro'),
  keyword_subtype:        _ => kw('subtype'),
  keyword_pairs:          _ => kw('pairs'),
  keyword_repeat:         _ => kw('repeat'),
  keyword_varying:        _ => kw('varying'),
  keyword_mutable: _ => kw('mutable'),

  // ── Labels and statement bodies ────────────────────────────────────────

  statement_label: $ => seq('<<', $.identifier, '>>'),

  // statement ';' inside a PL/SQL body; procedure calls are only statements here, not at top level
  _plsql_stmt: $ => choice(
    seq($.statement, ';'),
    seq(repeat($.statement_label), $.procedure_call_statement, ';'),
  ),

  // name | name(args), where an argument is positional or name => value
  procedure_call_statement: $ => choice(
    $.invocation,
    $.object_reference,
  ),

  // ── Blocks ─────────────────────────────────────────────────────────────

  compound_statement: $ => seq(
    optional(seq(
      $.keyword_declare,
      repeat($._declaration),
    )),
    $.keyword_begin,
    repeat($._plsql_stmt),
    optional(seq(
      $.keyword_exception,
      repeat1($.exception_handler),
    )),
    $.keyword_end,
    optional(field('label', $.identifier)),
  ),

  // WHEN name [OR name …] THEN statements
  exception_handler: $ => seq(
    $.keyword_when,
    field('exception_name', choice($.object_reference, $.keyword_others)),
    repeat(seq($.keyword_or, field('exception_name', choice($.object_reference, $.keyword_others)))),
    $.keyword_then,
    repeat1($._plsql_stmt),
  ),

  // ── Declarations ───────────────────────────────────────────────────────

  _declaration: $ => choice(
    $.variable_declaration,
    $.type_declaration,
    $.subtype_declaration,
    $.cursor_declaration,
    $.exception_declaration,
    $.pragma_declaration,
    $.subprogram_declaration,
    $.subprogram_definition,
  ),

  // name [CONSTANT] type [NOT NULL] [{:= | DEFAULT} expr];
  variable_declaration: $ => seq(
    field('name', $.identifier),
    optional($.keyword_constant),
    $._plsql_type,
    optional(seq($.keyword_not, $.keyword_null)),
    optional(seq(choice($.keyword_default, ':='), $._expression)),
    ';',
  ),

  // A type: a SQL type, name%TYPE, name%ROWTYPE
  _plsql_type: $ => choice(
    $._type,
    seq(field('base', $.object_reference), $.type_attribute),
    seq(field('base', $.object_reference), $.rowtype_attribute),
  ),

  // TYPE name IS {RECORD (…) | TABLE OF … [INDEX BY …] | VARRAY(n) OF … | REF CURSOR [RETURN …]};
  type_declaration: $ => seq(
    $.keyword_type,
    field('name', $.identifier),
    $.keyword_is,
    choice(
      seq($.keyword_record, paren_list($.record_field, true)),
      seq(
        $.keyword_table, $.keyword_of, $._plsql_type,
        optional(seq($.keyword_not, $.keyword_null)),
        optional(seq($.keyword_index, $.keyword_by, $._plsql_type)),
      ),
      seq(
        choice($.keyword_varray, seq($.keyword_varying, $.keyword_array)),
        wrapped_in_parenthesis(alias($._natural_number, $.literal)),
        $.keyword_of, $._plsql_type,
        optional(seq($.keyword_not, $.keyword_null)),
      ),
      seq($.keyword_ref, $.keyword_cursor, optional(seq($.keyword_return, $._plsql_type))),
    ),
    ';',
  ),

  record_field: $ => seq(
    field('name', $.identifier),
    $._plsql_type,
    optional(seq($.keyword_not, $.keyword_null)),
    optional(seq(choice($.keyword_default, ':='), $._expression)),
  ),

  // SUBTYPE name IS type [RANGE lo .. hi] [NOT NULL];
  subtype_declaration: $ => seq(
    $.keyword_subtype,
    field('name', $.identifier),
    $.keyword_is,
    $._plsql_type,
    optional(seq($.keyword_range, $._expression, '..', $._expression)),
    optional(seq($.keyword_not, $.keyword_null)),
    ';',
  ),

  // CURSOR name [(params)] [RETURN type] [IS select];
  cursor_declaration: $ => seq(
    $.keyword_cursor,
    field('name', $.identifier),
    optional(paren_list($.cursor_param, true)),
    optional(seq($.keyword_return, $._plsql_type)),
    optional(seq($.keyword_is, $._dml_read)),
    ';',
  ),

  cursor_param: $ => seq(
    field('name', $.identifier),
    optional($.keyword_in),
    field('type', $._plsql_type),
    optional(seq(choice($.keyword_default, ':='), $._expression)),
  ),

  // name EXCEPTION;
  exception_declaration: $ => seq(
    field('name', $.identifier),
    $.keyword_exception,
    ';',
  ),

  // PRAGMA name [(args)];
  pragma_declaration: $ => seq(
    $.keyword_pragma,
    $.identifier,
    optional(paren_list($._expression, true)),
    ';',
  ),

  // ── Subprograms ────────────────────────────────────────────────────────

  plsql_parameter: $ => seq(
    field('name', $.identifier),
    optional(choice(
      $.keyword_in,
      $.keyword_out,
      seq($.keyword_in, $.keyword_out),
    )),
    optional($.keyword_nocopy),
    choice($._plsql_type, $.keyword_table, $.keyword_columns),
    optional(seq(choice($.keyword_default, ':='), $._expression)),
  ),

  _subprogram_heading: $ => choice(
    seq(
      $.keyword_procedure,
      field('name', $.identifier),
      optional(paren_list($.plsql_parameter, true)),
    ),
    seq(
      $.keyword_function,
      field('name', $.identifier),
      optional(paren_list($.plsql_parameter, true)),
      $.keyword_return,
      choice($._plsql_type, $.keyword_table),
    ),
  ),

  // AUTHID, DETERMINISTIC, PIPELINED, PARALLEL_ENABLE, RESULT_CACHE, ACCESSIBLE BY, SQL_MACRO, …
  _subprogram_property: $ => choice(
    seq($.keyword_authid, choice($.keyword_current_user, $.keyword_definer)),
    $.keyword_deterministic,
    seq($.keyword_pipelined, optional(seq($.keyword_row, $.keyword_polymorphic))),
    seq(
      $.keyword_parallel_enable,
      optional(wrapped_in_parenthesis(seq(
        $.keyword_partition, $.identifier, $.keyword_by,
        choice(
          $.keyword_any,
          seq(choice($.keyword_hash, $.keyword_range, $.keyword_list), paren_list($.identifier, true)),
          $.identifier,
        ),
        optional(seq(choice($.keyword_order, $.keyword_cluster), $.identifier, $.keyword_by, paren_list($.identifier, true))),
      ))),
    ),
    seq($.keyword_result_cache, optional(seq($.keyword_relies_on, paren_list($.object_reference, true)))),
    seq($.keyword_accessible, $.keyword_by, paren_list(
      seq(optional(choice($.keyword_function, $.keyword_procedure, $.keyword_package, $.keyword_trigger, $.keyword_type)), $.object_reference),
      true,
    )),
    seq($.keyword_default, $.keyword_collation, $.identifier),
    $.keyword_shard_enable,
    seq($.keyword_sql_macro, optional(wrapped_in_parenthesis(choice(
      $.identifier,
      seq($.keyword_type, '=>', choice($.keyword_table, $.identifier)),
    )))),
  ),

  // IS | AS declarations BEGIN statements [EXCEPTION handlers] END [name]
  _subprogram_body: $ => seq(
    repeat($._declaration),
    $.keyword_begin,
    repeat($._plsql_stmt),
    optional(seq(
      $.keyword_exception,
      repeat1($.exception_handler),
    )),
    $.keyword_end,
    optional(field('end_name', $.identifier)),
  ),

  // Call specification: LANGUAGE C / JAVA, EXTERNAL, MLE MODULE / inline MLE
  call_specification: $ => choice(
    seq(
      $.keyword_language, $.identifier,
      repeat(choice(
        seq($.keyword_name, choice($.identifier, alias($._literal_string, $.literal))),
        seq($.keyword_library, $.identifier),
        seq($.keyword_with, $.keyword_context),
        seq($.keyword_parameters, paren_list($.call_spec_parameter, true)),
      )),
    ),
    seq($.keyword_external, repeat1(choice(
      seq($.keyword_library, $.identifier),
      seq($.keyword_name, choice($.identifier, alias($._literal_string, $.literal))),
      seq($.keyword_language, $.identifier),
      seq($.keyword_parameters, paren_list($.call_spec_parameter, true)),
    ))),
    seq($.keyword_mle, $.keyword_module, $.identifier, optional(seq($.keyword_signature, alias($._literal_string, $.literal)))),
    seq($.keyword_mle, $.keyword_language, $.keyword_javascript, $.mle_source),
  ),

  call_spec_parameter: $ => seq(
    choice($.identifier, $.keyword_return, $.keyword_context),
    optional(seq($.keyword_by, $.keyword_reference)),
    optional($._type),
  ),

  // Inline JavaScript between {{ and }}
  mle_source: _ => token(/\{\{([^}]|\}[^}])*\}\}/),

  // forward declaration: FUNCTION f (…) RETURN t;
  subprogram_declaration: $ => seq(
    $._subprogram_heading,
    repeat($._subprogram_property),
    ';',
  ),

  // FUNCTION f (…) RETURN t IS … BEGIN … END [f];
  subprogram_definition: $ => seq(
    $._subprogram_heading,
    repeat($._subprogram_property),
    choice($.keyword_is, $.keyword_as),
    choice($._subprogram_body, $.call_specification),
    ';',
  ),

  // ── CREATE FUNCTION / PROCEDURE ────────────────────────────────────────

  // The ISO / PostgreSQL-style forms (RETURNS, BEGIN ATOMIC, dollar-quoted bodies) this dialect
  // inherited stay accepted next to the Oracle form.
  create_function: $ => choice($._oracle_create_function, $._ansi_create_function),
  create_procedure: $ => choice($._oracle_create_procedure, $._ansi_create_procedure),
  _ansi_create_function: create_function_rules.create_function,
  _ansi_create_procedure: create_procedure_rules.create_procedure,

  _oracle_create_function: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional(choice($.keyword_editionable, $.keyword_noneditionable)),
    $.keyword_function,
    optional($._if_not_exists),
    field('name', $.object_reference),
    optional($.sharing_clause),
    optional(paren_list($.plsql_parameter, true)),
    $.keyword_return,
    choice($._plsql_type, $.keyword_table),
    repeat($._subprogram_property),
    choice(
      seq(choice($.keyword_is, $.keyword_as), choice($._subprogram_body, $.call_specification)),
      // AGGREGATE USING impl | PIPELINED [ROW POLYMORPHIC] USING impl (PIPELINED is a property)
      seq(optional($.keyword_aggregate), $.keyword_using, $.object_reference),
    ),
  ),

  _oracle_create_procedure: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional(choice($.keyword_editionable, $.keyword_noneditionable)),
    $.keyword_procedure,
    optional($._if_not_exists),
    field('name', $.object_reference),
    optional($.sharing_clause),
    optional(paren_list($.plsql_parameter, true)),
    repeat($._subprogram_property),
    choice($.keyword_is, $.keyword_as),
    choice($._subprogram_body, $.call_specification),
  ),

  // ── Control flow ───────────────────────────────────────────────────────

  if_statement: $ => seq(
    $.keyword_if,
    field('condition', $._expression),
    $.keyword_then,
    repeat($._plsql_stmt),
    repeat(seq(
      $.keyword_elsif,
      field('condition', $._expression),
      $.keyword_then,
      repeat($._plsql_stmt),
    )),
    optional(seq(
      $.keyword_else,
      repeat($._plsql_stmt),
    )),
    $.keyword_end,
    $.keyword_if,
  ),

  while_statement: $ => seq(
    $.keyword_while,
    field('condition', $._expression),
    $.keyword_loop,
    repeat($._plsql_stmt),
    $.keyword_end,
    $.keyword_loop,
    optional(field('label', $.identifier)),
  ),

  loop_statement: $ => seq(
    $.keyword_loop,
    repeat($._plsql_stmt),
    $.keyword_end,
    $.keyword_loop,
    optional(field('label', $.identifier)),
  ),

  // CASE [selector] WHEN … THEN … [ELSE …] END CASE [label]
  case_statement: $ => seq(
    $.keyword_case,
    optional(field('selector', $._expression)),
    repeat1(seq(
      $.keyword_when,
      comma_list($._case_when_value, true),
      $.keyword_then,
      repeat($._plsql_stmt),
    )),
    optional(seq($.keyword_else, repeat($._plsql_stmt))),
    $.keyword_end,
    $.keyword_case,
    optional(field('label', $.identifier)),
  ),

  // a value, or a dangling predicate (< 0, > 100, IS NULL)
  _case_when_value: $ => choice(
    $._expression,
    seq(choice('<', '>', '<=', '>=', '=', '<>', '!=', '^='), $._expression),
    seq($.keyword_is, optional($.keyword_not), $.keyword_null),
  ),

  // EXIT [label] [WHEN cond] / CONTINUE [label] [WHEN cond]
  exit_statement: $ => seq(
    $.keyword_exit,
    optional(field('label', $.identifier)),
    optional(seq($.keyword_when, field('condition', $._expression))),
  ),

  continue_statement: $ => seq(
    $.keyword_continue,
    optional(field('label', $.identifier)),
    optional(seq($.keyword_when, field('condition', $._expression))),
  ),

  // RAISE [exception]
  raise_statement: $ => seq(
    $.keyword_raise,
    optional($.object_reference),
  ),

  goto_statement: $ => seq($.keyword_goto, $.identifier),

  // RETURN [expr]; RETURN(v) also parses as a parenthesised expression
  return_statement: $ => seq(
    $.keyword_return,
    optional($._expression),
  ),


  // FOR iterand IN control [, control …] LOOP … END LOOP [label]
  //   control: [REVERSE] lo .. hi [BY step] | expr | REPEAT expr [WHILE c] | INDICES|VALUES|PAIRS OF source
  //   with optional WHILE / WHEN filters; expr also covers a cursor, cursor(args) and (SELECT …)
  for_statement: $ => seq(
    $.keyword_for,
    $.for_iterand,
    $.keyword_in,
    comma_list($.for_control, true),
    $.keyword_loop,
    repeat($._plsql_stmt),
    $.keyword_end,
    $.keyword_loop,
    optional(field('label', $.identifier)),
  ),

  for_iterand: $ => seq(
    field('name', $.identifier),
    optional(seq(',', field('name', $.identifier))),
    optional($.keyword_mutable),
    optional($._plsql_type),
  ),

  for_control: $ => seq(
    choice(
      seq(
        optional($.keyword_reverse),
        field('lower', $._expression), '..', field('upper', $._expression),
        optional(seq($.keyword_by, field('step', $._expression))),
      ),
      seq($.keyword_repeat, $._expression),
      seq(
        choice($.keyword_indices, $.keyword_values, $.keyword_pairs), $.keyword_of,
        choice(
          $.object_reference,
          $.invocation,
          $.subquery,
          wrapped_in_parenthesis($.execute_immediate_statement),
        ),
        optional(prec.left('between', seq($.keyword_between, $._expression, $.keyword_and, $._expression))),
      ),
      $._expression,
    ),
    optional(seq($.keyword_while, field('while', $._expression))),
    optional(seq($.keyword_when, field('when', $._expression))),
  ),


  // ── Cursors, dynamic SQL, bulk operations ──────────────────────────────

  _cursor_target: $ => choice($.identifier, $.parameter),

  // OPEN c [(args)] | OPEN cv FOR {select | 'dynamic sql'} [USING …]
  cursor_open_statement: $ => seq(
    $.keyword_open,
    field('name', $._cursor_target),
    choice(
      optional(paren_list(choice($.named_argument, $._expression), true)),
      seq(
        $.keyword_for,
        choice($._dml_read, $._expression),
        optional($.using_clause),
      ),
    ),
  ),

  // USING [IN | OUT | IN OUT] expr, …
  using_clause: $ => seq(
    $.keyword_using,
    comma_list(seq(
      optional(choice($.keyword_in, $.keyword_out, seq($.keyword_in, $.keyword_out))),
      $._expression,
    ), true),
  ),

  _into_target: $ => choice(alias($._qualified_field, $.field), $.parameter),

  // FETCH c INTO a, b | FETCH c BULK COLLECT INTO coll [LIMIT n]
  cursor_fetch_statement: $ => seq(
    $.keyword_fetch,
    field('name', $._cursor_target),
    choice(
      seq($.keyword_into, comma_list($._into_target, true)),
      seq(
        $.keyword_bulk, $.keyword_collect, $.keyword_into,
        comma_list($._into_target, true),
        optional(seq($.keyword_limit, $._expression)),
      ),
    ),
  ),

  cursor_close_statement: $ => seq(
    $.keyword_close,
    field('name', $._cursor_target),
  ),

  // EXECUTE IMMEDIATE sql [[BULK COLLECT] INTO …] [USING …] [{RETURNING | RETURN} [BULK COLLECT] INTO …]
  execute_immediate_statement: $ => seq(
    $.keyword_execute,
    $.keyword_immediate,
    field('sql', $._expression),
    optional(seq(
      optional(seq($.keyword_bulk, $.keyword_collect)),
      $.keyword_into,
      comma_list($._into_target, true),
    )),
    optional($.using_clause),
    optional(seq(
      choice($.keyword_returning, $.keyword_return),
      optional(seq($.keyword_bulk, $.keyword_collect)),
      $.keyword_into,
      comma_list($._into_target, true),
    )),
  ),

  // FORALL i IN {lo .. hi | INDICES OF c [BETWEEN a AND b] | VALUES OF c} [SAVE EXCEPTIONS] dml
  forall_statement: $ => seq(
    $.keyword_forall,
    field('index', $.identifier),
    $.keyword_in,
    choice(
      seq(
        field('lower', $._expression),
        '..',
        field('upper', $._expression),
      ),
      seq(
        choice($.keyword_indices, $.keyword_values), $.keyword_of,
        field('collection', choice($.object_reference, $.invocation)),
        optional(prec.left('between', seq($.keyword_between, $._expression, $.keyword_and, $._expression))),
      ),
    ),
    optional(seq($.keyword_save, $.keyword_exceptions)),
    choice(
      $.insert,
      $._update_statement,
      $._delete_statement,
      $._merge_statement,
      $.execute_immediate_statement,
    ),
  ),

  // cursor%FOUND, SQL%ROWCOUNT, SQL%BULK_ROWCOUNT(i), SQL%BULK_EXCEPTIONS(i).ERROR_CODE
  cursor_attribute: $ => prec.left(seq(
    field('cursor', choice(alias($._qualified_field, $.field), $.parameter)),
    '%',
    choice(
      $.keyword_found,
      $.keyword_notfound,
      $.keyword_isopen,
      $.keyword_rowcount,
      seq($.keyword_bulk_rowcount, wrapped_in_parenthesis($._expression)),
      seq(
        $.keyword_bulk_exceptions,
        optional(wrapped_in_parenthesis($._expression)),
        optional(seq('.', $.identifier)),
      ),
    ),
  )),

  // Function call or qualified expression: arguments may be positional, name => value, or the
  // constructor choices of a qualified expression (t(1 => 'one'), t(FOR i IN 1 .. 5 => i * 2),
  // r_t(1, OTHERS => 0)).
  invocation: $ => prec(1,
    seq(
      $.object_reference,
      choice(
        // default invocation
        paren_list(
          seq(
            optional($.keyword_distinct),
            field(
              'parameter',
              choice($.term, $.named_argument, $._qualified_choice),
            ),
            optional($.order_by)
          )
        ),
        // https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html#function_extract
        paren_list(
          seq(
            field(
              'unit',
              $.object_reference,
            ),
            $.keyword_from,
            $.term
          )
        ),
        // _aggregate_function, e.g. group_concat
        wrapped_in_parenthesis(
          seq(
            optional($.keyword_distinct),
            field('parameter', $.term),
            optional($.order_by),
            optional(seq(
              choice($.keyword_separator, ','),
              alias($._literal_string, $.literal)
            )),
            optional($.limit),
          ),
        ),
      ),
      optional($.filter_expression),
      optional($.within_group),
    ),
  ),

  _qualified_choice: $ => choice(
    $.index_choice,
    $.iterator_choice,
    seq($.keyword_others, '=>', $._expression),
  ),

  index_choice: $ => seq(
    field('index', choice($.literal, $.binary_expression, $.parameter)),
    '=>',
    field('value', $._expression),
  ),

  iterator_choice: $ => seq(
    $.keyword_for, $.for_iterand, $.keyword_in,
    comma_list($.for_control, true),
    optional(choice(seq($.keyword_index, $._expression), $.keyword_sequence)),
    '=>',
    field('value', $._expression),
  ),

  // f(i)(j) and f(i).field: calls and element access chained on a call
  call_chain: $ => prec.left(seq(
    $.invocation,
    repeat1(choice(
      wrapped_in_parenthesis($._expression),
      seq('.', $.identifier, optional(paren_list(choice($.named_argument, $._expression)))),
    )),
  )),

  // :arr(i) element of a host array
  bind_array_element: $ => seq($.parameter, wrapped_in_parenthesis($._expression)),

  // a ** b
  exponent_expression: $ => prec.left('binary_exp', seq(
    field('left', $._expression),
    '**',
    field('right', $._expression),
  )),

  // q'{text}', q'[text]', q'(text)', q'<text>', q'!text!' and friends
  _q_quote_string: _ => token(choice(
    /[nN]?[qQ]'\{([^}]|\}[^'])*\}'/,
    /[nN]?[qQ]'\[([^\]]|\][^'])*\]'/,
    /[nN]?[qQ]'\(([^)]|\)[^'])*\)'/,
    /[nN]?[qQ]'<([^>]|>[^'])*>'/,
    /[nN]?[qQ]'!([^!]|![^'])*!'/,
    /[nN]?[qQ]'#([^#]|#[^'])*#'/,
    /[nN]?[qQ]'\|([^|]|\|[^'])*\|'/,
    /[nN]?[qQ]'\/([^/]|\/[^'])*\/'/,
  )),

  _literal_string: $ => prec(
    1,
    choice($._single_quote_string, $._q_quote_string),
  ),

  // WHERE CURRENT OF cursor
  where: $ => seq(
    $.keyword_where,
    choice(
      field('predicate', $._expression),
      seq($.keyword_current, $.keyword_of, $.identifier),
    ),
  ),

  // target := expr, where the target is a variable, field, collection element or host variable
  assignment_statement: $ => seq(
    field('target', choice(
      $.identifier,
      $._qualified_field,
      $.parameter,
      $.invocation,
      seq($.parameter, ':', $.identifier),
    )),
    ':=',
    field('value', $._expression),
  ),

};
