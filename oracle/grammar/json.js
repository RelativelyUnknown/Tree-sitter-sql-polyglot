import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// SQL/JSON (Oracle SQL Language Reference 26ai): JSON_VALUE / JSON_QUERY / JSON_EXISTS /
// JSON_OBJECT / JSON_ARRAY / JSON_OBJECTAGG / JSON_ARRAYAGG / JSON_SERIALIZE / JSON_TRANSFORM,
// the JSON {...} and JSON [...] constructors, IS JSON, JSON_TABLE and dot-notation object access.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_absent:        _ => kw('absent'),
  keyword_allow:         _ => kw('allow'),
  keyword_ascii:         _ => kw('ascii'),
  keyword_conditional:   _ => kw('conditional'),
  keyword_disallow:      _ => kw('disallow'),
  keyword_empty:         _ => kw('empty'),
  keyword_format:        _ => kw('format'),
  keyword_json_array:    _ => kw('json_array'),
  keyword_json_arrayagg: _ => kw('json_arrayagg'),
  keyword_json_exists:   _ => kw('json_exists'),
  keyword_json_object:   _ => kw('json_object'),
  keyword_json_objectagg: _ => kw('json_objectagg'),
  keyword_json_query:    _ => kw('json_query'),
  keyword_json_serialize: _ => kw('json_serialize'),
  keyword_json_transform: _ => kw('json_transform'),
  keyword_json_value:    _ => kw('json_value'),
  keyword_keys:          _ => kw('keys'),
  keyword_lax:           _ => kw('lax'),
  keyword_mismatch:      _ => kw('mismatch'),
  keyword_error:         _ => kw('error'),
  keyword_omit:          _ => kw('omit'),
  keyword_ordered:       _ => kw('ordered'),
  keyword_ordinality:    _ => kw('ordinality'),
  keyword_pretty:        _ => kw('pretty'),
  keyword_quotes:        _ => kw('quotes'),
  keyword_scalar:        _ => kw('scalar'),
  keyword_scalars:       _ => kw('scalars'),
  keyword_strict:        _ => kw('strict'),
  keyword_unconditional: _ => kw('unconditional'),
  keyword_unknown:       _ => kw('unknown'),
  keyword_wrapper:       _ => kw('wrapper'),
  keyword_append:        _ => kw('append'),
  keyword_prepend:       _ => kw('prepend'),
  keyword_missing:       _ => kw('missing'),
  keyword_remove:        _ => kw('remove'),
  keyword_rename_op:     _ => kw('rename'),

  // ── Shared clauses ─────────────────────────────────────────────────────

  _json_format: $ => seq($.keyword_format, $.keyword_json),

  // NULL ON NULL | ABSENT ON NULL
  _json_null_clause: $ => seq(choice($.keyword_null, $.keyword_absent), $.keyword_on, $.keyword_null),

  // RETURNING type [PRETTY] [ASCII] [TRUNCATE]
  _json_returning: $ => seq(
    $.keyword_returning,
    $._type,
    repeat(choice($.keyword_pretty, $.keyword_ascii, $.keyword_truncate)),
  ),

  // PASSING expr AS "name", …
  _json_passing: $ => seq(
    $.keyword_passing,
    comma_list(seq($._expression, $.keyword_as, $.identifier), true),
  ),

  // ERROR | NULL | EMPTY [ARRAY | OBJECT] | DEFAULT expr | TRUE | FALSE | UNKNOWN  ON {ERROR | EMPTY | MISMATCH}
  _json_on_clause: $ => seq(
    choice(
      $.keyword_error,
      $.keyword_null,
      seq($.keyword_empty, optional(choice($.keyword_array, $.keyword_object))),
      seq($.keyword_default, $._expression),
      $.keyword_true,
      $.keyword_false,
      $.keyword_unknown,
    ),
    $.keyword_on,
    choice($.keyword_error, $.keyword_empty, $.keyword_mismatch),
    optional(seq('(', comma_list($.identifier, true), ')')),
  ),

  // WITH [CONDITIONAL | UNCONDITIONAL] [ARRAY] WRAPPER | WITHOUT [ARRAY] WRAPPER
  _json_wrapper: $ => choice(
    seq($.keyword_with, optional(choice($.keyword_conditional, $.keyword_unconditional)), optional($.keyword_array), $.keyword_wrapper),
    seq($.keyword_without, optional($.keyword_array), $.keyword_wrapper),
  ),

  // {KEEP | OMIT} QUOTES [ON SCALAR STRING]
  _json_quotes: $ => seq(
    choice($.keyword_keep, $.keyword_omit), $.keyword_quotes,
    optional(seq($.keyword_on, $.keyword_scalar, $.keyword_string)),
  ),

  _json_path: $ => alias($._literal_string, $.literal),

  // ── Functions ──────────────────────────────────────────────────────────

  json_function: $ => choice(
    $.json_path_function,
    $.json_object_function,
    $.json_array_function,
    $.json_objectagg_function,
    $.json_serialize_function,
    $.json_transform_function,
  ),

  // JSON_VALUE / JSON_QUERY / JSON_EXISTS share one rule: the three differ only in which of
  // RETURNING / PASSING / WRAPPER / QUOTES / ON clauses they take, and one expression context
  // keeps the parse table small.
  json_path_function: $ => seq(
    choice($.keyword_json_value, $.keyword_json_query, $.keyword_json_exists), '(',
    $._expression, optional($._json_format), ',', $._json_path,
    repeat(choice(
      $._json_returning,
      $._json_passing,
      $._json_wrapper,
      $._json_quotes,
      $._json_on_clause,
    )),
    ')',
  ),

  // KEY k VALUE v | k VALUE v | k : v [FORMAT JSON] | * | t.*
  json_entry: $ => choice(
    '*',
    seq($.object_reference, '.', '*'),
    seq(
      optional($.keyword_key),
      $._expression,
      choice(seq($.keyword_value, $._expression), seq(':', $._expression)),
      optional($._json_format),
    ),
  ),

  _json_object_option: $ => choice(
    $._json_null_clause,
    $._json_returning,
    $.keyword_strict,
    seq($.keyword_with, $.keyword_unique, $.keyword_keys),
    seq($.keyword_without, $.keyword_unique, $.keyword_keys),
  ),

  json_object_function: $ => seq(
    $.keyword_json_object, '(',
    optional(comma_list($.json_entry, true)),
    repeat($._json_object_option),
    ')',
  ),

  json_objectagg_function: $ => seq(
    $.keyword_json_objectagg, '(',
    $.json_entry,
    repeat($._json_object_option),
    ')',
  ),

  // JSON_ARRAY and JSON_ARRAYAGG (the aggregate takes one element and an ORDER BY)
  json_array_function: $ => seq(
    choice($.keyword_json_array, $.keyword_json_arrayagg), '(',
    optional(comma_list(seq($._expression, optional($._json_format)), true)),
    optional($.order_by),
    repeat(choice($._json_null_clause, $._json_returning, $.keyword_strict)),
    ')',
  ),

  json_serialize_function: $ => seq(
    $.keyword_json_serialize, '(',
    $._expression, optional($._json_format),
    repeat(choice($._json_returning, $.keyword_ordered, $._json_on_clause)),
    ')',
  ),

  // JSON_TRANSFORM(doc, op, …) with SET / INSERT / APPEND / PREPEND / REMOVE / KEEP / RENAME / SORT / NESTED PATH
  json_transform_function: $ => seq(
    $.keyword_json_transform, '(',
    $._expression, ',',
    comma_list($.json_transform_operation, true),
    repeat($._json_returning),
    ')',
  ),

  json_transform_operation: $ => seq(
    choice(
      seq(choice($.keyword_set, $.keyword_insert, $.keyword_append, $.keyword_prepend), $._json_path, '=', $._expression, optional($._json_format)),
      seq(choice($.keyword_remove, $.keyword_keep), $._json_path),
      seq($.keyword_rename_op, $._json_path, $.keyword_with, $._json_path),
      seq($.keyword_nested, optional($.keyword_path), $._json_path, '(', comma_list($.json_transform_operation, true), ')'),
    ),
    repeat(seq(
      choice($.keyword_error, $.keyword_ignore, $.keyword_create, $.keyword_replace, $.keyword_remove, $.keyword_null),
      $.keyword_on,
      choice($.keyword_missing, $.keyword_exists, $.keyword_null, $.keyword_error),
    )),
  ),

  // JSON { 'k' : v, … } and JSON [ v, … ]
  json_constructor: $ => seq(
    $.keyword_json,
    choice(
      seq('(', comma_list($._expression, true), ')'),
      seq('{', optional(comma_list($.json_entry, true)), '}'),
      seq('[', optional(comma_list($._expression, true)), ']'),
    ),
  ),

  // expr IS [NOT] JSON [FORMAT JSON] [STRICT | LAX] [ALLOW | DISALLOW SCALARS]
  //   [WITH | WITHOUT UNIQUE KEYS] [VALIDATE 'schema' | OBJECT | ARRAY | SCALAR …]
  is_json_condition: $ => prec.left('binary_is', seq(
    field('left', $._expression),
    $.keyword_is,
    optional($.keyword_not),
    $.keyword_json,
    repeat($._json_condition_option),
    optional(seq('(', repeat1($._json_condition_option), ')')),
  )),

  _json_condition_option: $ => choice(
    $._json_format,
    $.keyword_strict,
    $.keyword_lax,
    seq(choice($.keyword_allow, $.keyword_disallow), $.keyword_scalars),
    seq($.keyword_with, $.keyword_unique, $.keyword_keys),
    seq($.keyword_without, $.keyword_unique, $.keyword_keys),
    seq($.keyword_validate, $._json_path),
    $.keyword_object,
    $.keyword_array,
    $.keyword_scalar,
  ),

  // ── JSON_TABLE ─────────────────────────────────────────────────────────

  // JSON_TABLE(expr [FORMAT JSON] [, 'path'] [on-clauses] COLUMNS (column, …))
  json_table: $ => seq(
    $.keyword_json_table,
    '(',
    $._expression,
    optional($._json_format),
    optional(seq(',', $._json_path)),
    repeat($._json_on_clause),
    $.keyword_columns,
    '(',
    comma_list($.json_table_column, true),
    ')',
    ')',
  ),

  json_table_column: $ => choice(
    // name FOR ORDINALITY
    seq(field('name', $.identifier), $.keyword_for, $.keyword_ordinality),
    // NESTED [PATH] 'path' COLUMNS (…) | NESTED name[*] COLUMNS (…)
    seq(
      $.keyword_nested, optional($.keyword_path),
      choice($._json_path, seq($.identifier, optional($.json_array_step))),
      $.keyword_columns, '(', comma_list($.json_table_column, true), ')',
    ),
    // name [type] [TRUNCATE] [FORMAT JSON] [wrapper] [quotes] [EXISTS] [PATH 'p'] [on-clauses]
    seq(
      field('name', $.identifier),
      optional($._type),
      repeat(choice(
        $.keyword_truncate,
        $._json_format,
        $._json_wrapper,
        $._json_quotes,
        $.keyword_exists,
        seq($.keyword_path, $._json_path),
        $._json_on_clause,
      )),
    ),
  ),

  // FROM t NESTED doc COLUMNS (…): table-level shorthand
  nested_columns_clause: $ => seq(
    $.keyword_nested, $.identifier, $.keyword_columns,
    '(', comma_list($.json_table_column, true), ')',
  ),

  // ── Dot notation ───────────────────────────────────────────────────────

  // po.doc.LineItems[0].Part.UPCCode, a.b[*].c, a.b[0 to 2], a.b.number()
  json_object_access: $ => prec.left(choice(
    // [*] / [a to b] / [a, b] as the first step (a plain [n] parses as a subscript)
    seq(alias($._qualified_field, $.field), $.json_array_step, repeat($._json_step)),
    // x.y[0].z: the inherited subscript followed by more steps
    seq($.subscript, repeat1($._json_step)),
    // trailing item method calls such as a.b.number(). Longer plain paths stay ordinary fields:
    // a branch for five or more parts would also claim every shorter qualified field.
    seq(
      alias($._qualified_field, $.field),
      '.', $.identifier, '(', ')',
      repeat($._json_step),
    ),
  )),

  _json_step: $ => choice(
    $.json_array_step,
    prec.right(seq('.', $.identifier, optional(seq('(', ')')))),
  ),

  json_array_step: $ => seq(
    '[',
    choice(
      '*',
      comma_list(choice($._expression, seq($._expression, $.keyword_to, $._expression)), true),
    ),
    ']',
  ),

};
