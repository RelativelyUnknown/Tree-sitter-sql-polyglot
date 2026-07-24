import { comma_list, paren_list } from "../../grammar/helpers.js";

export default {

  load_data_statement: $ => seq(
    $.keyword_load,
    $.keyword_data,
    optional($.keyword_local),
    $.keyword_infile,
    alias($._literal_string, $.literal),
    optional(choice($.keyword_replace, $.keyword_ignore)),
    $.keyword_into,
    $.keyword_table,
    $.object_reference,
    optional($._load_fields_clause),
    optional($._load_lines_clause),
    optional($._load_ignore_lines),
    optional(alias($._column_list, $.list)),
  ),

  _load_fields_clause: $ => seq(
    $.keyword_fields,
    repeat1(choice(
      seq($.keyword_terminated, $.keyword_by, alias($._literal_string, $.literal)),
      seq($.keyword_enclosed,   $.keyword_by, alias($._literal_string, $.literal)),
      seq($.keyword_escaped,    $.keyword_by, alias($._literal_string, $.literal)),
    )),
  ),

  _load_lines_clause: $ => seq(
    $.keyword_lines,
    repeat1(
      seq($.keyword_terminated, $.keyword_by, alias($._literal_string, $.literal)),
    ),
  ),

  _load_ignore_lines: $ => seq(
    $.keyword_ignore,
    alias($._integer, $.literal),
    choice($.keyword_lines, $.keyword_rows),
  ),

  // SELECT … INTO { OUTFILE 'f' [CHARACTER SET cs] [FIELDS …] [LINES …]
  //              | DUMPFILE 'f' }
  into_outfile: $ => seq(
    $.keyword_into,
    choice(
      seq(
        $.keyword_outfile,
        alias($._literal_string, $.literal),
        optional(seq($.keyword_character, $.keyword_set, $.identifier)),
        optional($._load_fields_clause),
        optional($._load_lines_clause),
      ),
      seq($.keyword_dumpfile, alias($._literal_string, $.literal)),
    ),
  ),

};
