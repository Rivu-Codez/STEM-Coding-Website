-- Creator Academy integration: expose only the signed-in owner's latest level
-- through a controlled RPC. Direct table reads remain revoked.

create or replace function public.get_my_creator_level(p_academy_level integer)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case when current_user_id is null then null else jsonb_build_object(
    'id', id,
    'academy_level', academy_level,
    'title', title,
    'description', description,
    'definition', definition,
    'status', status,
    'share_code', share_code,
    'updated_at', updated_at
  ) end
  from (
    select auth.uid() as current_user_id
  ) as session
  left join lateral (
    select creator_levels.*
    from public.creator_levels
    where creator_levels.owner_id = session.current_user_id
      and creator_levels.academy_level = p_academy_level
    order by creator_levels.updated_at desc
    limit 1
  ) as creator_level on true;
$$;

revoke all on function public.get_my_creator_level(integer)
  from public, anon, authenticated;
grant execute on function public.get_my_creator_level(integer) to authenticated;
