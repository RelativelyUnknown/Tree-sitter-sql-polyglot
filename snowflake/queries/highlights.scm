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
