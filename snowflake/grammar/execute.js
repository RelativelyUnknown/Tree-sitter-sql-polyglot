import { paren_list } from '../../grammar/helpers.js';

export default {

  // EXECUTE IMMEDIATE 'sql' [USING (v1, v2)]
  // EXECUTE IMMEDIATE :var [USING (v1, v2)]
  // EXECUTE IMMEDIATE FROM @stage/script.sql
  //   https://docs.snowflake.com/en/sql-reference/sql/execute-immediate-from
  execute_immediate_statement: $ => seq(
    $.keyword_execute,
    $.keyword_immediate,
    choice(
      seq(
        $.keyword_from,
        choice($.stage_ref, alias($._literal_string, $.literal)),
      ),
      seq(
        choice(
          alias($._literal_string, $.literal),
          $.parameter,
        ),
        optional(seq(
          $.keyword_using,
          paren_list($._expression, true),
        )),
      ),
    ),
  ),

  // EXECUTE TASK task_name
  execute_task: $ => seq(
    $.keyword_execute,
    $.keyword_task,
    $.object_reference,
  ),

};
