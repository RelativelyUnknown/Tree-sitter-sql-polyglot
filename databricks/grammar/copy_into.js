import { comma_list, paren_list } from '../../grammar/helpers.js';

export default {

  // COPY INTO table FROM source [options...]
  // https://docs.databricks.com/sql/language-manual/delta-copy-into.html
  copy_into_statement: $ => prec.right(seq(
    $.keyword_copy,
    $.keyword_into,
    $.object_reference,
    $.keyword_from,
    choice(
      alias($._literal_string, $.literal),
      $.subquery,
    ),
    repeat($.copy_into_option),
  )),

  // A single optional clause for COPY INTO (repeated via repeat())
  // Note: FORMAT_OPTIONS / COPY_OPTIONS (underscore keywords) are not included
  // here because tree-sitter keyword extraction prevents underscore tokens from
  // being recognised at statement level without explicit parenthesised context.
  copy_into_option: $ => choice(
    seq($.keyword_fileformat, '=', field('format', $.identifier)),
    seq($.keyword_files, '=', paren_list(alias($._literal_string, $.literal), true)),
    seq($.keyword_pattern, '=', alias($._literal_string, $.literal)),
  ),

};
