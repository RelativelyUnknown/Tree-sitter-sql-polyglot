; inherits: sql

; ── Snowflake-specific keywords ─────────────────────────────────────────────

[
  (keyword_at)
  (keyword_before)
  (keyword_qualify)
  (keyword_pivot)
  (keyword_unpivot)
  (keyword_include)
  (keyword_exclude)
  (keyword_match_recognize)
  (keyword_measures)
  (keyword_pattern)
  (keyword_define)
  (keyword_skip)
  (keyword_one)
  (keyword_per)
  (keyword_past)
  (keyword_next)
  (keyword_let)
  (keyword_raise)
  (keyword_exception)
  (keyword_declare)
  (keyword_execute)
  (keyword_immediate)
  (keyword_task)
  (keyword_copy)
  (keyword_stream)
  (keyword_dynamic)
  (keyword_warehouse)
  (keyword_schedule)
  (keyword_secure)
  (keyword_masking)
  (keyword_target_lag)
  (keyword_access)
  (keyword_storage)
  (keyword_api)
  (keyword_notification)
  (keyword_enabled)
  (keyword_secondary)
  (keyword_roles)
  (keyword_returns)
  (keyword_session)
  (keyword_modify)
] @keyword

; ── Stage references (@stage_name) ─────────────────────────────────────────

(stage_ref) @string.special

; Snowflake STAGE DDL keywords
[
  (keyword_stage)
  (keyword_url)
  (keyword_credentials)
  (keyword_file_format)
  (keyword_copy_options)
  (keyword_directory)
  (keyword_encryption)
  (keyword_pattern)
  (keyword_list)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword

; ============================================================
; Remaining snowflake keywords
; ============================================================

[
  (keyword_abort)
  (keyword_account)
  (keyword_auto_resume)
  (keyword_auto_suspend)
  (keyword_call)
  (keyword_catalog)
  (keyword_clone)
  (keyword_recluster)
  (keyword_search)
  (keyword_optimization)
  (keyword_global)
  (keyword_transient)
  (keyword_tags)
  (keyword_tag)
  (keyword_template)
  (keyword_autoincrement)
  (keyword_identity)
  (keyword_noorder)
  (keyword_projection)
  (keyword_aggregation)
  (keyword_entity)
  (keyword_allowed)
  (keyword_keys)
  (keyword_lifecycle)
  (keyword_contact)
  (keyword_virtual)
  (keyword_enforced)
  (keyword_rely)
  (keyword_norely)
  (keyword_validate)
  (keyword_novalidate)
  (keyword_cluster)
  (keyword_clustering)
  (keyword_columns)
  (keyword_connect)
  (keyword_databases)
  (keyword_describe)
  (keyword_do)
  (keyword_economy)
  (keyword_extension)
  (keyword_file)
  (keyword_files)
  (keyword_format)
  (keyword_formats)
  (keyword_functions)
  (keyword_get)
  (keyword_grants)
  (keyword_hash)
  (keyword_ignore)
  (keyword_ilike)
  (keyword_integration)
  (keyword_integrations)
  (keyword_location)
  (keyword_locks)
  (keyword_match)
  (keyword_max_cluster_count)
  (keyword_min_cluster_count)
  (keyword_nocycle)
  (keyword_overwrite)
  (keyword_parameters)
  (keyword_pipe)
  (keyword_pipes)
  (keyword_policies)
  (keyword_policy)
  (keyword_prior)
  (keyword_procedures)
  (keyword_put)
  (keyword_queries)
  (keyword_remove)
  (keyword_resume)
  (keyword_returning)
  (keyword_scaling_policy)
  (keyword_schemas)
  (keyword_sequences)
  (keyword_show)
  (keyword_stages)
  (keyword_standard)
  (keyword_starts)
  (keyword_streams)
  (keyword_suspend)
  (keyword_swap)
  (keyword_tasks)
  (keyword_terse)
  (keyword_transactions)
  (keyword_undrop)
  (keyword_unset)
  (keyword_use)
  (keyword_users)
  (keyword_views)
  (keyword_warehouse_size)
  (keyword_warehouses)
] @keyword

; Keywords that moved out of the ISO base grammar into the rules of this dialect
[
  (keyword_cache)
  (keyword_change)
  (keyword_collate)
  (keyword_concurrently)
  (keyword_connection)
  (keyword_deferrable)
  (keyword_disable)
  (keyword_enable)
  (keyword_encrypted)
  (keyword_force)
  (keyword_initially)
  (keyword_logged)
  (keyword_none)
  (keyword_nowait)
  (keyword_owned)
  (keyword_owner)
  (keyword_password)
  (keyword_refresh)
  (keyword_rename)
  (keyword_reset)
  (keyword_snapshot)
  (keyword_tables)
  (keyword_tablespace)
  (keyword_temp)
  (keyword_unlogged)
  (keyword_until)
  (keyword_valid)
  (keyword_value)
  (keyword_wait)
] @keyword
(keyword_aggregate) @keyword
(keyword_allowed_values) @keyword
(keyword_caller) @keyword
(keyword_managed) @keyword
(keyword_memoizable) @keyword
(keyword_output) @keyword
(keyword_alert) @keyword
(keyword_authentication) @keyword
(keyword_condition) @keyword
(keyword_frozen) @keyword
(keyword_suspended) @keyword
(keyword_accounts) @keyword
(keyword_alerts) @keyword
(keyword_application) @keyword
(keyword_applications) @keyword
(keyword_compute) @keyword
(keyword_connections) @keyword
(keyword_cortex) @keyword
(keyword_dbt) @keyword
(keyword_dcm) @keyword
(keyword_deployments) @keyword
(keyword_event) @keyword
(keyword_future) @keyword
(keyword_history) @keyword
(keyword_hybrid) @keyword
(keyword_iceberg) @keyword
(keyword_identifier) @keyword
(keyword_imported) @keyword
(keyword_mcp) @keyword
(keyword_metric) @keyword
(keyword_model) @keyword
(keyword_monitor) @keyword
(keyword_monitors) @keyword
(keyword_network) @keyword
(keyword_notebook) @keyword
(keyword_objects) @keyword
(keyword_package) @keyword
(keyword_pool) @keyword
(keyword_pools) @keyword
(keyword_project) @keyword
(keyword_projects) @keyword
(keyword_regions) @keyword
(keyword_replication) @keyword
(keyword_resource) @keyword
(keyword_result) @keyword
(keyword_rule) @keyword
(keyword_rules) @keyword
(keyword_semantic) @keyword
(keyword_server) @keyword
(keyword_servers) @keyword
(keyword_service) @keyword
(keyword_services) @keyword
(keyword_share) @keyword
(keyword_shares) @keyword
(keyword_streamlit) @keyword
(keyword_streamlits) @keyword
(keyword_variables) @keyword
(keyword_volume) @keyword
(keyword_volumes) @keyword
(keyword_workspaces) @keyword
(keyword_apply) @keyword
(keyword_attach) @keyword
(keyword_audit) @keyword
(keyword_bind) @keyword
(keyword_endpoint) @keyword
(keyword_evolve) @keyword
(keyword_exchange) @keyword
(keyword_execution) @keyword
(keyword_import) @keyword
(keyword_listing) @keyword
(keyword_manage) @keyword
(keyword_name) @keyword
(keyword_operate) @keyword
(keyword_override) @keyword
(keyword_ownership) @keyword
(keyword_packages) @keyword
(keyword_purchase) @keyword
(keyword_reference) @keyword
(keyword_restrictions) @keyword
(keyword_append_only) @keyword
(keyword_asof) @keyword
(keyword_block) @keyword
(keyword_changes) @keyword
(keyword_directed) @keyword
(keyword_error_table) @keyword
(keyword_information) @keyword
(keyword_match_condition) @keyword
(keyword_minus) @keyword
(keyword_sample) @keyword
(keyword_seed) @keyword
(keyword_tabular) @keyword
(keyword_text) @keyword
(keyword_top) @keyword
