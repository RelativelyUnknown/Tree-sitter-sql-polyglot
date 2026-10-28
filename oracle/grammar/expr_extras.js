import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Expression and datatype forms the earlier Oracle rules lack (Oracle SQL Language Reference 26ai):
// scientific numbers, interval literal precisions, ^=, LIKEC / LIKE2 / LIKE4, AT TIME ZONE / AT LOCAL,
// database-link chains, CAST with DEFAULT ... ON CONVERSION ERROR / DOMAIN / MULTISET, function
// arguments with USING and DEFAULT ... ON CONVERSION ERROR, and the remaining builtin and ANSI types.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_conversion: _ => kw('conversion'),
  keyword_float32:    _ => kw('float32'),
  keyword_float64:    _ => kw('float64'),
  keyword_int8:       _ => kw('int8'),
  keyword_like2:      _ => kw('like2'),
  keyword_like4:      _ => kw('like4'),
  keyword_likec:      _ => kw('likec'),
  keyword_multiset:   _ => kw('multiset'),
  keyword_sparse:     _ => kw('sparse'),

  // ── Numbers ────────────────────────────────────────────────────────────

  _integer: $ => seq(
    optional(choice('-', '+')),
    /(0[xX][0-9A-Fa-f]+(_[0-9A-Fa-f]+)*)|(0[oO][0-7]+(_[0-7]+)*)|(0[bB][01]+(_[01]+)*)|(\d+(_\d+)*([eE][+-]?\d+(_\d+)*)?)/,
  ),

  _decimal_number: $ => seq(
    optional(choice('-', '+')),
    /((\d+(_\d+)*)?[.]\d+(_\d+)*([eE][+-]?\d+(_\d+)*)?)|(\d+(_\d+)*[.](\d+(_\d+)*)?[eE][+-]?\d+(_\d+)*)/,
  ),

  // ── Intervals ──────────────────────────────────────────────────────────

  // INTERVAL '4 5:12' DAY(3) TO SECOND(3)
  interval: $ => prec.right(seq(
    $.keyword_interval,
    $._literal_string,
    optional(seq(
      field('qualifier', $.identifier),
      optional(paren_list(alias($._natural_number, $.literal), true)),
    )),
    optional(seq(
      $.keyword_to,
      field('end_qualifier', $.identifier),
      optional(paren_list(alias($._natural_number, $.literal), true)),
    )),
  )),

  // ── Operators ──────────────────────────────────────────────────────────

  caret_equals_expression: $ => prec.left('binary_relation', seq(
    field('left', $._expression),
    field('operator', '^='),
    field('right', $._expression),
  )),

  // LIKEC / LIKE2 / LIKE4 with the same ESCAPE tail as LIKE
  like_variant_expression: $ => prec.left('pattern_matching', seq(
    field('left', $._expression),
    field('operator', seq(
      optional($.keyword_not),
      choice($.keyword_likec, $.keyword_like2, $.keyword_like4),
    )),
    field('right', $._expression),
    optional(seq($.keyword_escape, field('escape', $._expression))),
  )),

  // expr AT LOCAL | expr AT TIME ZONE expr
  at_time_zone_expression: $ => prec.left('binary_other', seq(
    field('left', $._expression),
    $.keyword_at,
    choice(
      $.keyword_local,
      seq($.keyword_time, $.keyword_zone, field('zone', $._expression)),
    ),
  )),

  // t@remote@hq and seq.NEXTVAL@remote
  dblink_name: $ => seq(
    $.identifier,
    repeat(seq('.', $.identifier)),
    repeat(seq('@', $.identifier)),
  ),

  field_dblink_expression: $ => seq(
    alias($._qualified_field, $.field),
    '@',
    $.dblink_name,
  ),

  // ── CAST and conversion arguments ──────────────────────────────────────

  cast: $ => seq(
    field('name', $.keyword_cast),
    '(',
    field('parameter', choice($._expression, seq($.keyword_multiset, $.subquery))),
    $.keyword_as,
    choice($._type, seq($.keyword_domain, $.object_reference)),
    optional(seq($.keyword_default, $._expression, $.keyword_on, $.keyword_conversion, $.keyword_error)),
    optional(seq(',', $._expression, optional(seq(',', $._expression)))),
    ')',
  ),

  _qualified_choice: $ => choice(
    $.index_choice,
    $.iterator_choice,
    seq($.keyword_others, '=>', $._expression),
    // CHR(196 USING NCHAR_CS), TRANSLATE(c USING CHAR_CS)
    seq($._expression, $.keyword_using, $.identifier),
    // TO_NUMBER(c DEFAULT 0 ON CONVERSION ERROR, fmt)
    seq($._expression, $.keyword_default, $._expression, $.keyword_on, $.keyword_conversion, $.keyword_error),
  ),

  _into_target: $ => choice(
    alias($._qualified_field, $.field),
    $.parameter,
    seq($.parameter, $.parameter),
  ),

  // ── Datatypes ──────────────────────────────────────────────────────────

  _type: $ => prec.left(
    seq(
      choice(
        $.number_type,
        $.number_star_type,
        $.varchar2,
        $.nvarchar2,
        $.clob,
        $.nclob,
        $.blob,
        $.bfile,
        $.raw_type,
        $.rowid,
        $.urowid,
        $.urowid_size_type,
        $.long_type,
        $.binary_float,
        $.binary_double,
        $.interval_year_to_month,
        $.interval_day_to_second,
        $.vector_type,
        $.json_type,
        $.national_char_type,
        $.char_semantics_type,
        $.keyword_boolean,
        $.bit,
        $.binary,
        $.varbinary,
        $.smallint,
        $.int,
        $.bigint,
        $.decimal,
        $.numeric,
        $.double,
        $.float,
        $.char,
        $.varchar,
        $.nchar,
        $.nvarchar,
        $.keyword_date,
        $.time,
        $.timestamp,
        $.keyword_interval,
        $.keyword_json,
        $.keyword_xml,
        $.keyword_string,
        $.enum,
        field('custom_type', $.object_reference),
      ),
      optional($.array_size_definition),
    ),
  ),

  number_star_type: $ => seq(
    $.keyword_number, '(', '*', optional(seq(',', alias($._natural_number, $.literal))), ')',
  ),

  urowid_size_type: $ => seq($.keyword_urowid, wrapped_in_parenthesis(alias($._natural_number, $.literal))),

  // VECTOR | VECTOR(dims [, format [, SPARSE]]) with * for "any"
  vector_type: $ => seq(
    $.keyword_vector,
    optional(seq(
      '(',
      choice('*', alias($._natural_number, $.literal)),
      optional(seq(
        ',',
        choice('*', $.keyword_float32, $.keyword_float64, $.keyword_int8, $.keyword_binary),
        optional(seq(',', $.keyword_sparse)),
      )),
      ')',
    )),
  ),

  json_type: $ => seq(
    $.keyword_json,
    '(',
    choice($.keyword_object, $.keyword_array, $.keyword_scalar),
    ')',
  ),

  // NATIONAL CHAR[ACTER] [VARYING] (n) | CHAR VARYING (n) | NCHAR VARYING (n)
  national_char_type: $ => choice(
    seq(
      $.keyword_national, choice($.keyword_char, $.keyword_character),
      optional($.keyword_varying),
      optional(wrapped_in_parenthesis(alias($._natural_number, $.literal))),
    ),
    seq(
      choice($.keyword_char, $.keyword_nchar), $.keyword_varying,
      optional(wrapped_in_parenthesis(alias($._natural_number, $.literal))),
    ),
  ),

  // CHAR(10 BYTE | CHAR)
  char_semantics_type: $ => seq(
    $.keyword_char, '(', alias($._natural_number, $.literal), choice($.keyword_byte, $.keyword_char), ')',
  ),

};
