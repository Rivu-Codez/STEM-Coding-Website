-- Backend hardening: atomic per-student tutor quota and server-only insight writes.

create table public.tutor_quota_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index tutor_quota_events_user_created_idx
  on public.tutor_quota_events(user_id, created_at desc);

alter table public.tutor_quota_events enable row level security;

create or replace function public.consume_tutor_quota(p_limit integer default 10)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  recent_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid tutor quota';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select count(*)::integer into recent_count
  from public.tutor_quota_events
  where user_id = current_user_id
    and created_at >= now() - interval '1 hour';

  if recent_count >= p_limit then
    return false;
  end if;

  insert into public.tutor_quota_events (user_id) values (current_user_id);
  return true;
end;
$$;

revoke all on function public.consume_tutor_quota(integer) from public;
grant execute on function public.consume_tutor_quota(integer) to authenticated;

create or replace function public.store_ai_insight(
  p_game_id public.game_id,
  p_level_number integer,
  p_mistake_category text,
  p_confidence numeric,
  p_explanation text,
  p_hint text,
  p_next_question text,
  p_model text
)
returns public.ai_insights
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved public.ai_insights;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_level_number not between 1 and 30
     or p_confidence not between 0 and 1
     or length(trim(p_mistake_category)) not between 1 and 80
     or length(trim(p_explanation)) not between 1 and 300
     or length(trim(p_hint)) not between 1 and 300
     or length(trim(p_next_question)) not between 1 and 300
     or length(trim(p_model)) not between 1 and 120 then
    raise exception 'Invalid tutor insight';
  end if;

  insert into public.ai_insights (
    user_id, game_id, level_number, mistake_category, confidence,
    explanation, hint, next_question, model
  ) values (
    current_user_id, p_game_id, p_level_number, trim(p_mistake_category),
    p_confidence, trim(p_explanation), trim(p_hint), trim(p_next_question),
    trim(p_model)
  ) returning * into saved;
  return saved;
end;
$$;

revoke all on function public.store_ai_insight(public.game_id, integer, text, numeric, text, text, text, text) from public;
grant execute on function public.store_ai_insight(public.game_id, integer, text, numeric, text, text, text, text) to authenticated;

drop policy if exists ai_insights_insert_own on public.ai_insights;
