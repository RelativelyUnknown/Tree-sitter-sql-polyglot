import { comma_list, paren_list, wrapped_in_parenthesis } from "../../grammar/helpers.js";

export default {

  // CREATE FOREIGN TABLE [IF NOT EXISTS] name (col ...) SERVER srvname [OPTIONS (...)]
  create_foreign_table: $ => seq(
    $.keyword_create,
    $.keyword_foreign,
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    '(',
    comma_list($.foreign_column_definition, true),
    ')',
    $.keyword_server,
    field('server', $.identifier),
    optional($.foreign_options),
  ),

  // A column in a FOREIGN TABLE — same as column_definition + optional OPTIONS (...)
  foreign_column_definition: $ => prec.left(seq(
    field('name', $._column),
    field('type', $._type),
    optional($.foreign_options),
    repeat($._column_constraint),
  )),

  // OPTIONS (key 'value', ...)
  foreign_options: $ => seq(
    $.keyword_options,
    wrapped_in_parenthesis(
      comma_list(
        seq(
          field('key', $.identifier),
          field('value', alias($._literal_string, $.literal)),
        ),
        true,
      ),
    ),
  ),

  // CREATE DOMAIN name [AS] base_type [DEFAULT expr] [CONSTRAINT name] [NOT NULL | NULL | CHECK (expr)]
  create_domain: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_domain,
    $.object_reference,
    optional($.keyword_as),
    field('base_type', $._type),
    repeat(
      choice(
        seq($.keyword_default, $.parenthesized_expression),
        seq($.keyword_default, alias($._literal_string, $.literal)),
        seq($.keyword_default, alias($._integer, $.literal)),
        seq($.keyword_default, $.keyword_null),
        seq(
          optional(seq($.keyword_constraint, field('constraint_name', $.identifier))),
          choice(
            $._not_null,
            $.keyword_null,
            seq($.keyword_check, wrapped_in_parenthesis($._expression)),
          ),
        ),
      ),
    ),
  )),

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

};
