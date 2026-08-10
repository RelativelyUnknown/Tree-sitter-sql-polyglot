; inherits: sql

; Postgres-specific index type keywords
[
  (keyword_btree)
  (keyword_gist)
  (keyword_spgist)
  (keyword_gin)
  (keyword_brin)
] @function.call

; PostgreSQL partitioning keywords
[
  (keyword_inherits)
  (keyword_including)
  (keyword_excluding)
] @keyword

; PostgreSQL maintenance / utility statement keywords
[
  (keyword_reindex)
  (keyword_cluster)
  (keyword_checkpoint)
  (keyword_discard)
  (keyword_plans)
  (keyword_sequences)
  (keyword_load)
  (keyword_close)
  (keyword_abort)
  (keyword_chain)
  (keyword_move)
  (keyword_prior)
  (keyword_absolute)
  (keyword_relative)
  (keyword_forward)
  (keyword_backward)
] @keyword

; PostgreSQL object-definition statement keywords
[
  (keyword_label)
  (keyword_reassign)
  (keyword_import)
  (keyword_collation)
  (keyword_conversion)
  (keyword_method)
  (keyword_handler)
  (keyword_transform)
  (keyword_sql)
  (keyword_event)
  (keyword_procedural)
  (keyword_large)
  (keyword_object)
  (keyword_routine)
  (keyword_operator)
  (keyword_rule)
  (keyword_also)
  (keyword_replica)
] @keyword

; User-defined operator symbols (CREATE/ALTER OPERATOR)
(operator_symbol) @operator

; PostgreSQL replication / CTE / DO keywords (#31)
[
  (keyword_publication)
  (keyword_subscription)
  (keyword_search)
  (keyword_breadth)
  (keyword_depth)
] @keyword

; PostgreSQL LISTEN/NOTIFY/UNLISTEN
[
  (keyword_listen)
  (keyword_notify)
  (keyword_unlisten)
] @keyword

; PostgreSQL locking, prepared statements, CALL, EXPLAIN options, bulk GRANT (#86–#92)
[
  (keyword_share)
  (keyword_lock)
  (keyword_locked)
  (keyword_skip)
  (keyword_mode)
  (keyword_access)
  (keyword_exclusive)
  (keyword_prepare)
  (keyword_deallocate)
  (keyword_call)
  (keyword_costs)
  (keyword_settings)
  (keyword_generic_plan)
  (keyword_buffers)
  (keyword_wal)
  (keyword_timing)
  (keyword_summary)
  (keyword_yaml)
  (keyword_sequences)
  (keyword_functions)
  (keyword_procedures)
  (keyword_routines)
  (keyword_ilike)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword
