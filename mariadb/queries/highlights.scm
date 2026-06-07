; inherits: mysql

; MariaDB system-versioning / temporal keywords
[
  (keyword_system)
  (keyword_versioning)
  (keyword_period)
] @keyword

; APPLICATION_TIME identifier (period name in temporal clauses and definitions)
(application_time) @keyword.special

; MariaDB package keywords
[
  (keyword_package)
  (keyword_body)
] @keyword
