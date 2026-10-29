import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

// CREATE / ALTER / DROP DOMAIN, ALTER SYNONYM / PACKAGE / TRIGGER and the COMPILE clause they
// share (Oracle SQL Language Reference 26ai). Reached through _oracle_admin_statement.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_choose:        _ => kw('choose'),
  keyword_display:       _ => kw('display'),
  keyword_flexible:      _ => kw('flexible'),
  keyword_settings:      _ => kw('settings'),
  keyword_specification: _ => kw('specification'),
  keyword_usecase:       _ => kw('usecase'),

  // ── COMPILE ────────────────────────────────────────────────────────────

  // PLSQL_OPTIMIZE_LEVEL = 2: a compiler parameter assignment
  _compiler_parameter: $ => seq($.identifier, '=', choice($.literal, $.identifier)),

  compile_clause: $ => seq(
    $.keyword_compile,
    optional($.keyword_debug),
    optional(choice($.keyword_package, $.keyword_specification, $.keyword_body)),
    repeat($._compiler_parameter),
    optional(seq($.keyword_reuse, $.keyword_settings)),
  ),

  _editionable_clause: $ => choice($.keyword_editionable, $.keyword_noneditionable),

  alter_synonym_statement: $ => seq(
    $.keyword_alter,
    optional($.keyword_public),
    $.keyword_synonym,
    optional($._if_exists),
    field('name', $.object_reference),
    choice($.keyword_compile, $._editionable_clause),
  ),

  alter_package_statement: $ => seq(
    $.keyword_alter,
    $.keyword_package,
    optional($._if_exists),
    field('name', $.object_reference),
    choice($.compile_clause, $._editionable_clause),
  ),

  alter_trigger_statement: $ => seq(
    $.keyword_alter,
    $.keyword_trigger,
    optional($._if_exists),
    field('name', $.object_reference),
    choice(
      $.keyword_enable,
      $.keyword_disable,
      $.rename_object,
      $.compile_clause,
      $._editionable_clause,
    ),
  ),

  // ── Domains ────────────────────────────────────────────────────────────

  // a, a = x, a = x = 1
  _domain_enum_value: $ => seq(
    $.identifier,
    repeat(seq('=', choice($.literal, $.identifier))),
  ),

  create_domain_statement: $ => seq(
    $.keyword_create,
    optional(choice($.keyword_flexible, $.keyword_usecase)),
    $.keyword_domain,
    optional($._if_not_exists),
    field('name', $.object_reference),
    choice(
      seq(
        $.keyword_as,
        choice(
          seq($._type, repeat($._column_constraint)),
          seq($.keyword_enum, paren_list($._domain_enum_value, true)),
          paren_list(seq(
            $.identifier, $.keyword_as, $._type,
            optional($.keyword_strict),
            repeat($._column_constraint),
          ), true),
        ),
      ),
      // FLEXIBLE DOMAIN d (c1, c2) CHOOSE DOMAIN USING (t type) FROM CASE … | DECODE(…)
      seq(
        paren_list($.identifier, true),
        $.keyword_choose, $.keyword_domain, $.keyword_using,
        paren_list(seq($.identifier, $._type), true),
        $.keyword_from,
        choice($.case, $.invocation),
      ),
    ),
    repeat(choice(
      seq($.keyword_display, $._expression),
      seq($.keyword_order, $._expression),
      $.annotations_clause,
    )),
  ),

  alter_domain_statement: $ => seq(
    $.keyword_alter,
    optional($.keyword_usecase),
    $.keyword_domain,
    optional($._if_exists),
    field('name', $.object_reference),
    choice(
      seq(choice($.keyword_add, $.keyword_modify), choice(
        seq($.keyword_display, $._expression),
        seq($.keyword_order, $._expression),
      )),
      seq($.keyword_drop, choice($.keyword_display, $.keyword_order)),
      $.annotations_clause,
    ),
  ),

  drop_domain_statement: $ => seq(
    $.keyword_drop,
    optional($.keyword_usecase),
    $.keyword_domain,
    optional($._if_exists),
    field('name', $.object_reference),
    optional(seq($.keyword_force, optional($.keyword_preserve))),
  ),

};
