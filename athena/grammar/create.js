import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // CREATE EXTERNAL TABLE [IF NOT EXISTS] name (col_defs)
  //   [PARTITIONED BY (col_defs)]
  //   [ROW FORMAT SERDE 'class' [WITH SERDEPROPERTIES (...)]
  //    | ROW FORMAT DELIMITED [FIELDS TERMINATED BY 'x'] [LINES TERMINATED BY 'x']]
  //   [STORED AS TEXTFILE|PARQUET|ORC|AVRO|RCFILE|SEQUENCEFILE]
  //   LOCATION 's3://...'
  //   [TBLPROPERTIES (...)]
  create_external_table: $ => seq(
    $.keyword_create,
    $.keyword_external,
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    optional($.column_definitions),
    optional(seq(
      $.keyword_partitioned,
      $.keyword_by,
      $.column_definitions,
    )),
    optional($.row_format),
    optional($.stored_as),
    $.keyword_location,
    field('location', alias($._literal_string, $.literal)),
    optional(seq(
      $.keyword_tblproperties,
      paren_list(
        seq(
          field('key', alias($._literal_string, $.literal)),
          '=',
          field('value', alias($._literal_string, $.literal)),
        ),
        true,
      ),
    )),
  ),

  // ROW FORMAT SERDE 'class' [WITH SERDEPROPERTIES (k=v, ...)]
  // ROW FORMAT DELIMITED [FIELDS TERMINATED BY 'x'] [LINES TERMINATED BY 'x']
  row_format: $ => seq(
    $.keyword_row,
    $.keyword_format,
    choice(
      seq(
        $.keyword_serde,
        field('class', alias($._literal_string, $.literal)),
        optional(seq(
          $.keyword_with,
          $.keyword_serdeproperties,
          paren_list(
            seq(
              field('key', alias($._literal_string, $.literal)),
              '=',
              field('value', alias($._literal_string, $.literal)),
            ),
            true,
          ),
        )),
      ),
      seq(
        $.keyword_delimited,
        optional(seq(
          $.keyword_fields,
          $.keyword_terminated,
          $.keyword_by,
          field('field_sep', alias($._literal_string, $.literal)),
        )),
        optional(seq(
          $.keyword_lines,
          $.keyword_terminated,
          $.keyword_by,
          field('line_sep', alias($._literal_string, $.literal)),
        )),
      ),
    ),
  ),

  // STORED AS format_name
  stored_as: $ => seq(
    $.keyword_stored,
    $.keyword_as,
    choice(
      $.keyword_textfile,
      $.keyword_parquet,
      $.keyword_orc,
      $.keyword_avro,
      $.keyword_rcfile,
      $.keyword_sequencefile,
      $.keyword_inputformat,
    ),
  ),

};
