import { comma_list } from "../helpers.js";

export default {

  _insert_statement: $ => seq(
    $.insert,
  ),

  insert: $ => seq(
    $.keyword_insert,
    optional($.keyword_into),
    $.object_reference,
    optional(
      seq(
        $.keyword_as,
        field('alias', $.identifier)
      ),
    ),
    choice(
      $._insert_values,
      $._set_values,
    ),
  ),

  _on_conflict: $ => seq(
    $.keyword_on,
    $.keyword_conflict,
    seq(
      $.keyword_do,
      choice(
        $.keyword_nothing,
        seq(
          $.keyword_update,
          $._set_values,
          optional($.where),
        ),
      ),
    ),
  ),

  _on_duplicate_key_update: $ => seq(
    $.keyword_on,
    $.keyword_duplicate,
    $.keyword_key,
    $.keyword_update,
    $.assignment_list,
  ),

  assignment_list: $ => seq(
    $.assignment,
    repeat(seq(',', $.assignment)),
  ),

  assignment: $ => seq(
    field('left',
      alias(
        $._qualified_field,
        $.field,
      ),
    ),
    '=',
    field('right', $._expression),
  ),

  _insert_values: $ => seq(
    optional(alias($._column_list, $.list)),
    choice(
      seq(
        $.keyword_values,
        comma_list($.list, true),
      ),
      $._dml_read,
    ),
  ),

  _set_values: $ => seq(
    $.keyword_set,
    comma_list($.assignment, true),
  ),

}
