-- Request-scoped tutor quota reservations.
-- Migration 006 remains available for rollback; the Edge Function uses these
-- idempotent functions for provider-aware reservation and refund handling.

create or replace function public.reserve_tutor_quota(
  p_request_id uuid,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  recent_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_request_id is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid tutor quota request';
  end if;

  if exists (
    select 1 from public.tutor_quota_events
    where id = p_request_id and user_id = current_user_id
  ) then
    return true;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));
  select count(*)::integer into recent_count
  from public.tutor_quota_events
  where user_id = current_user_id
    and created_at >= now() - interval '1 hour';
  if recent_count >= p_limit then return false; end if;

  insert into public.tutor_quota_events (id, user_id) values (p_request_id, current_user_id);
  return true;
end;
$$;

create or replace function public.refund_tutor_quota(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.tutor_quota_events
  where id = p_request_id and user_id = current_user_id;
  return found;
end;
$$;

revoke all on function public.reserve_tutor_quota(uuid, integer) from public;
grant execute on function public.reserve_tutor_quota(uuid, integer) to authenticated;
revoke all on function public.refund_tutor_quota(uuid) from public;
grant execute on function public.refund_tutor_quota(uuid) to authenticated;
