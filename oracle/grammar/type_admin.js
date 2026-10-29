import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';
import legacy_rules from './legacy_statements.js';
import vendor_rules from './alter_vendor.js';

// CREATE TYPE / ALTER TYPE (Oracle SQL Language Reference 26ai): object types with member, static,
// map, order and constructor methods, subtypes, nested tables and varrays. The generic forms of
// the earlier definitions stay accepted next to the Oracle ones.

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

  create_type: $ => choice($._legacy_create_type, $._oracle_create_type),
  alter_type: $ => choice($._legacy_alter_type, $._oracle_alter_type),
  _legacy_create_type: legacy_rules.create_type,
  _legacy_alter_type: vendor_rules.alter_type,

  // ── CREATE TYPE ────────────────────────────────────────────────────────

  _oracle_create_type: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._editionable_clause),
    $.keyword_type,
    optional($._if_not_exists),
    field('name', $.object_reference),
    optional($.keyword_force),
    optional(seq($.keyword_oid, alias($._literal_string, $.literal))),
    optional($.sharing_clause),
    optional(seq($.keyword_authid, choice($.keyword_current_user, $.keyword_definer))),
    choice(
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
        field('name', $.identifier),
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

  _oracle_alter_type: $ => seq(
    $.keyword_alter,
    $.keyword_type,
    optional($._if_exists),
    field('name', $.object_reference),
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
