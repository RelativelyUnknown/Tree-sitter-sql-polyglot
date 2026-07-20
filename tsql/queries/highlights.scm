; inherits: sql

; T-SQL @variable references
(variable) @variable

; T-SQL-specific keywords
[
  (keyword_top)
  (keyword_output)
  (keyword_inserted)
  (keyword_deleted)
  (keyword_raiserror)
  (keyword_throw)
  (keyword_try)
  (keyword_catch)
  (keyword_go)
  (keyword_bulk)
  (keyword_nolock)
  (keyword_rowlock)
  (keyword_updlock)
  (keyword_readpast)
  (keyword_tablock)
  (keyword_tablockx)
  (keyword_distribution)
  (keyword_round_robin)
  (keyword_replicate)
  (keyword_shortcut)
  (keyword_target)
  (keyword_print)
  (keyword_break)
  (keyword_log)
  (keyword_seterror)
  (keyword_continue)
] @keyword

; T-SQL-specific types
[
  (datetime2)
  (smalldatetime)
  (money_type)
  (uniqueidentifier)
] @type.builtin

; T-SQL type keywords
[
  (keyword_datetime2)
  (keyword_smalldatetime)
  (keyword_money)
  (keyword_smallmoney)
  (keyword_uniqueidentifier)
] @type.builtin

; USE, SYNONYM, LOGIN/USER security DDL (#103, #105, #106)
[
  (keyword_synonym)
  (keyword_login)
  (keyword_must_change)
  (keyword_off)
] @keyword

; EXPLAIN prefix (non-ANSI; re-added over the strict ANSI base)
[
  (keyword_explain)
  (keyword_analyze)
  (keyword_verbose)
] @keyword
