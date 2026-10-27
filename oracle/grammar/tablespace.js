import { comma_list, make_keyword } from '../../grammar/helpers.js';

// CREATE / ALTER / DROP TABLESPACE (Oracle SQL Language Reference 26ai). Standalone statements,
// reached through _oracle_admin_statement so later admin batches only touch this list.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_autoallocate:   _ => kw('autoallocate'),
  keyword_autoextend:     _ => kw('autoextend'),
  keyword_backup:         _ => kw('backup'),
  keyword_bigfile:        _ => kw('bigfile'),
  keyword_blocksize:      _ => kw('blocksize'),
  keyword_datafiles:      _ => kw('datafiles'),
  keyword_dictionary:     _ => kw('dictionary'),
  keyword_encryption:     _ => kw('encryption'),
  keyword_contents:       _ => kw('contents'),
  keyword_management:     _ => kw('management'),
  keyword_manual:         _ => kw('manual'),
  keyword_normal:         _ => kw('normal'),
  keyword_off:            _ => kw('off'),
  // OFF at prec 1 would shadow the longer OFFSET (prec 0 in the base)
  keyword_offset:         _ => kw('offset'),
  keyword_offline:        _ => kw('offline'),
  keyword_guarantee:      _ => kw('guarantee'),
  keyword_lost:           _ => kw('lost'),
  keyword_maxsize:        _ => kw('maxsize'),
  keyword_minimum:        _ => kw('minimum'),
  keyword_noguarantee:    _ => kw('noguarantee'),
  keyword_permanent:      _ => kw('permanent'),
  keyword_protection:     _ => kw('protection'),
  keyword_resize:         _ => kw('resize'),
  keyword_smallfile:      _ => kw('smallfile'),
  keyword_suspend:        _ => kw('suspend'),
  keyword_tempfile:       _ => kw('tempfile'),
  keyword_uniform:        _ => kw('uniform'),
  keyword_undo:           _ => kw('undo'),

  _oracle_admin_statement: $ => choice(
    $.create_tablespace,
    $.alter_tablespace,
    $.drop_tablespace,
    $.create_profile,
    $.alter_profile,
    $.drop_profile,
    $.alter_synonym_statement,
    $.alter_package_statement,
    $.alter_trigger_statement,
    $.create_domain_statement,
    $.alter_domain_statement,
    $.drop_domain_statement,
  ),

  // 'file' [SIZE n] [REUSE] [AUTOEXTEND …]
  _file_spec: $ => seq(
    alias($._literal_string, $.literal),
    repeat(choice(
      seq($.keyword_size, $._size),
      $.keyword_reuse,
      $._autoextend_clause,
    )),
  ),

  _autoextend_clause: $ => seq(
    $.keyword_autoextend,
    choice(
      $.keyword_off,
      seq(
        $.keyword_on,
        repeat(choice(
          seq($.keyword_next, $._size),
          seq($.keyword_maxsize, choice($.keyword_unlimited, $._size)),
        )),
      ),
    ),
  ),

  _file_clause: $ => seq(
    choice($.keyword_datafile, $.keyword_tempfile),
    optional(choice(
      comma_list($._file_spec, true),
      $._autoextend_clause,
    )),
  ),

  create_tablespace: $ => seq(
    $.keyword_create,
    optional(choice($.keyword_bigfile, $.keyword_smallfile)),
    optional(choice($.keyword_temporary, $.keyword_undo)),
    $.keyword_tablespace,
    optional($._if_not_exists),
    field('name', $.identifier),
    repeat(choice(
      $._file_clause,
      $._tablespace_option,
      choice($.keyword_online, $.keyword_offline),
      seq($.keyword_default, choice($.compression_clause, $.inmemory_clause, $.storage_clause)),
    )),
  ),

  _tablespace_option: $ => choice(
    seq($.keyword_minimum, $.keyword_extent, $._size),
    seq($.keyword_blocksize, $._size),
    choice($.keyword_logging, $.keyword_nologging),
    seq(optional($.keyword_no), $.keyword_force, $.keyword_logging),
    seq($.keyword_encryption, $.keyword_using, alias($._literal_string, $.literal), optional(alias($._literal_string, $.literal)), $.keyword_encrypt),
    seq($.keyword_extent, $.keyword_management, choice(
      $.keyword_dictionary,
      seq($.keyword_local, optional(choice(
        $.keyword_autoallocate,
        seq($.keyword_uniform, optional(seq($.keyword_size, $._size))),
      ))),
    )),
    seq($.keyword_segment, $.keyword_space, $.keyword_management, choice($.keyword_auto, $.keyword_manual)),
    seq($.keyword_flashback, choice($.keyword_on, $.keyword_off)),
    seq($.keyword_retention, choice($.keyword_guarantee, $.keyword_noguarantee)),
    seq($.keyword_tablespace, $.keyword_group, choice($.identifier, alias($._literal_string, $.literal))),
  ),

  alter_tablespace: $ => seq(
    $.keyword_alter,
    $.keyword_tablespace,
    optional($._if_exists),
    field('name', $.identifier),
    $._alter_tablespace_action,
  ),

  _alter_tablespace_action: $ => choice(
    seq($.keyword_add, $._file_clause),
    seq($.keyword_drop, choice($.keyword_datafile, $.keyword_tempfile), choice(alias($._literal_string, $.literal), alias($._natural_number, $.literal))),
    seq($.keyword_rename, $.keyword_datafile, comma_list(alias($._literal_string, $.literal), true), $.keyword_to, comma_list(alias($._literal_string, $.literal), true)),
    seq($.keyword_rename, $.keyword_to, $.identifier),
    seq($.keyword_begin, $.keyword_backup),
    seq($.keyword_end, $.keyword_backup),
    seq(choice($.keyword_online, $.keyword_offline), optional(choice($.keyword_normal, $.keyword_temporary, $.keyword_immediate))),
    seq($.keyword_read, choice($.keyword_only, $.keyword_write)),
    $.keyword_permanent,
    $.keyword_temporary,
    $.keyword_coalesce,
    seq($.keyword_shrink, $.keyword_space, optional(seq($.keyword_keep, $._size))),
    seq($.keyword_shrink, $.keyword_tempfile, alias($._literal_string, $.literal), optional(seq($.keyword_keep, $._size))),
    seq($.keyword_resize, $._size),
    seq(
      choice($.keyword_datafile, $.keyword_tempfile),
      alias($._literal_string, $.literal),
      choice(
        seq(choice($.keyword_online, $.keyword_offline), optional($.keyword_drop)),
        seq($.keyword_resize, $._size),
        $._autoextend_clause,
      ),
    ),
    seq(choice($.keyword_enable, $.keyword_suspend, $.keyword_remove), $.keyword_lost, $.keyword_write, $.keyword_protection),
    seq($.keyword_default, choice($.compression_clause, $.inmemory_clause, $.storage_clause)),
    $._tablespace_option,
  ),

  drop_tablespace: $ => seq(
    $.keyword_drop,
    $.keyword_tablespace,
    optional($._if_exists),
    field('name', $.identifier),
    optional(seq(
      $.keyword_including, $.keyword_contents,
      optional(choice(
        seq($.keyword_and, $.keyword_datafiles),
        seq($.keyword_keep, $.keyword_datafiles),
      )),
    )),
    optional(seq($.keyword_cascade, $.keyword_constraints)),
  ),

};
