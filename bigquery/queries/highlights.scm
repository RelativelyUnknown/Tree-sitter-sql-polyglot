; BigQuery-specific keywords
[
  (keyword_int64)
  (keyword_float64)
  (keyword_bytes)
  (keyword_bignumeric)
  (keyword_geography)
  (keyword_datetime)
] @type.builtin

(keyword_unnest) @function.call

; Search / vector index DDL
[
  (keyword_search)
  (keyword_vector)
  (keyword_columns)
] @keyword

(keyword_struct) @keyword
(keyword_export) @keyword
(keyword_model) @keyword
(keyword_assert) @keyword
(keyword_continue) @keyword
(keyword_ml) @keyword
(keyword_predict) @keyword
(keyword_evaluate) @keyword
(keyword_error) @keyword
; MERGE WHEN NOT MATCHED BY SOURCE (moved from base — BQ/SQL Server extension)
(keyword_source) @keyword

; BigQuery scripting CALL/RAISE/RETURN (#95)
[
  (keyword_call)
  (keyword_raise)
  (keyword_message)
  (keyword_return)
] @keyword
