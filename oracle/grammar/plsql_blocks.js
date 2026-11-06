import { comma_list } from '../../grammar/helpers.js';

export default {

  // col%TYPE; scalar type anchoring
  type_attribute: $ => seq(
    '%',
    $.keyword_type,
  ),

  // table%ROWTYPE; record type anchoring
  rowtype_attribute: $ => seq(
    '%',
    $.keyword_rowtype,
  ),

};
