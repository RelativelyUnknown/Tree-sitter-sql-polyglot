import { comma_list, wrapped_in_parenthesis } from "../../grammar/helpers.js";

export default {

  _copy_statement: $ => choice(
    $.copy_from_statement,
    $.copy_to_statement,
  ),

  // Shared copy options used in both COPY FROM and COPY TO
  // Options may be separated by commas (standard) or by whitespace (legacy form).
  _copy_options: $ => seq(
    optional($.keyword_with),
    wrapped_in_parenthesis(
      seq($.copy_option, repeat(seq(optional(','), $.copy_option))),
    ),
  ),

  copy_option: $ => choice(
    seq(
      $.keyword_format,
      choice(
        $.keyword_csv,
        $.keyword_binary,
        $.keyword_text,
      ),
    ),
    seq(
      $.keyword_freeze,
      optional(choice(
        $.keyword_true,
        $.keyword_false,
      )),
    ),
    seq(
      $.keyword_header,
      optional(choice(
        $.keyword_true,
        $.keyword_false,
        $.keyword_match,
      )),
    ),
    seq(
      choice(
        $.keyword_delimiter,
        $.keyword_null,
        $.keyword_default,
        $.keyword_escape,
        $.keyword_quote,
        $.keyword_encoding,
      ),
      alias($._literal_string, $.literal),
    ),
    seq(
      choice(
        $.keyword_force_null,
        $.keyword_force_not_null,
      ),
      $._column_list,
    ),
    // FORCE_QUOTE (cols) | FORCE_QUOTE *  — TO only but allowed structurally
    seq(
      $.keyword_force_quote,
      choice(
        $._column_list,
        '*',
      ),
    ),
  ),

  copy_from_statement: $ => seq(
    $.keyword_copy,
    choice(
      seq($.object_reference, optional($._column_list)),
      wrapped_in_parenthesis($._dml_read),
    ),
    $.keyword_from,
    choice(
      $.keyword_stdin,
      alias($._literal_string, $.literal),
      seq($.keyword_program, alias($._literal_string, $.literal)),
    ),
    optional($._copy_options),
    optional($.where),
  ),

  copy_to_statement: $ => seq(
    $.keyword_copy,
    choice(
      seq($.object_reference, optional($._column_list)),
      wrapped_in_parenthesis($._dml_read),
    ),
    $.keyword_to,
    choice(
      $.keyword_stdout,
      alias($._literal_string, $.literal),
      seq($.keyword_program, alias($._literal_string, $.literal)),
    ),
    optional($._copy_options),
  ),

};
