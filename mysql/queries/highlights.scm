; inherits: sql

; MySQL-specific type qualifiers
[
  (keyword_delayed)
  (keyword_high_priority)
  (keyword_low_priority)
] @type.qualifier

; MySQL SHOW / DESCRIBE
[
  (keyword_databases)
  (keyword_processlist)
  (keyword_status)
  (keyword_warnings)
  (keyword_errors)
  (keyword_variables)
  (keyword_indexes)
] @keyword

; MySQL Sprint 8 keywords
[
  (keyword_rollup)
  (keyword_event)
  (keyword_every)
  (keyword_starts)
  (keyword_ends)
  (keyword_invisible)
  (keyword_visible)
  (keyword_enclosed)
  (keyword_respect)
  (keyword_completion)
  (keyword_preserve)
  (keyword_slave)
  (keyword_json_table)
  (keyword_path)
  (keyword_infile)
] @keyword

; Locking, SET scopes, user management, maintenance (#101, #102, #106, #107)
[
  (keyword_share)
  (keyword_lock)
  (keyword_locked)
  (keyword_skip)
  (keyword_prepare)
  (keyword_deallocate)
  (keyword_mode)
  (keyword_global)
  (keyword_persist)
  (keyword_persist_only)
  (keyword_names)
  (keyword_expire)
  (keyword_account)
  (keyword_unlock)
  (keyword_identified)
  (keyword_quick)
  (keyword_extended)
  (keyword_fast)
  (keyword_medium)
  (keyword_changed)
  (keyword_upgrade)
  (keyword_histogram)
  (keyword_buckets)
  (keyword_repair)
  (keyword_use_frm)
  (keyword_no_write_to_binlog)
] @keyword
