import { make_keyword } from '../../grammar/helpers.js';

// CREATE / ALTER SEQUENCE with the Oracle options, and CREATE / ALTER / DROP PROFILE
// (Oracle SQL Language Reference 26ai). The two sequence rules replace the generic ones from
// legacy_statements.js / alter_vendor.js and keep every option those accepted.

const kw = (word) => token(prec(1, make_keyword(word)));

export default {

  keyword_composite_limit:           _ => kw('composite_limit'),
  keyword_connect_time:              _ => kw('connect_time'),
  keyword_cpu_per_call:              _ => kw('cpu_per_call'),
  keyword_cpu_per_session:           _ => kw('cpu_per_session'),
  keyword_failed_login_attempts:     _ => kw('failed_login_attempts'),
  keyword_idle_time:                 _ => kw('idle_time'),
  keyword_inactive_account_time:     _ => kw('inactive_account_time'),
  keyword_container:                 _ => kw('container'),
  keyword_logical_reads_per_call:    _ => kw('logical_reads_per_call'),
  keyword_logical_reads_per_session: _ => kw('logical_reads_per_session'),
  keyword_mandatory:                 _ => kw('mandatory'),
  keyword_password_grace_time:       _ => kw('password_grace_time'),
  keyword_password_life_time:        _ => kw('password_life_time'),
  keyword_password_lock_time:        _ => kw('password_lock_time'),
  keyword_password_reuse_max:        _ => kw('password_reuse_max'),
  keyword_password_reuse_time:       _ => kw('password_reuse_time'),
  keyword_password_rollover_time:    _ => kw('password_rollover_time'),
  keyword_password_verify_function:  _ => kw('password_verify_function'),
  keyword_private_sga:               _ => kw('private_sga'),
  keyword_profile:                   _ => kw('profile'),
  keyword_sessions_per_user:         _ => kw('sessions_per_user'),
  keyword_noextend:                  _ => kw('noextend'),
  keyword_noscale:                   _ => kw('noscale'),
  keyword_noshard:                   _ => kw('noshard'),
  keyword_nokeep:                    _ => kw('nokeep'),
  keyword_scale:                     _ => kw('scale'),
  keyword_shard:                     _ => kw('shard'),
  keyword_extend:                    _ => kw('extend'),

  // ── Sequences ──────────────────────────────────────────────────────────

  _sequence_option: $ => choice(
    seq($.keyword_as, $._type),
    seq($.keyword_increment, optional($.keyword_by), field('increment', alias($._integer, $.literal))),
    seq($.keyword_minvalue, choice($.literal, seq($.keyword_no, $.keyword_minvalue))),
    seq($.keyword_no, $.keyword_minvalue),
    $.keyword_nominvalue,
    seq($.keyword_maxvalue, choice($.literal, seq($.keyword_no, $.keyword_maxvalue))),
    seq($.keyword_no, $.keyword_maxvalue),
    $.keyword_nomaxvalue,
    seq($.keyword_start, optional($.keyword_with), field('start', alias($._integer, $.literal))),
    seq($.keyword_cache, field('cache', alias($._integer, $.literal))),
    $.keyword_nocache,
    seq(optional($.keyword_no), $.keyword_cycle),
    $.keyword_nocycle,
    seq($.keyword_owned, $.keyword_by, choice($.keyword_none, $.object_reference)),
    $.keyword_order,
    $.keyword_noorder,
    $.keyword_keep,
    $.keyword_nokeep,
    seq($.keyword_scale, optional(choice($.keyword_extend, $.keyword_noextend))),
    $.keyword_noscale,
    seq($.keyword_shard, optional(choice($.keyword_extend, $.keyword_noextend))),
    $.keyword_noshard,
    $.keyword_session,
    $.keyword_global,
    $.sharing_clause,
  ),

  create_sequence: $ => seq(
    $.keyword_create,
    optional(choice(
      choice($.keyword_temporary, $.keyword_temp),
      $.keyword_unlogged,
    )),
    $.keyword_sequence,
    optional($._if_not_exists),
    $.object_reference,
    repeat($._sequence_option),
  ),

  alter_sequence: $ => seq(
    $.keyword_alter,
    $.keyword_sequence,
    optional($._if_exists),
    $.object_reference,
    choice(
      repeat1(choice(
        $._sequence_option,
        seq($.keyword_restart, optional(seq($.keyword_start, $.keyword_with, field('restart', alias($._integer, $.literal))))),
        seq($.keyword_restart, optional($.keyword_with), field('restart', alias($._integer, $.literal))),
      )),
      $.rename_object,
      $.change_ownership,
      seq(
        $.keyword_set,
        choice(
          choice($.keyword_logged, $.keyword_unlogged),
          seq($.keyword_schema, $.identifier),
        ),
      ),
    ),
  ),

  // ── Profiles ───────────────────────────────────────────────────────────

  _limit_value: $ => choice(
    $.keyword_unlimited,
    $.keyword_default,
    seq(alias($._natural_number, $.literal), optional(seq('/', alias($._natural_number, $.literal)))),
  ),

  _profile_limit: $ => choice(
    seq(
      choice(
        $.keyword_sessions_per_user, $.keyword_cpu_per_session, $.keyword_cpu_per_call,
        $.keyword_connect_time, $.keyword_idle_time, $.keyword_logical_reads_per_session,
        $.keyword_logical_reads_per_call, $.keyword_composite_limit,
        $.keyword_failed_login_attempts, $.keyword_password_life_time, $.keyword_password_reuse_time,
        $.keyword_password_reuse_max, $.keyword_password_lock_time, $.keyword_password_grace_time,
        $.keyword_password_rollover_time, $.keyword_inactive_account_time,
      ),
      $._limit_value,
    ),
    seq($.keyword_private_sga, choice($.keyword_unlimited, $.keyword_default, $._size)),
    seq($.keyword_password_verify_function, choice($.keyword_null, $.keyword_default, $.object_reference)),
  ),

  _profile_body: $ => seq(
    $.keyword_limit,
    repeat1($._profile_limit),
    optional(seq($.keyword_container, '=', choice($.keyword_all, $.keyword_current))),
  ),

  create_profile: $ => seq(
    $.keyword_create,
    optional($.keyword_mandatory),
    $.keyword_profile,
    field('name', $.identifier),
    $._profile_body,
  ),

  alter_profile: $ => seq(
    $.keyword_alter,
    $.keyword_profile,
    field('name', $.identifier),
    $._profile_body,
  ),

  drop_profile: $ => seq(
    $.keyword_drop,
    $.keyword_profile,
    field('name', $.identifier),
    optional($.keyword_cascade),
  ),

};
