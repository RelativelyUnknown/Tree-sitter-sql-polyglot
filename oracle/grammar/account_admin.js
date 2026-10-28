import { comma_list, paren_list, make_keyword } from '../../grammar/helpers.js';

// CREATE / ALTER USER and ROLE options (Oracle SQL Language Reference 26ai). The generic user
// and role statements keep their shape; their option list gains the explicit Oracle clauses next
// to what it accepted before. A keyword that starts a clause here is no longer read as a bare
// identifier option, so every documented clause that begins with such a word is listed.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_authentication: _ => kw('authentication'),
  keyword_through:       _ => kw('through'),
  keyword_account:       _ => kw('account'),
  keyword_roles:         _ => kw('roles'),
  keyword_container_data: _ => kw('container_data'),
  keyword_digest:        _ => kw('digest'),
  keyword_editions:      _ => kw('editions'),
  keyword_enterprise:    _ => kw('enterprise'),
  keyword_expire:        _ => kw('expire'),
  keyword_externally:    _ => kw('externally'),
  keyword_factor:        _ => kw('factor'),
  keyword_globally:      _ => kw('globally'),
  keyword_http:          _ => kw('http'),
  keyword_quota:         _ => kw('quota'),
  keyword_unlock:        _ => kw('unlock'),
  keyword_users:         _ => kw('users'),

  _account_string_or_name: $ => choice($.identifier, alias($._literal_string, $.literal)),

  _account_option: $ => choice(
    seq(
      $.keyword_identified,
      choice(
        seq(
          $.keyword_by, $._account_string_or_name,
          optional(seq($.keyword_replace, $._account_string_or_name)),
          optional(seq($.keyword_and, $.keyword_factor, alias($._literal_string, $.literal), $.keyword_as, alias($._literal_string, $.literal))),
        ),
        seq($.keyword_externally, optional(seq($.keyword_as, alias($._literal_string, $.literal)))),
        seq($.keyword_globally, optional(seq($.keyword_as, alias($._literal_string, $.literal)))),
        seq($.keyword_using, $.object_reference),
      ),
    ),
    seq($.keyword_not, $.keyword_identified),
    seq($.keyword_no, $.keyword_authentication),
    seq($.keyword_password, $.keyword_expire),
    seq($.keyword_default, $.keyword_tablespace, $._account_string_or_name),
    seq($.keyword_default, $.keyword_collation, $._account_string_or_name),
    seq(
      $.keyword_default, $.keyword_role,
      choice(
        $.keyword_none,
        seq($.keyword_all, optional(seq($.keyword_except, comma_list($.identifier, true)))),
        comma_list($.identifier, true),
      ),
    ),
    seq(optional($.keyword_local), $.keyword_temporary, $.keyword_tablespace, $._account_string_or_name),
    seq($.keyword_quota, choice($.keyword_unlimited, $._size), $.keyword_on, $.identifier),
    seq($.keyword_profile, $.identifier),
    seq($.keyword_account, choice($.keyword_lock, $.keyword_unlock)),
    seq($.keyword_enable, $.keyword_editions, optional(seq($.keyword_for, comma_list($.identifier, true), $.keyword_force))),
    seq(choice($.keyword_enable, $.keyword_disable), $.keyword_dictionary, $.keyword_protection),
    seq($.keyword_http, $.keyword_digest, choice($.keyword_enable, $.keyword_disable)),
    seq($.keyword_read, choice($.keyword_only, $.keyword_write)),
    seq(
      choice($.keyword_grant, $.keyword_revoke), $.keyword_connect, $.keyword_through,
      choice(seq($.keyword_enterprise, $.keyword_users), $.identifier),
      optional(seq(
        $.keyword_with,
        choice(
          seq($.keyword_role, choice(
            seq($.keyword_all, optional(seq($.keyword_except, comma_list($.identifier, true)))),
            comma_list($.identifier, true),
          )),
          seq($.keyword_no, $.keyword_roles),
        ),
      )),
    ),
    seq(choice($.keyword_add, $.keyword_drop), $.keyword_factor, alias($._literal_string, $.literal),
      optional(seq($.keyword_as, alias($._literal_string, $.literal)))),
    seq(
      choice($.keyword_add, $.keyword_remove, $.keyword_set),
      $.keyword_container_data, '=',
      choice($.keyword_all, $.keyword_default, paren_list($.identifier, true)),
      optional(seq($.keyword_for, $.object_reference)),
    ),
    seq($.keyword_container, '=', choice($.keyword_all, $.keyword_current)),
  ),

  _role_options: $ => choice(
    $._account_option,
    field('option', $.identifier),
    seq(
      $.keyword_valid,
      $.keyword_until,
      field('valid_until', alias($._literal_string, $.literal)),
    ),
    seq(
      $.keyword_connection,
      $.keyword_limit,
      field('connection_limit', alias($._integer, $.literal)),
    ),
    seq(
      optional($.keyword_encrypted),
      $.keyword_password,
      choice(
        field('password', alias($._literal_string, $.literal)),
        $.keyword_null,
      ),
    ),
  ),

  alter_role: $ => prec.left(seq(
    $.keyword_alter,
    choice($.keyword_role, $.keyword_group, $.keyword_user),
    optional($._if_exists),
    choice(comma_list($.identifier, true), $.keyword_all),
    choice(
      $.rename_object,
      seq(optional($.keyword_with), repeat($._role_options)),
      seq(
        optional(seq($.keyword_in, $.keyword_database, $.identifier)),
        choice(
          seq($.keyword_set, $.set_configuration),
          seq($.keyword_reset, choice($.keyword_all, field('option', $.identifier))),
        ),
      ),
    ),
  )),

};
