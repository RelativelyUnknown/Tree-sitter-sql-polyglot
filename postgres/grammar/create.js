import { paren_list, comma_list } from "../../grammar/helpers.js";

export default {

  create_extension: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_extension,
    optional($._if_not_exists),
    $.identifier,
    optional($.keyword_with),
    optional(seq($.keyword_schema, $.identifier)),
    optional(seq($.keyword_version, choice($.identifier, alias($._literal_string, $.literal)))),
    optional($.keyword_cascade),
  )),

  // Postgres row level security
  create_policy: $ => prec.right(
    seq(
      $.keyword_create,
      $.keyword_policy,
      $.object_reference,
      $.keyword_on,
      $.object_reference,
      optional(
        seq(
          $.keyword_as,
          choice(
            $.keyword_permissive,
            $.keyword_restrictive,
          ),
        ),
      ),
      optional(
        seq(
          $.keyword_for,
          choice(
            $.keyword_all,
            $.keyword_select,
            $.keyword_insert,
            $.keyword_update,
            $.keyword_delete,
          ),
        ),
      ),
      optional(
        seq(
          $.keyword_to,
          choice(
            $.object_reference,
            $.keyword_public,
            $.keyword_current_role,
            $.keyword_current_user,
            $.keyword_session_user,
          ),
          repeat(
            seq(
              ',',
              choice(
                $.object_reference,
                $.keyword_public,
                $.keyword_current_role,
                $.keyword_current_user,
                $.keyword_session_user,
              ),
            ),
          ),
        ),
      ),
      optional(
        seq(
          $.keyword_using,
          $.parenthesized_expression,
        ),
      ),
      optional(
        seq(
          $.keyword_with,
          $.keyword_check,
          $.parenthesized_expression,
        ),
      ),
    ),
  ),

  // CREATE [OR REPLACE] AGGREGATE name ( [* | arg_types [ORDER BY direct_types]] )
  //   ( option = value [, ...] )
  create_aggregate_statement: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_aggregate,
    $.object_reference,
    '(',
    choice(
      '*',
      seq(
        comma_list($._type, true),
        optional(seq($.keyword_order, $.keyword_by, comma_list($._type, true))),
      ),
    ),
    ')',
    '(',
    comma_list($.aggregate_option, true),
    ')',
  ),

  // key = value  (covers SFUNC, STYPE, INITCOND, PARALLEL, etc.)
  // bare identifier covers flags like FINALFUNC_EXTRA
  aggregate_option: $ => choice(
    seq($.identifier, '=', $._expression),
    $.identifier,
  ),

};
