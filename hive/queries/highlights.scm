; inherits: spark

; Hive-specific keywords
[
  (keyword_serde)
  (keyword_serdeproperties)
  (keyword_skewed)
  (keyword_directories)
] @keyword

; Hive TRANSFORM, SHOW, DESCRIBE, EXCHANGE PARTITION (#96, #97)
[
  (keyword_transform)
  (keyword_show)
  (keyword_describe)
  (keyword_formatted)
  (keyword_extended)
  (keyword_databases)
  (keyword_schemas)
  (keyword_functions)
  (keyword_exchange)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword

; Hive SHOW family, data connectors, transactions and TINYINT
[
  (keyword_tinyint)
  (keyword_connector)
  (keyword_connectors)
  (keyword_dcproperties)
  (keyword_url)
  (keyword_columns)
  (keyword_indexes)
  (keyword_locks)
  (keyword_compactions)
  (keyword_conf)
  (keyword_views)
  (keyword_abort)
  (keyword_transactions)
] @keyword
