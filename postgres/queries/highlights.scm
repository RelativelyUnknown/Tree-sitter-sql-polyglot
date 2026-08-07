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
