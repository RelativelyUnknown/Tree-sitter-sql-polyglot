import { comma_list, paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// CREATE / ALTER / DROP PLUGGABLE DATABASE (Oracle SQL Language Reference 26ai). Explicit vocabularies for the clauses
// the reference lists; reached through _oracle_admin_statement.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_abort:                _ => kw('abort'),
  keyword_application:          _ => kw('application'),
  keyword_copy:                 _ => kw('copy'),
  keyword_every:                _ => kw('every'),
  keyword_file_name_convert:    _ => kw('file_name_convert'),
  keyword_global_name:          _ => kw('global_name'),
  keyword_hours:                _ => kw('hours'),
  keyword_install:              _ => kw('install'),
  keyword_instances:            _ => kw('instances'),
  keyword_max_audit_size:       _ => kw('max_audit_size'),
  keyword_max_shared_temp_size: _ => kw('max_shared_temp_size'),
  keyword_minutes:              _ => kw('minutes'),
  keyword_patch:                _ => kw('patch'),
  keyword_path_prefix:          _ => kw('path_prefix'),
  keyword_proxy:                _ => kw('proxy'),
  keyword_service_name_convert: _ => kw('service_name_convert'),
  keyword_unplug:               _ => kw('unplug'),
  keyword_upgrade:              _ => kw('upgrade'),

  // CREATE PLUGGABLE DATABASE pdb [AS {SEED | APPLICATION CONTAINER | PROXY FROM pdb@link}] [ADMIN USER …]
  //   [FROM source | USING 'manifest.xml'] [options]
  create_pluggable_database: $ => seq(
    $.keyword_create, $.keyword_pluggable, $.keyword_database,
    $.identifier,
    optional($._pdb_kind),
    optional($._pdb_admin_user),
    optional($._pdb_source),
    repeat($._pdb_create_option),
  ),

  _pdb_kind: $ => seq($.keyword_as, choice(
    $.keyword_seed,
    seq($.keyword_application, $.keyword_container),
    seq($.keyword_proxy, $.keyword_from, $.object_reference),
  )),

  // ADMIN USER name IDENTIFIED BY password [ROLES = (role, …)]
  _pdb_admin_user: $ => seq(
    $.keyword_admin, $.keyword_user, $.identifier,
    $.keyword_identified, $.keyword_by, choice($.identifier, alias($._literal_string, $.literal)),
    optional(seq($.keyword_roles, '=', paren_list($.identifier, true))),
  ),

  // FROM pdb[@link] | USING 'file.xml'
  _pdb_source: $ => choice(
    seq($.keyword_from, $.object_reference),
    seq($.keyword_using, alias($._literal_string, $.literal)),
  ),

  _pdb_create_option: $ => choice(
    seq($.keyword_file_name_convert, '=', choice(paren_list(alias($._literal_string, $.literal), true), $.keyword_none)),
    seq($.keyword_service_name_convert, '=', paren_list(alias($._literal_string, $.literal), true)),
    seq($.keyword_path_prefix, '=', alias($._literal_string, $.literal)),
    seq($.keyword_default, $.keyword_tablespace, $.identifier),
    $._pdb_storage,
    seq($.keyword_snapshot, $.keyword_copy),
    seq($.keyword_no, $.keyword_data),
    seq($.keyword_refresh, $.keyword_mode, $._pdb_refresh_mode),
    $.keyword_copy,
    $.keyword_nocopy,
    $.keyword_move,
    seq($.keyword_tempfile, $.keyword_reuse),
  ),

  // MANUAL | NONE | EVERY n {MINUTES | HOURS}
  _pdb_refresh_mode: $ => choice(
    $.keyword_manual,
    $.keyword_none,
    seq($.keyword_every, alias($._natural_number, $.literal), choice($.keyword_minutes, $.keyword_hours)),
  ),

  // STORAGE UNLIMITED | STORAGE (MAXSIZE {size | UNLIMITED} MAX_AUDIT_SIZE size MAX_SHARED_TEMP_SIZE size)
  _pdb_storage: $ => seq($.keyword_storage, choice(
    $.keyword_unlimited,
    wrapped_in_parenthesis(repeat1(choice(
      seq($.keyword_maxsize, choice($._size, $.keyword_unlimited)),
      seq($.keyword_max_audit_size, choice($._size, $.keyword_unlimited)),
      seq($.keyword_max_shared_temp_size, choice($._size, $.keyword_unlimited)),
    ))),
  )),

  // ALTER PLUGGABLE DATABASE [pdb, … | ALL [EXCEPT pdb, …]] action
  alter_pluggable_database: $ => seq(
    $.keyword_alter, $.keyword_pluggable, $.keyword_database,
    optional($._pdb_target),
    $._pdb_alter_action,
  ),

  _pdb_target: $ => choice(
    seq($.keyword_all, optional(seq($.keyword_except, comma_list($.identifier, true)))),
    comma_list($.identifier, true),
  ),

  _pdb_alter_action: $ => choice(
    seq($.keyword_open, repeat($._pdb_open_option)),
    seq($.keyword_close, repeat(choice($.keyword_immediate, $.keyword_abort, $._pdb_instances))),
    seq($.keyword_datafile, choice($.keyword_all, alias($._literal_string, $.literal)), choice($.keyword_online, $.keyword_offline)),
    seq($.keyword_refresh, optional(seq($.keyword_mode, $._pdb_refresh_mode))),
    $._pdb_storage,
    seq($.keyword_unplug, $.keyword_into, alias($._literal_string, $.literal)),
    seq($.keyword_rename, $.keyword_global_name, $.keyword_to, $.identifier),
    seq($.keyword_default, $.keyword_tablespace, $.identifier),
    seq($.keyword_application, $.identifier, $._pdb_application_action),
  ),

  _pdb_open_option: $ => choice(
    seq($.keyword_read, $.keyword_write),
    seq($.keyword_read, $.keyword_only),
    $.keyword_restricted,
    $.keyword_force,
    $.keyword_upgrade,
    $._pdb_instances,
  ),

  _pdb_instances: $ => seq($.keyword_instances, '=', choice($.keyword_all, paren_list(alias($._literal_string, $.literal), true))),

  // BEGIN INSTALL 'v' | END INSTALL ['v'] | BEGIN PATCH n | END PATCH [n] | BEGIN UPGRADE 'v' TO 'w' | END UPGRADE | SYNC
  _pdb_application_action: $ => choice(
    seq($.keyword_begin, $.keyword_install, alias($._literal_string, $.literal)),
    seq($.keyword_end, $.keyword_install, optional(alias($._literal_string, $.literal))),
    seq($.keyword_begin, $.keyword_patch, alias($._natural_number, $.literal)),
    seq($.keyword_end, $.keyword_patch, optional(alias($._natural_number, $.literal))),
    seq($.keyword_begin, $.keyword_upgrade, alias($._literal_string, $.literal), optional(seq($.keyword_to, alias($._literal_string, $.literal)))),
    seq($.keyword_end, $.keyword_upgrade),
    $.keyword_sync,
  ),

  // DROP PLUGGABLE DATABASE pdb [KEEP DATAFILES | INCLUDING DATAFILES]
  drop_pluggable_database: $ => seq(
    $.keyword_drop, $.keyword_pluggable, $.keyword_database,
    $.identifier,
    optional(seq(choice($.keyword_keep, $.keyword_including), $.keyword_datafiles)),
  ),

};
