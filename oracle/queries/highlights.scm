; inherits: sql

; Oracle/PL-SQL keywords
[
  (keyword_connect)
  (keyword_national)
  (keyword_operator)
  (keyword_binding)
  (keyword_prior)
  (keyword_nocycle)
  (keyword_siblings)
  (keyword_forall)
  (keyword_indices)
  (keyword_rowtype)
  (keyword_save)
  (keyword_target)
  (keyword_exceptions)
  (keyword_elsif)
  (keyword_exit)
  (keyword_reverse)
  (keyword_continue)
  (keyword_loop)
  (keyword_declare)
  (keyword_atomic)
] @keyword

; Locking, MODEL, ALTER SYSTEM/SESSION, DIRECTORY, ANALYZE (#101, #107, #108, #111)
[
  (keyword_skip)
  (keyword_locked)
  (keyword_model)
  (keyword_nav)
  (keyword_keep)
  (keyword_updated)
  (keyword_dimension)
  (keyword_measures)
  (keyword_rules)
  (keyword_upsert)
  (keyword_sequential)
  (keyword_automatic)
  (keyword_iterate)
  (keyword_system)
  (keyword_scope)
  (keyword_sid)
  (keyword_memory)
  (keyword_spfile)
  (keyword_flush)
  (keyword_kill)
  (keyword_checkpoint)
  (keyword_switch)
  (keyword_logfile)
  (keyword_archive)
  (keyword_log)
  (keyword_directory)
  (keyword_compute)
  (keyword_estimate)
  (keyword_validate)
  (keyword_structure)
  (keyword_sample)
  (keyword_statistics)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword

; ============================================================
; Remaining oracle keywords
; ============================================================

[
  (keyword_associate)
  (keyword_at)
  (keyword_audit)
  (keyword_authenticated)
  (keyword_authid)
  (keyword_body)
  (keyword_build)
  (keyword_bulk)
  (keyword_byte)
  (keyword_call)
  (keyword_character)
  (keyword_close)
  (keyword_cluster)
  (keyword_coalesce)
  (keyword_collect)
  (keyword_columns)
  (keyword_compile)
  (keyword_complete)
  (keyword_consider)
  (keyword_context)
  (keyword_day)
  (keyword_define)
  (keyword_demand)
  (keyword_dense_rank)
  (keyword_disassociate)
  (keyword_editionable)
  (keyword_exception)
  (keyword_exchange)
  (keyword_excluding)
  (keyword_exclusive)
  (keyword_extension)
  (keyword_fast)
  (keyword_flashback)
  (keyword_fresh)
  (keyword_hash)
  (keyword_heap)
  (keyword_identified)
  (keyword_ignore)
  (keyword_include)
  (keyword_including)
  (keyword_initrans)
  (keyword_less)
  (keyword_link)
  (keyword_list)
  (keyword_lock)
  (keyword_logging)
  (keyword_master)
  (keyword_match)
  (keyword_match_recognize)
  (keyword_mode)
  (keyword_monitoring)
  (keyword_month)
  (keyword_never)
  (keyword_noaudit)
  (keyword_nocache)
  (keyword_nologging)
  (keyword_noneditionable)
  (keyword_noparallel)
  (keyword_noreverse)
  (keyword_one)
  (keyword_online)
  (keyword_open)
  (keyword_organization)
  (keyword_package)
  (keyword_partitions)
  (keyword_passing)
  (keyword_past)
  (keyword_path)
  (keyword_pattern)
  (keyword_pctfree)
  (keyword_pctused)
  (keyword_per)
  (keyword_pipe)
  (keyword_pivot)
  (keyword_plan)
  (keyword_point)
  (keyword_policy)
  (keyword_pragma)
  (keyword_prebuilt)
  (keyword_pruning)
  (keyword_purge)
  (keyword_query)
  (keyword_rebuild)
  (keyword_restore)
  (keyword_returning)
  (keyword_reuse)
  (keyword_rewrite)
  (keyword_scn)
  (keyword_second)
  (keyword_segment)
  (keyword_selectivity)
  (keyword_share)
  (keyword_shared)
  (keyword_size)
  (keyword_source)
  (keyword_split)
  (keyword_storage)
  (keyword_subpartition)
  (keyword_subpartitions)
  (keyword_successful)
  (keyword_synonym)
  (keyword_than)
  (keyword_unpivot)
  (keyword_unusable)
  (keyword_whenever)
  (keyword_while)
  (keyword_year)
  (keyword_zonemap)
] @keyword

[
  (keyword_bfile)
  (keyword_binary_double)
  (keyword_binary_float)
  (keyword_blob)
  (keyword_clob)
  (keyword_long)
  (keyword_nclob)
  (keyword_number)
  (keyword_nvarchar2)
  (keyword_raw)
  (keyword_rowid)
  (keyword_urowid)
  (keyword_varchar2)
] @type.builtin

[
  (keyword_current_user)
  (keyword_json_table)
  (keyword_xmltable)
] @function.builtin

; Keywords that moved out of the ISO base grammar into the rules of this dialect
[
  (keyword_cache)
  (keyword_change)
  (keyword_collate)
  (keyword_concurrently)
  (keyword_connection)
  (keyword_disable)
  (keyword_enable)
  (keyword_encrypted)
  (keyword_force)
  (keyword_logged)
  (keyword_modify)
  (keyword_none)
  (keyword_nowait)
  (keyword_owned)
  (keyword_owner)
  (keyword_password)
  (keyword_refresh)
  (keyword_rename)
  (keyword_reset)
  (keyword_tables)
  (keyword_tablespace)
  (keyword_temp)
  (keyword_unlogged)
  (keyword_until)
  (keyword_valid)
  (keyword_value)
  (keyword_wait)
] @keyword
(keyword_percent) @keyword

; CREATE TABLE column / table property vocabulary (grammar/table_ddl.js)
(keyword_advanced) @keyword
(keyword_annotations) @keyword
(keyword_archival) @keyword
(keyword_basic) @keyword
(keyword_capacity) @keyword
(keyword_compress) @keyword
(keyword_creation) @keyword
(keyword_critical) @keyword
(keyword_decrypt) @keyword
(keyword_definition) @keyword
(keyword_dml) @keyword
(keyword_domain) @keyword
(keyword_duplicated) @keyword
(keyword_encrypt) @keyword
(keyword_extended) @keyword
(keyword_high) @keyword
(keyword_inmemory) @keyword
(keyword_invisible) @keyword
(keyword_low) @keyword
(keyword_medium) @keyword
(keyword_memcompress) @keyword
(keyword_metadata) @keyword
(keyword_movement) @keyword
(keyword_nocompress) @keyword
(keyword_nomaxvalue) @keyword
(keyword_nominvalue) @keyword
(keyword_noorder) @keyword
(keyword_norely) @keyword
(keyword_norowdependencies) @keyword
(keyword_novalidate) @keyword
(keyword_oltp) @keyword
(keyword_preserve) @keyword
(keyword_priority) @keyword
(keyword_private) @keyword
(keyword_rely) @keyword
(keyword_result_cache) @keyword
(keyword_rowdependencies) @keyword
(keyword_salt) @keyword
(keyword_sharded) @keyword
(keyword_sharing) @keyword
(keyword_store) @keyword
(keyword_virtual) @keyword
(keyword_visible) @keyword
(keyword_deferrable) @keyword
(keyword_initially) @keyword
(keyword_access) @keyword
(keyword_allocate) @keyword
(keyword_attributes) @keyword
(keyword_auto) @keyword
(keyword_basicfile) @keyword
(keyword_bitmap) @keyword
(keyword_blockchain) @keyword
(keyword_buffer_pool) @keyword
(keyword_cell_flash_cache) @keyword
(keyword_chunk) @keyword
(keyword_cleanup) @keyword
(keyword_collation) @keyword
(keyword_collection) @keyword
(keyword_compact) @keyword
(keyword_consistent) @keyword
(keyword_datafile) @keyword
(keyword_days) @keyword
(keyword_deallocate) @keyword
(keyword_deduplicate) @keyword
(keyword_extent) @keyword
(keyword_flash_cache) @keyword
(keyword_freelist) @keyword
(keyword_freelists) @keyword
(keyword_freepools) @keyword
(keyword_hashing) @keyword
(keyword_identifier) @keyword
(keyword_idle) @keyword
(keyword_indexes) @keyword
(keyword_indexing) @keyword
(keyword_indextype) @keyword
(keyword_initial) @keyword
(keyword_instance) @keyword
(keyword_invalidate) @keyword
(keyword_invalidation) @keyword
(keyword_keep_duplicates) @keyword
(keyword_lob) @keyword
(keyword_location) @keyword
(keyword_locator) @keyword
(keyword_mapping) @keyword
(keyword_max) @keyword
(keyword_maxextents) @keyword
(keyword_memoptimize) @keyword
(keyword_min) @keyword
(keyword_minextents) @keyword
(keyword_move) @keyword
(keyword_multivalue) @keyword
(keyword_nested) @keyword
(keyword_nomapping) @keyword
(keyword_noprecheck) @keyword
(keyword_nosort) @keyword
(keyword_object) @keyword
(keyword_opaque) @keyword
(keyword_optimal) @keyword
(keyword_overflow) @keyword
(keyword_packed) @keyword
(keyword_parameters) @keyword
(keyword_partial) @keyword
(keyword_pctincrease) @keyword
(keyword_pctthreshold) @keyword
(keyword_pctversion) @keyword
(keyword_period) @keyword
(keyword_precheck) @keyword
(keyword_reads) @keyword
(keyword_recycle) @keyword
(keyword_ref) @keyword
(keyword_reference) @keyword
(keyword_reject) @keyword
(keyword_relational) @keyword
(keyword_retention) @keyword
(keyword_securefile) @keyword
(keyword_shrink) @keyword
(keyword_sort) @keyword
(keyword_space) @keyword
(keyword_staging) @keyword
(keyword_template) @keyword
(keyword_triggers) @keyword
(keyword_unlimited) @keyword
(keyword_unpacked) @keyword
(keyword_unused) @keyword
(keyword_validation) @keyword
(keyword_varray) @keyword
(keyword_version) @keyword
(keyword_xmltype) @keyword
(keyword_apply) @keyword
(keyword_block) @keyword
(keyword_seed) @keyword
(keyword_versions) @keyword
(keyword_errors) @keyword
(keyword_name) @keyword
(keyword_seconds) @keyword
(keyword_accessible) @keyword
(keyword_aggregate) @keyword
(keyword_constant) @keyword
(keyword_deterministic) @keyword
(keyword_goto) @keyword
(keyword_javascript) @keyword
(keyword_library) @keyword
(keyword_mle) @keyword
(keyword_module) @keyword
(keyword_mutable) @keyword
(keyword_nocopy) @keyword
(keyword_pairs) @keyword
(keyword_parallel_enable) @keyword
(keyword_pipelined) @keyword
(keyword_polymorphic) @keyword
(keyword_raise) @keyword
(keyword_record) @keyword
(keyword_relies_on) @keyword
(keyword_repeat) @keyword
(keyword_shard_enable) @keyword
(keyword_signature) @keyword
(keyword_sql_macro) @keyword
(keyword_subtype) @keyword
(keyword_bulk_exceptions) @keyword
(keyword_bulk_rowcount) @keyword
(keyword_found) @keyword
(keyword_isopen) @keyword
(keyword_notfound) @keyword
(keyword_rowcount) @keyword
(keyword_batch) @keyword
(keyword_bequeath) @keyword
(keyword_computation) @keyword
(keyword_concurrent) @keyword
(keyword_edition) @keyword
(keyword_editioning) @keyword
(keyword_enforced) @keyword
(keyword_evaluate) @keyword
(keyword_id) @keyword
(keyword_indicator) @keyword
(keyword_recompile) @keyword
(keyword_reduced) @keyword
(keyword_trusted) @keyword
(keyword_under) @keyword
(keyword_use) @keyword
(keyword_absent) @keyword
(keyword_allow) @keyword
(keyword_append) @keyword
(keyword_ascii) @keyword
(keyword_conditional) @keyword
(keyword_disallow) @keyword
(keyword_empty) @keyword
(keyword_error) @keyword
(keyword_format) @keyword
(keyword_json_array) @keyword
(keyword_json_arrayagg) @keyword
(keyword_json_exists) @keyword
(keyword_json_object) @keyword
(keyword_json_objectagg) @keyword
(keyword_json_query) @keyword
(keyword_json_serialize) @keyword
(keyword_json_transform) @keyword
(keyword_json_value) @keyword
(keyword_keys) @keyword
(keyword_lax) @keyword
(keyword_mismatch) @keyword
(keyword_missing) @keyword
(keyword_omit) @keyword
(keyword_ordered) @keyword
(keyword_prepend) @keyword
(keyword_pretty) @keyword
(keyword_quotes) @keyword
(keyword_remove) @keyword
(keyword_rename_op) @keyword
(keyword_scalar) @keyword
(keyword_scalars) @keyword
(keyword_unconditional) @keyword
(keyword_unknown) @keyword
(keyword_wrapper) @keyword
(keyword_autoallocate) @keyword
(keyword_autoextend) @keyword
(keyword_backup) @keyword
(keyword_bigfile) @keyword
(keyword_blocksize) @keyword
(keyword_datafiles) @keyword
(keyword_dictionary) @keyword
(keyword_encryption) @keyword
(keyword_contents) @keyword
(keyword_management) @keyword
(keyword_manual) @keyword
(keyword_normal) @keyword
(keyword_off) @keyword
(keyword_offset) @keyword
(keyword_offline) @keyword
(keyword_guarantee) @keyword
(keyword_lost) @keyword
(keyword_maxsize) @keyword
(keyword_minimum) @keyword
(keyword_noguarantee) @keyword
(keyword_permanent) @keyword
(keyword_protection) @keyword
(keyword_resize) @keyword
(keyword_smallfile) @keyword
(keyword_suspend) @keyword
(keyword_tempfile) @keyword
(keyword_uniform) @keyword
(keyword_undo) @keyword
(keyword_composite_limit) @keyword
(keyword_connect_time) @keyword
(keyword_cpu_per_call) @keyword
(keyword_cpu_per_session) @keyword
(keyword_failed_login_attempts) @keyword
(keyword_idle_time) @keyword
(keyword_inactive_account_time) @keyword
(keyword_container) @keyword
(keyword_logical_reads_per_call) @keyword
(keyword_logical_reads_per_session) @keyword
(keyword_mandatory) @keyword
(keyword_password_grace_time) @keyword
(keyword_password_life_time) @keyword
(keyword_password_lock_time) @keyword
(keyword_password_reuse_max) @keyword
(keyword_password_reuse_time) @keyword
(keyword_password_rollover_time) @keyword
(keyword_password_verify_function) @keyword
(keyword_private_sga) @keyword
(keyword_profile) @keyword
(keyword_sessions_per_user) @keyword
(keyword_noextend) @keyword
(keyword_noscale) @keyword
(keyword_noshard) @keyword
(keyword_nokeep) @keyword
(keyword_scale) @keyword
(keyword_shard) @keyword
(keyword_extend) @keyword
