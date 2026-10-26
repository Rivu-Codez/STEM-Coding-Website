-- Re-sync the trusted answer keys and first missions with the current
-- Submarine Math level data. This is safe to run on databases that already
-- have the current values and repairs deployments that missed migration 026.
insert into public.submarine_math_answer_keys (level_number, correct_answer) values
  (1, '+10'), (2, '+20'), (3, '+30,+30'),
  (4, '+30,-20,+15'), (5, '-35,+20,+15'), (6, '+25,+20,-15,+10'),
  (7, '+30,+20,-10'), (8, '+15,-25,+10'), (9, '+35,+30,-20,+15'),
  (10, '+20,+15,-10,+30'), (11, '+30,+25,+20,-15'),
  (12, '+20,-10,+15'), (13, '+25,+15,-20,+10'),
  (14, '+24,+18,+30,-12'), (15, '-24,+18,+12,+24')
on conflict (level_number) do update
set correct_answer = excluded.correct_answer;

update public.game_levels
set title = 'Target Practice',
    instruction = 'Move the submarine from -20m to the target at -10m. Enter the signed move.',
    configuration = '{"id":1,"section":1,"title":"Target Practice","startDepth":-20,"moves":[10],"checkpoints":[-10],"targetDepth":-10,"numericVal":-10}'::jsonb
where game_id = 'submarine_math' and level_number = 1;

update public.game_levels
set title = 'Two-Buoy Target Run',
    instruction = 'Move the submarine from -40m to the target at -20m. How far must it move?',
    configuration = '{"id":2,"section":1,"title":"Two-Buoy Target Run","startDepth":-40,"moves":[20],"checkpoints":[-20],"targetDepth":-20,"numericVal":-20}'::jsonb
where game_id = 'submarine_math' and level_number = 2;

update public.game_levels
set title = 'Surface Target Run',
    instruction = 'Move the submarine from -60m to the surface at 0m. It must pass the buoy at -30m.',
    configuration = '{"id":3,"section":1,"title":"Surface Target Run","startDepth":-60,"moves":[30,30],"checkpoints":[-30,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0}'::jsonb
where game_id = 'submarine_math' and level_number = 3;
