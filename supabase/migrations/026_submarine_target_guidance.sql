-- Make the player calculate the submarine route from target depths instead of
-- revealing the UP/DOWN distances in the question text.
insert into public.submarine_math_answer_keys (level_number, correct_answer) values
  (1, '+10'), (2, '+20'), (3, '+30,+30'),
  (4, '+30,-20,+15'), (5, '-35,+20,+15'), (6, '+25,+20,-15,+10'),
  (7, '+30,+20,-10'), (8, '+15,-25,+10'), (9, '+35,+30,-20,+15'),
  (10, '+20,+15,-10,+30'), (11, '+30,+25,+20,-15'),
  (12, '+20,-10,+15'), (13, '+25,+15,-20,+10'),
  (14, '+24,+18,+30,-12'), (15, '-24,+18,+12,+24')
on conflict (level_number) do update set correct_answer = excluded.correct_answer;

update public.game_levels
set
  instruction = case level_number
    when 1 then 'Move the submarine from -20m to the target at -10m. Enter the signed move.'
    when 2 then 'Move the submarine from -40m to the target at -20m. How far must it move?'
    when 3 then 'Move the submarine from -60m to the surface at 0m. It must pass the buoy at -30m.'
    when 4 then 'Move the submarine from -45m to the target at -20m. It must pass -15m, then -35m.'
    when 5 then 'Move the submarine from -20m back to -20m. Visit -55m and -35m first.'
    when 6 then 'Move the submarine from -70m to -30m through these targets: -45m, -25m, and -40m.'
    when 7 then 'Move the submarine from -50m to -10m. It must touch the surface after reaching -20m.'
    when 8 then 'Move the submarine from -15m back to -15m. Touch 0m, then visit -25m.'
    when 9 then 'Move the submarine from -80m to -20m. Visit -45m, -15m, and -35m in order.'
    when 10 then 'Move the submarine from -55m to the surface dock. Visit -35m, -20m, and -30m. Avoid the hazard band.'
    when 11 then 'Move the submarine from -90m to -30m. Visit -60m, -35m, and -15m. Avoid the mine band.'
    when 12 then 'Move the submarine from -40m to -15m through -20m and -30m. Use 45m of fuel or less.'
    when 13 then 'Move the submarine from -75m to -45m through -50m, -35m, and -55m. Use 70m or less.'
    when 14 then 'Move the submarine from -90m to -30m through -66m, -48m, and -18m. Calculate each engine boost first.'
    when 15 then 'Move the submarine from -30m to the surface. Visit -54m, -36m, and -24m, then dock at 0m.'
  end,
  configuration = case level_number
    when 1 then '{"id":1,"section":1,"title":"Target Practice","startDepth":-20,"moves":[10],"checkpoints":[-10],"targetDepth":-10,"numericVal":-10}'::jsonb
    when 2 then '{"id":2,"section":1,"title":"Two-Buoy Target Run","startDepth":-40,"moves":[20],"checkpoints":[-20],"targetDepth":-20,"numericVal":-20}'::jsonb
    when 3 then '{"id":3,"section":1,"title":"Surface Target Run","startDepth":-60,"moves":[30,30],"checkpoints":[-30,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0}'::jsonb
    else configuration
  end
where game_id = 'submarine_math' and level_number between 1 and 15;
