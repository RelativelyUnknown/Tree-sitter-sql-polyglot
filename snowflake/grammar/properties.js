import { comma_list, paren_list } from '../../grammar/helpers.js';

// Snowflake documents most object options as long, version-churning property
// lists. Enumerating them dates instantly, so they are modelled as
// `NAME = value` pairs — the shape the reference itself uses.
export default {

  // <name> [=] { <literal> | <identifier> | ( <list> ) }
  snowflake_property: $ => seq(
    field('name', $.identifier),
    optional('='),
    field('value', choice(
      $.literal,
      $.identifier,
      paren_list($._expression, true),
    )),
  ),

  // ALTER DATABASE name { SET <props> | UNSET <names> | <inherited> }
  alter_database: $ => seq(
    $.keyword_alter,
    $.keyword_database,
    optional($._if_exists),
    $.identifier,
    choice(
      $.rename_object,
      $.change_ownership,
      seq($.keyword_set, comma_list($.snowflake_property, true)),
      seq($.keyword_unset, comma_list($.identifier, true)),
      seq(
        $.keyword_swap,
        $.keyword_with,
        field('target', $.object_reference),
      ),
    ),
  ),

  // ALTER SCHEMA name { SET <props> | UNSET <names> | RENAME TO | SWAP WITH }
  alter_schema: $ => seq(
    $.keyword_alter,
    $.keyword_schema,
    optional($._if_exists),
    $.identifier,
    choice(
      seq(choice($.keyword_rename, $.keyword_owner), $.keyword_to, $.identifier),
      seq($.keyword_set, comma_list($.snowflake_property, true)),
      seq($.keyword_unset, comma_list($.identifier, true)),
      seq(
        $.keyword_swap,
        $.keyword_with,
        field('target', $.object_reference),
      ),
    ),
  ),

};
