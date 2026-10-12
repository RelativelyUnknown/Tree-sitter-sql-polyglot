; inherits: sql

; SQLite-specific keywords
[
  (keyword_pragma)
  (keyword_attach)
  (keyword_detach)
  (keyword_rowid)
  (keyword_reindex)
  (keyword_abort)
  (keyword_fail)
  (keyword_indexed)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword

; ============================================================
; Remaining sqlite keywords
; ============================================================

[
  (keyword_autoincrement)
  (keyword_conflict)
  (keyword_do)
  (keyword_exclusive)
  (keyword_glob)
  (keyword_hash)
  (keyword_ignore)
  (keyword_include)
  (keyword_match)
  (keyword_nothing)
  (keyword_returning)
  (keyword_stored)
  (keyword_vacuum)
  (keyword_virtual)
] @keyword
