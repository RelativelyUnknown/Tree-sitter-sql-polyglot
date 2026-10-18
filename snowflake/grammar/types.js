import { paren_list } from '../../grammar/helpers.js';

// Snowflake type names the base type system does not list (NUMBER, TEXT, TIMESTAMP_NTZ, VARIANT, ...)
// parse as a custom type, which the base gives no argument list. Snowflake types take
// precision/scale/length arguments, e.g. NUMBER(10, 2), TIMESTAMP_NTZ(9), TEXT(100).
export default {

  _type: $ => prec.left(
    seq(
      choice(
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
        seq($.keyword_string, optional(paren_list(alias($._integer, $.literal), true))),

        $.enum,

        seq(
          field('custom_type', $.object_reference),
          optional(paren_list($.type_argument, true)),
        ),
      ),
      optional($.array_size_definition),
    ),
  ),

  // Arguments of a parameterised type: NUMBER(10, 2), ARRAY(INT NOT NULL), OBJECT(city VARCHAR, zip NUMBER),
  // MAP(VARCHAR, VARCHAR), VECTOR(FLOAT, 3).
  type_argument: $ => choice(
    alias($._integer, $.literal),
    seq(field('name', $.identifier), $._type, optional(seq($.keyword_not, $.keyword_null))),
    seq($._type, optional(seq($.keyword_not, $.keyword_null))),
  ),

};
