; inherits: sql

; SAP HANA-specific keywords
[
  (keyword_upsert)
  (keyword_locked)
  (keyword_hint)
  (keyword_sqlscript)
  (keyword_invoker)
  (keyword_definer)
  (keyword_reads)
  (keyword_declare)
  (keyword_constant)
  (keyword_inout)
  (keyword_global)
  (keyword_sql)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword
