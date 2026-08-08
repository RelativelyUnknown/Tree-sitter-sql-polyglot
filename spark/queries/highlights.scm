; inherits: sql

; Spark/Hive/Iceberg-specific keywords
[
  (keyword_optimize)
  (keyword_rewrite)
  (keyword_location)
  (keyword_bucket)
] @keyword

[
  (keyword_bin_pack)
] @type.qualifier

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword

; Spark cache / resource management keywords
[
  (keyword_lazy)
  (keyword_clear)
  (keyword_uncache)
  (keyword_file)
  (keyword_files)
  (keyword_jars)
  (keyword_archive)
  (keyword_archives)
  (keyword_list)
] @keyword

; Spark SHOW / DESCRIBE / SET PATH keywords
[
  (keyword_views)
  (keyword_collations)
  (keyword_query)
  (keyword_path)
  (keyword_default_path)
  (keyword_system_path)
  (keyword_current_schema)
  (keyword_current_database)
] @keyword

; Spark 4.2 geospatial types
[
  (keyword_geometry)
  (keyword_geography)
] @type.builtin
