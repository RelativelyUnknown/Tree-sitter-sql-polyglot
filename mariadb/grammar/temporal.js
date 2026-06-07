import { comma_list, wrapped_in_parenthesis } from "../../grammar/helpers.js";

export default {

  // FOR SYSTEM_TIME clause on a table reference (system-versioned temporal queries)
  _for_system_time: $ => seq(
    $.keyword_for,
    $.keyword_system_time,
    choice(
      seq($.keyword_as, $.keyword_of, $._expression),
      seq($.keyword_between, $._expression, $.keyword_and, $._expression),
      seq($.keyword_from, $._expression, $.keyword_to, $._expression),
      $.keyword_all,
    ),
  ),

  // FOR APPLICATION_TIME clause on a table reference (application-time temporal queries)
  // APPLICATION_TIME is a single identifier token (contains underscore).
  // We alias it to application_time for clarity in the parse tree.
  _for_application_time: $ => seq(
    $.keyword_for,
    alias($.identifier, $.application_time),
    choice(
      seq($.keyword_as, $.keyword_of, $._expression),
      seq($.keyword_between, $._expression, $.keyword_and, $._expression),
      seq($.keyword_from, $._expression, $.keyword_to, $._expression),
    ),
  ),

  // Override relation to add optional FOR SYSTEM_TIME / FOR APPLICATION_TIME clause
  relation: $ => prec.right(
    seq(
      choice(
        $.subquery,
        $.invocation,
        $.json_table,
        $.object_reference,
        wrapped_in_parenthesis($.values),
      ),
      optional($.tablesample),
      optional(choice($._for_system_time, $._for_application_time)),
      optional(
        seq(
          $._alias,
          optional(alias($._column_list, $.list)),
        ),
      ),
    ),
  ),

};
