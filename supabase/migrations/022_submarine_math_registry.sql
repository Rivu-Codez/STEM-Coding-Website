insert into public.games
  (game_id, display_name, description, route, level_count, validator_key, icon, enabled)
values
  ('submarine_math', 'Submarine Math Expedition',
   'Use integers and number operations to navigate a submarine through 15 deep-sea levels.',
   'SubmarineMath/index.html', 15, 'submarine_math', '⚓', false)
on conflict (game_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  route = excluded.route,
  level_count = excluded.level_count,
  validator_key = excluded.validator_key,
  icon = excluded.icon,
  enabled = false,
  updated_at = now();
