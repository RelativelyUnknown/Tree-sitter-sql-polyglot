import { comma_list, wrapped_in_parenthesis } from '../../grammar/helpers.js';

export default {

  // COPY (table_ref | subquery) (TO | FROM) 'file' [(options)]
  copy_statement: $ => seq(
    $.keyword_copy,
    field('source',
      choice(
        $.object_reference,
        wrapped_in_parenthesis($._dml_read),
      ),
    ),
    field('direction',
      choice(
        $.keyword_to,
        $.keyword_from,
      ),
    ),
    field('target', alias($._literal_string, $.literal)),
    optional(
      wrapped_in_parenthesis(
        comma_list($.copy_option, true),
      ),
    ),
  ),

  // A single COPY option:
  //   bare keyword          e.g. HEADER
  //   keyword value         e.g. FORMAT PARQUET, HEADER TRUE, DELIMITER ','
  copy_option: $ => seq(
    field('name', $.identifier),
    optional(
      field('value',
        choice(
          alias($._literal_string, $.literal),
          $.literal,
          $.identifier,
        ),
      ),
    ),
  ),

};
