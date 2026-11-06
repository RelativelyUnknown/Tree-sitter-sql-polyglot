import { comma_list, paren_list, make_keyword, ordered_optionals } from '../../grammar/helpers.js';

// CREATE TYPE / ALTER TYPE (Oracle SQL Language Reference 26ai): object types with member, static,
// map, order and constructor methods, subtypes, nested tables and varrays.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_constructor:  _ => kw('constructor'),
  keyword_convert:      _ => kw('convert'),
  keyword_element:      _ => kw('element'),
  keyword_final:        _ => kw('final'),
  keyword_map:          _ => kw('map'),
  keyword_static:       _ => kw('static'),
  keyword_instantiable: _ => kw('instantiable'),
  keyword_member:       _ => kw('member'),
  keyword_oid:          _ => kw('oid'),
  keyword_overriding:   _ => kw('overriding'),
  keyword_result:       _ => kw('result'),
  keyword_self:         _ => kw('self'),
  keyword_substitutable: _ => kw('substitutable'),

  // ── CREATE TYPE ────────────────────────────────────────────────────────

  create_type: $ => seq(
    $.keyword_create,
    optional($._type_prefix_0),
    $.keyword_type,
    optional($._if_not_exists),
    $.object_reference,
    optional($._type_option_0),
    // CREATE TYPE t; declares an incomplete type
    optional($._type_definition),
  ),

  // [OR REPLACE] [EDITIONABLE | NONEDITIONABLE], then FORCE, OID, SHARING and AUTHID, each in this order
  ...ordered_optionals('_type_prefix', [
    $ => $._or_replace,
    $ => $._editionable_clause,
  ]),

  ...ordered_optionals('_type_option', [
    $ => $.keyword_force,
    $ => seq($.keyword_oid, alias($._literal_string, $.literal)),
    $ => $.sharing_clause,
    $ => seq($.keyword_authid, choice($.keyword_current_user, $.keyword_definer)),
  ]),

  _type_definition: $ => choice(
    seq(
      $.keyword_as,
      choice(
        seq($.keyword_object, optional($._object_type_body)),
        seq($.keyword_table, $.keyword_of, $._type, optional($._not_null)),
        seq(
          choice($.keyword_varray, seq($.keyword_varying, $.keyword_array)),
          paren_list(alias($._natural_number, $.literal), true),
          $.keyword_of, $._type, optional($._not_null),
        ),
      ),
    ),
    seq($.keyword_under, $.object_reference, optional($._object_type_body)),
  ),

  _object_type_body: $ => choice(
    seq(
      $.keyword_external, $.keyword_name, alias($._literal_string, $.literal),
      $.keyword_language, $.keyword_java, $.keyword_using, $.identifier,
      optional(paren_list($._type_element, true)),
      repeat($._type_modifier),
    ),
    seq(paren_list($._type_element, true), repeat($._type_modifier)),
    repeat1($._type_modifier),
  ),

  _type_modifier: $ => seq(
    optional($.keyword_not),
    choice($.keyword_final, $.keyword_instantiable),
  ),

  _type_element: $ => choice(
    seq(
      $.identifier, $._type,
      optional(seq($.keyword_external, $.keyword_name, alias($._literal_string, $.literal))),
    ),
    $._type_method,
  ),

  _type_method: $ => seq(
    repeat($._type_modifier_or_overriding),
    choice(
      seq(optional(choice($.keyword_map, $.keyword_order)), $.keyword_member, $._subprogram_heading),
      seq($.keyword_static, $._subprogram_heading),
      seq(
        $.keyword_constructor, $.keyword_function,
        $.identifier,
        optional(paren_list($.plsql_parameter, true)),
        $.keyword_return, $.keyword_self, $.keyword_as, $.keyword_result,
      ),
    ),
  ),

  _type_modifier_or_overriding: $ => choice(
    $._type_modifier,
    $.keyword_overriding,
  ),

  // ── ALTER TYPE ─────────────────────────────────────────────────────────

  alter_type: $ => seq(
    $.keyword_alter,
    $.keyword_type,
    optional($._if_exists),
    $.object_reference,
    choice(
      $.compile_clause,
      $._editionable_clause,
      $.keyword_reset,
      seq(
        $.keyword_replace,
        optional(seq($.keyword_authid, choice($.keyword_current_user, $.keyword_definer))),
        $.keyword_as, $.keyword_object, paren_list($._type_element, true),
      ),
      seq($._type_modifier, optional($._dependent_handling)),
      seq(
        choice($.keyword_add, $.keyword_drop),
        $.keyword_attribute,
        choice(
          paren_list(seq($.identifier, optional($._type)), true),
          seq($.identifier, optional($._type)),
        ),
        optional($._dependent_handling),
      ),
      seq(
        $.keyword_modify, $.keyword_attribute,
        paren_list(seq($.identifier, $._type), true),
        optional($._dependent_handling),
      ),
      seq($.keyword_modify, $.keyword_limit, alias($._natural_number, $.literal), optional($._dependent_handling)),
      seq($.keyword_modify, $.keyword_element, $.keyword_type, $._type, optional($._dependent_handling)),
      seq(choice($.keyword_add, $.keyword_drop), $._type_method, optional($._dependent_handling)),
    ),
  ),

  // INVALIDATE | CASCADE [[NOT] INCLUDING TABLE DATA | CONVERT TO SUBSTITUTABLE] [FORCE] [EXCEPTIONS INTO t]
  _dependent_handling: $ => choice(
    $.keyword_invalidate,
    seq(
      $.keyword_cascade,
      optional(choice(
        seq(optional($.keyword_not), $.keyword_including, $.keyword_table, $.keyword_data),
        seq($.keyword_convert, $.keyword_to, $.keyword_substitutable),
      )),
      optional($.keyword_force),
      optional(seq($.keyword_exceptions, $.keyword_into, $.object_reference)),
    ),
  ),

};
