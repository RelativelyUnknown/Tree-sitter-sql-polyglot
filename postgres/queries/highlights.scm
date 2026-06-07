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

; PostgreSQL COPY TO / FOREIGN TABLE / DOMAIN
[
  (keyword_stdout)
  (keyword_server)
  (keyword_domain)
  (keyword_options)
] @keyword
