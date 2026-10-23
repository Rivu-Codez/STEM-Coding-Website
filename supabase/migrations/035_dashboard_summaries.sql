-- Return all enabled game summaries in one authenticated dashboard request.
create function public.get_dashboard_summaries()
returns table (
  game_id public.game_id,
  level_count integer,
  completed_levels integer,
  stars integer,
  xp integer,
  next_level integer
)
language sql
security definer
set search_path = public
as $$
  with current_games as (
    select games.game_id, games.level_count
    from public.games as games
    where games.enabled
  ), progress_totals as (
    select progress.game_id,
      count(*) filter (where progress.status = 'completed')::integer as completed_levels,
      coalesce(sum(coalesce((progress.best_result->>'stars')::integer, 0))
        filter (where progress.status = 'completed'), 0)::integer as fallback_stars,
      coalesce(sum(coalesce((progress.best_result->>'xp')::integer, 0))
        filter (where progress.status = 'completed'), 0)::integer as fallback_xp
    from public.level_progress as progress
    join current_games using (game_id)
    where progress.user_id = auth.uid()
      and progress.level_number <= current_games.level_count
    group by progress.game_id
  ), achievement_totals as (
    select achievements.game_id, count(*)::integer as record_count,
      coalesce(sum(achievements.stars), 0)::integer as stars,
      coalesce(sum(achievements.xp), 0)::integer as xp
    from public.student_achievements as achievements
    join current_games using (game_id)
    where achievements.user_id = auth.uid()
      and achievements.level_number <= current_games.level_count
    group by achievements.game_id
  )
  select current_games.game_id,
    current_games.level_count,
    coalesce(progress_totals.completed_levels, 0),
    case when coalesce(achievement_totals.record_count, 0) > 0
      then achievement_totals.stars else coalesce(progress_totals.fallback_stars, 0) end,
    case when coalesce(achievement_totals.record_count, 0) > 0
      then achievement_totals.xp else coalesce(progress_totals.fallback_xp, 0) end,
    case when coalesce(progress_totals.completed_levels, 0) >= current_games.level_count
      then null else coalesce(progress_totals.completed_levels, 0) + 1 end
  from current_games
  left join progress_totals using (game_id)
  left join achievement_totals using (game_id)
  where auth.uid() is not null
  order by current_games.game_id;
$$;

revoke all on function public.get_dashboard_summaries() from public, anon, authenticated;
grant execute on function public.get_dashboard_summaries() to authenticated;
