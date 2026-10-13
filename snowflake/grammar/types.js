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
        $.keyword_string,

        $.enum,

        seq(
          field('custom_type', $.object_reference),
          optional(paren_list(alias($._integer, $.literal), true)),
        ),
      ),
      optional($.array_size_definition),
    ),
  ),

};
