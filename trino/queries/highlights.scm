; inherits: sql

; Trino-specific keywords
[
  (keyword_prepare)
  (keyword_deallocate)
  (keyword_stats)
  (keyword_match_recognize)
  (keyword_measures)
  (keyword_pattern)
  (keyword_define)
  (keyword_running)
  (keyword_final)
  (keyword_skip)
  (keyword_past)
  (keyword_map)
  (keyword_one)
  (keyword_per)
  (keyword_logical)
  (keyword_distributed)
  (keyword_validate)
  (keyword_io)
  (keyword_graphviz)
  (keyword_format)
  (keyword_bernoulli)
  (keyword_system)
  (keyword_call)
  (keyword_output)
  (keyword_branch)
  (keyword_branches)
  (keyword_catalog)
  (keyword_fast)
  (keyword_forward)
] @keyword

; Trino native types
[
  (keyword_tinyint)
  (keyword_ipaddress)
  (keyword_uuid)
] @type.builtin

; Lambda expression arrow
(lambda_expression "->" @operator)

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword
