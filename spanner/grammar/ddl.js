import { comma_list } from '../../grammar/helpers.js';

export default {

  // Spanner: CREATE TABLE t (cols…) PRIMARY KEY (col [ASC|DESC], …)
  //   [, INTERLEAVE IN PARENT p [ON DELETE CASCADE|NO ACTION]]
  //   [, ROW DELETION POLICY (OLDER_THAN(col, INTERVAL n DAY))]
  // The trailing PRIMARY KEY (outside the column list) is Spanner-only.
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      optional($.column_definitions),
      optional($.table_primary_key),
      repeat(seq(',', choice(
        $.interleave_clause,
        $.row_deletion_policy,
      ))),
      optional($.options_clause),
    ),
  ),

  table_primary_key: $ => seq(
    $.keyword_primary,
    $.keyword_key,
    '(',
    comma_list($.ordered_key_part, true),
    ')',
  ),

  ordered_key_part: $ => seq(
    field('column', $.identifier),
    optional(choice($.keyword_asc, $.keyword_desc)),
  ),

  interleave_clause: $ => seq(
    $.keyword_interleave,
    $.keyword_in,
    optional($.keyword_parent),
    $.object_reference,
    optional(seq(
      $.keyword_on,
      $.keyword_delete,
      choice(
        $.keyword_cascade,
        seq($.keyword_no, $.keyword_action),
      ),
    )),
  ),

  // ROW DELETION POLICY (OLDER_THAN(col, INTERVAL n DAY))
  row_deletion_policy: $ => seq(
    $.keyword_row,
    $.keyword_deletion,
    $.keyword_policy,
    '(',
    $.keyword_older_than,
    '(',
    field('column', $.identifier),
    ',',
    alias($.spanner_interval, $.interval),
    ')',
    ')',
  ),

  // GoogleSQL unquoted interval: INTERVAL 30 DAY
  spanner_interval: $ => seq(
    $.keyword_interval,
    $._natural_number,
    field('qualifier', $.identifier),
  ),

  // Spanner sized scalar types: STRING(n | MAX), BYTES(n | MAX)
  string_type: $ => seq(
    $.keyword_string,
    '(',
    choice($._natural_number, $.keyword_max),
    ')',
  ),

  bytes_type: $ => seq(
    $.keyword_bytes,
    '(',
    choice($._natural_number, $.keyword_max),
    ')',
  ),

  // bigquery _type re-enumerated, with sized STRING/BYTES added
  _type: $ => prec.left(
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
      $.string_type,
      $.keyword_string,
      $.enum,
      $.keyword_int64,
      $.keyword_float64,
      $.bytes_type,
      $.keyword_bytes,
      $.keyword_bignumeric,
      $.keyword_geography,
      $.keyword_datetime,
      $.array_type,
      $.struct_type,
      field('custom_type', $.object_reference),
    ),
  ),

  // Spanner: CREATE [UNIQUE] [NULL_FILTERED] INDEX i ON t (key parts)
  //   [STORING (cols)] [, INTERLEAVE IN p]
  create_index: $ => seq(
    $.keyword_create,
    optional($.keyword_unique),
    optional($.keyword_null_filtered),
    $.keyword_index,
    optional($._if_not_exists),
    field('column', $._column),
    $.keyword_on,
    $.object_reference,
    $.index_fields,
    optional(seq(
      $.keyword_storing,
      alias($._column_list, $.list),
    )),
    optional(seq(',', $.interleave_clause)),
  ),

  // Spanner: CREATE CHANGE STREAM s [FOR t [(col, …)] [, …] | FOR ALL]
  //   [OPTIONS (…)]
  create_change_stream: $ => prec.right(seq(
    $.keyword_create,
    $.keyword_change,
    $.keyword_stream,
    field('name', $.object_reference),
    optional(seq(
      $.keyword_for,
      choice(
        $.keyword_all,
        comma_list($.change_stream_target, true),
      ),
    )),
    optional($.options_clause),
  )),

  change_stream_target: $ => seq(
    $.object_reference,
    optional(alias($._column_list, $.list)),
  ),

};
