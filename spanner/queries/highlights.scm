; inherits: bigquery_sql

; Spanner-specific keywords
[
  (keyword_interleave)
  (keyword_parent)
  (keyword_null_filtered)
  (keyword_storing)
  (keyword_stream)
  (keyword_deletion)
  (keyword_policy)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword
