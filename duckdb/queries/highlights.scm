; inherits: sql

; DuckDB-specific keywords
[
  (keyword_prepare)
  (keyword_deallocate)
  (keyword_show)
  (keyword_databases)
  (keyword_attach)
  (keyword_detach)
  (keyword_install)
  (keyword_summarize)
  (keyword_asof)
  (keyword_positional)
  (keyword_map)
  (keyword_struct)
  (keyword_qualify)
  (keyword_load)
] @keyword

; DuckDB native types
[
  (keyword_hugeint)
  (keyword_uinteger)
  (keyword_ubigint)
  (keyword_usmallint)
  (keyword_utinyint)
  (keyword_tinyint)
  (keyword_blob)
  (keyword_uuid)
  (keyword_varint)
] @type.builtin

; Lambda expression arrow
(lambda_expression "->" @operator)
