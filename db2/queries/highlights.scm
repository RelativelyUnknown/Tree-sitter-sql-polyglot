; inherits: sql

; Db2-specific keywords
[
  (keyword_prepare)
  (keyword_wrapper)
  (keyword_nickname)
  (keyword_module)
  (keyword_server)
  (keyword_mask)
  (keyword_permission)
  (keyword_transfer)
  (keyword_ownership)
  (keyword_enforced)
  (keyword_ur)
  (keyword_cs)
  (keyword_rs)
  (keyword_rr)
  (keyword_do)
  (keyword_leave)
  (keyword_iterate)
  (keyword_loop)
  (keyword_elseif)
  (keyword_while)
  (keyword_declare)
  (keyword_atomic)
] @keyword

; Db2 cursor lifecycle and FOR loop (#99)
[
  (keyword_cursor)
  (keyword_open)
  (keyword_close)
  (keyword_hold)
] @keyword

; Data-change-table-reference (#123)
[
  (keyword_final)
] @keyword
