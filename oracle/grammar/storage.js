import { paren_list, wrapped_in_parenthesis, make_keyword } from '../../grammar/helpers.js';

// Segment attributes shared by CREATE/ALTER TABLE, CREATE/ALTER INDEX, partitions and the
// materialized view statements: physical attributes, STORAGE (...), compression, LOB and nested
// table storage (Oracle SQL Language Reference 26ai, physical_attributes_clause and friends).

export default {

  // ── Keywords for the segment, partition, ALTER TABLE and index clauses ───────
  // Dialect keywords are token(prec(1)); the longer base keywords that start with one of them are
  // re-declared at the same precedence so longest match still applies (see AGENTS.md).

  keyword_access:                 _ => token(prec(1, make_keyword('access'))),
  keyword_allocate:               _ => token(prec(1, make_keyword('allocate'))),
  keyword_attributes:             _ => token(prec(1, make_keyword('attributes'))),
  keyword_auto:                   _ => token(prec(1, make_keyword('auto'))),
  keyword_basicfile:              _ => token(prec(1, make_keyword('basicfile'))),
  keyword_bitmap:                 _ => token(prec(1, make_keyword('bitmap'))),
  keyword_blockchain:             _ => token(prec(1, make_keyword('blockchain'))),
  keyword_buffer_pool:            _ => token(prec(1, make_keyword('buffer_pool'))),
  keyword_cell_flash_cache:       _ => token(prec(1, make_keyword('cell_flash_cache'))),
  keyword_chunk:                  _ => token(prec(1, make_keyword('chunk'))),
  keyword_cleanup:                _ => token(prec(1, make_keyword('cleanup'))),
  keyword_collation:              _ => token(prec(1, make_keyword('collation'))),
  keyword_collection:             _ => token(prec(1, make_keyword('collection'))),
  keyword_compact:                _ => token(prec(1, make_keyword('compact'))),
  keyword_consistent:             _ => token(prec(1, make_keyword('consistent'))),
  keyword_datafile:               _ => token(prec(1, make_keyword('datafile'))),
  keyword_days:                   _ => token(prec(1, make_keyword('days'))),
  keyword_deallocate:             _ => token(prec(1, make_keyword('deallocate'))),
  keyword_deduplicate:            _ => token(prec(1, make_keyword('deduplicate'))),
  keyword_extent:                 _ => token(prec(1, make_keyword('extent'))),
  keyword_flash_cache:            _ => token(prec(1, make_keyword('flash_cache'))),
  keyword_freelist:               _ => token(prec(1, make_keyword('freelist'))),
  keyword_freelists:              _ => token(prec(1, make_keyword('freelists'))),
  keyword_freepools:              _ => token(prec(1, make_keyword('freepools'))),
  keyword_hashing:                _ => token(prec(1, make_keyword('hashing'))),
  keyword_identifier:             _ => token(prec(1, make_keyword('identifier'))),
  keyword_idle:                   _ => token(prec(1, make_keyword('idle'))),
  keyword_indexes:                _ => token(prec(1, make_keyword('indexes'))),
  keyword_indexing:               _ => token(prec(1, make_keyword('indexing'))),
  keyword_indextype:              _ => token(prec(1, make_keyword('indextype'))),
  keyword_initial:                _ => token(prec(1, make_keyword('initial'))),
  keyword_instance:               _ => token(prec(1, make_keyword('instance'))),
  keyword_invalidate:             _ => token(prec(1, make_keyword('invalidate'))),
  keyword_invalidation:           _ => token(prec(1, make_keyword('invalidation'))),
  keyword_keep_duplicates:        _ => token(prec(1, make_keyword('keep_duplicates'))),
  keyword_lob:                    _ => token(prec(1, make_keyword('lob'))),
  keyword_location:               _ => token(prec(1, make_keyword('location'))),
  keyword_locator:                _ => token(prec(1, make_keyword('locator'))),
  keyword_mapping:                _ => token(prec(1, make_keyword('mapping'))),
  keyword_max:                    _ => token(prec(1, make_keyword('max'))),
  keyword_maxextents:             _ => token(prec(1, make_keyword('maxextents'))),
  keyword_memoptimize:            _ => token(prec(1, make_keyword('memoptimize'))),
  keyword_min:                    _ => token(prec(1, make_keyword('min'))),
  keyword_minextents:             _ => token(prec(1, make_keyword('minextents'))),
  keyword_move:                   _ => token(prec(1, make_keyword('move'))),
  keyword_multivalue:             _ => token(prec(1, make_keyword('multivalue'))),
  keyword_nested:                 _ => token(prec(1, make_keyword('nested'))),
  keyword_nomapping:              _ => token(prec(1, make_keyword('nomapping'))),
  keyword_noprecheck:             _ => token(prec(1, make_keyword('noprecheck'))),
  keyword_nosort:                 _ => token(prec(1, make_keyword('nosort'))),
  keyword_object:                 _ => token(prec(1, make_keyword('object'))),
  keyword_opaque:                 _ => token(prec(1, make_keyword('opaque'))),
  keyword_optimal:                _ => token(prec(1, make_keyword('optimal'))),
  keyword_overflow:               _ => token(prec(1, make_keyword('overflow'))),
  keyword_packed:                 _ => token(prec(1, make_keyword('packed'))),
  keyword_parameters:             _ => token(prec(1, make_keyword('parameters'))),
  keyword_partial:                _ => token(prec(1, make_keyword('partial'))),
  keyword_pctincrease:            _ => token(prec(1, make_keyword('pctincrease'))),
  keyword_pctthreshold:           _ => token(prec(1, make_keyword('pctthreshold'))),
  keyword_pctversion:             _ => token(prec(1, make_keyword('pctversion'))),
  keyword_period:                 _ => token(prec(1, make_keyword('period'))),
  keyword_precheck:               _ => token(prec(1, make_keyword('precheck'))),
  keyword_reads:                  _ => token(prec(1, make_keyword('reads'))),
  keyword_recycle:                _ => token(prec(1, make_keyword('recycle'))),
  keyword_ref:                    _ => token(prec(1, make_keyword('ref'))),
  keyword_reference:              _ => token(prec(1, make_keyword('reference'))),
  keyword_reject:                 _ => token(prec(1, make_keyword('reject'))),
  keyword_relational:             _ => token(prec(1, make_keyword('relational'))),
  keyword_retention:              _ => token(prec(1, make_keyword('retention'))),
  keyword_securefile:             _ => token(prec(1, make_keyword('securefile'))),
  keyword_shrink:                 _ => token(prec(1, make_keyword('shrink'))),
  keyword_sort:                   _ => token(prec(1, make_keyword('sort'))),
  keyword_space:                  _ => token(prec(1, make_keyword('space'))),
  keyword_staging:                _ => token(prec(1, make_keyword('staging'))),
  keyword_template:               _ => token(prec(1, make_keyword('template'))),
  keyword_triggers:               _ => token(prec(1, make_keyword('triggers'))),
  keyword_unlimited:              _ => token(prec(1, make_keyword('unlimited'))),
  keyword_unpacked:               _ => token(prec(1, make_keyword('unpacked'))),
  keyword_unused:                 _ => token(prec(1, make_keyword('unused'))),
  keyword_validation:             _ => token(prec(1, make_keyword('validation'))),
  keyword_varray:                 _ => token(prec(1, make_keyword('varray'))),
  keyword_version:                _ => token(prec(1, make_keyword('version'))),
  keyword_xmltype:                _ => token(prec(1, make_keyword('xmltype'))),

  keyword_initially:              _ => token(prec(1, make_keyword('initially'))),
  keyword_maxvalue:               _ => token(prec(1, make_keyword('maxvalue'))),
  keyword_minvalue:               _ => token(prec(1, make_keyword('minvalue'))),
  keyword_references:             _ => token(prec(1, make_keyword('references'))),
  keyword_refresh:                _ => token(prec(1, make_keyword('refresh'))),
  keyword_referencing:            _ => token(prec(1, make_keyword('referencing'))),

  // Segment attributes, accepted in any order. Redefines the list in mviews.js (this file is
  // spread later); everything it accepted is still here.
  _oracle_physical_attribute: $ => choice(
    seq($.keyword_tablespace, $.identifier),
    seq($.keyword_tablespace, $.keyword_set, $.identifier),
    seq($.keyword_pctfree, $.literal),
    seq($.keyword_pctused, $.literal),
    seq($.keyword_initrans, $.literal),
    seq($.keyword_parallel, optional(alias($._natural_number, $.literal))),
    $.keyword_noparallel,
    $.keyword_cache,
    $.keyword_nocache,
    choice($.keyword_logging, $.keyword_nologging),
    $.storage_clause,
    $.compression_clause,
  ),

  // A size such as 64K, 1M or 100: the digits, then an optional unit letter.
  _size: $ => seq(alias($._natural_number, $.literal), optional($.size_unit)),

  // K, M, G, T, P or E, written directly after the digits (64K, not 64 K).
  size_unit: _ => token.immediate(/[KMGTPEkmgtpe]/),

  storage_clause: $ => seq(
    $.keyword_storage,
    '(',
    repeat1(seq($._storage_option, optional(','))),
    ')',
  ),

  _storage_option: $ => choice(
    seq($.keyword_initial, $._size),
    seq($.keyword_next, $._size),
    seq($.keyword_minextents, alias($._natural_number, $.literal)),
    seq($.keyword_maxextents, choice(alias($._natural_number, $.literal), $.keyword_unlimited)),
    seq($.keyword_pctincrease, alias($._natural_number, $.literal)),
    seq($.keyword_freelists, alias($._natural_number, $.literal)),
    seq($.keyword_freelist, $.keyword_groups, alias($._natural_number, $.literal)),
    seq($.keyword_optimal, optional(choice($._size, $.keyword_null))),
    seq($.keyword_buffer_pool, choice($.keyword_keep, $.keyword_recycle, $.keyword_default)),
    seq($.keyword_flash_cache, choice($.keyword_keep, $.keyword_none, $.keyword_default)),
    seq($.keyword_cell_flash_cache, choice($.keyword_keep, $.keyword_none, $.keyword_default)),
  ),

  // LOB (c [, …]) STORE AS [SECUREFILE | BASICFILE] [segment] [(parameters)]
  lob_storage_clause: $ => seq(
    $.keyword_lob,
    paren_list($.identifier, true),
    $.keyword_store, $.keyword_as,
    optional(choice($.keyword_securefile, $.keyword_basicfile)),
    optional($.identifier),
    optional(wrapped_in_parenthesis(repeat1($._lob_parameter))),
  ),

  // VARRAY v STORE AS [SECUREFILE | BASICFILE] LOB [segment] [(parameters)]
  varray_storage_clause: $ => seq(
    $.keyword_varray, $.identifier,
    $.keyword_store, $.keyword_as,
    optional(choice($.keyword_securefile, $.keyword_basicfile)),
    $.keyword_lob,
    optional($.identifier),
    optional(wrapped_in_parenthesis(repeat1($._lob_parameter))),
  ),

  _lob_parameter: $ => choice(
    seq($.keyword_tablespace, $.identifier),
    seq(choice($.keyword_enable, $.keyword_disable), $.keyword_storage, $.keyword_in, $.keyword_row),
    seq($.keyword_chunk, $._size),
    seq($.keyword_pctversion, alias($._natural_number, $.literal)),
    seq($.keyword_retention, optional(choice(
      $.keyword_max, $.keyword_auto, $.keyword_none,
      seq($.keyword_min, alias($._natural_number, $.literal)),
    ))),
    seq($.keyword_freepools, alias($._natural_number, $.literal)),
    seq($.keyword_cache, optional($.keyword_reads)),
    $.keyword_nocache,
    choice($.keyword_logging, $.keyword_nologging),
    seq($.keyword_compress, optional(choice($.keyword_high, $.keyword_medium, $.keyword_low))),
    $.keyword_nocompress,
    seq(optional($.keyword_no), $.keyword_deduplicate),
    $.keyword_keep_duplicates,
    $._encrypt_clause,
    $.keyword_decrypt,
    $.storage_clause,
  ),

  // NESTED TABLE c STORE AS t [(attributes)] [RETURN AS {LOCATOR | VALUE}]
  nested_table_clause: $ => seq(
    $.keyword_nested, $.keyword_table, $.identifier,
    $.keyword_store, $.keyword_as, $.identifier,
    optional(wrapped_in_parenthesis(repeat($._oracle_physical_attribute))),
    optional(seq($.keyword_return, $.keyword_as, choice($.keyword_locator, $.keyword_value))),
  ),

  // XMLTYPE [COLUMN c] STORE AS {CLOB | BINARY XML | OBJECT RELATIONAL}
  xmltype_storage_clause: $ => seq(
    $.keyword_xmltype,
    optional(seq($.keyword_column, $.identifier)),
    $.keyword_store, $.keyword_as,
    choice(
      seq(optional(choice($.keyword_securefile, $.keyword_basicfile)), $.keyword_clob),
      seq($.keyword_binary, $.keyword_xml),
      seq($.keyword_object, $.keyword_relational),
    ),
  ),

};
