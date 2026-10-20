-- Remove client access to legacy procedures now that authoritative paths are live.
-- The functions remain defined temporarily for rollback and historical compatibility.

revoke all on function public.record_game_attempt(
  public.game_id, integer, text, text, jsonb
) from public, authenticated, anon;

revoke all on function public.record_student_achievement(
  public.game_id, integer, integer, integer, integer, boolean, jsonb
) from public, authenticated, anon;

revoke all on function public.consume_tutor_quota(integer)
  from public, authenticated, anon;
