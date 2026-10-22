-- Make Signal Decrypter missions less repetitive by requiring mixed transformations.
-- Keep the existing game id, progress rows, and answer-key table.

insert into public.signal_decrypter_answer_keys
  (level_number, canonical_operations, canonical_code, expected_output, question_answer)
values
  (1, '[{"type":"remove","chars":"-"},{"type":"reverse"}]', null, 'PARIS', 'Paris'),
  (2, '[{"type":"slice","start":2,"end":9}]', null, 'JUPITER', 'Jupiter'),
  (3, '[{"type":"remove","chars":"#"}]', null, 'MARS', 'Mars'),
  (4, '[{"type":"swap","first":0,"second":1}]', null, '0C', '0°C'),
  (5, '[{"type":"slice","start":2,"end":9}]', null, 'PACIFIC', 'Pacific Ocean'),
  (6, '[{"type":"remove","chars":"-"},{"type":"reverse"}]', null, 'YEN', 'Yen'),
  (7, '[{"type":"strip","chars":"#"},{"type":"remove","chars":"-"}]', null, 'CARBONDIOXIDE', 'Carbon dioxide'),
  (8, '[{"type":"slice_step","start":0,"step":2}]', null, 'SOS', 'SOS'),
  (9, '[{"type":"remove","chars":"!"}]', null, 'ROWLING', 'J.K. Rowling'),
  (10, '[{"type":"replace","from":"*","to":""}]', null, 'NEILARMSTRONG', 'Neil Armstrong'),
  (11, '[{"type":"remove","chars":"-"},{"type":"upper"}]', 'signal.replace(\"-\", \"\").upper()', 'CANBERRA', 'Canberra'),
  (12, '[{"type":"strip","chars":"#"},{"type":"reverse"}]', 'signal.strip(\"#\")[::-1]', 'Au', 'Au'),
  (13, '[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"remove","chars":"-"}]', 'signal.strip(\"#\")[::-1].replace(\"-\", \"\")', 'doublehelix', 'Double helix'),
  (14, '[{"type":"remove","chars":","},{"type":"reverse"}]', 'signal.replace(\",\", \"\")[::-1]', '299792458', '299792458 m/s'),
  (15, '[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"remove","chars":"-"},{"type":"lower"}]', 'signal.strip(\"#\")[::-1].replace(\"-\", \"\").lower()', 'skin', 'Skin')
on conflict (level_number) do update set
  canonical_operations = excluded.canonical_operations,
  canonical_code = excluded.canonical_code,
  expected_output = excluded.expected_output,
  question_answer = excluded.question_answer;

update public.game_levels
set configuration = case level_number
  when 1 then '{"id":1,"question":"What is the capital of France?","signal":"S-I-R-A-P","mode":"blocks","timeLimit":90,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","reverse","lower","upper"]}'::jsonb
  when 2 then '{"id":2,"question":"Which planet is the largest in our solar system?","signal":"XXJUPITERXX","mode":"blocks","timeLimit":86,"interferenceLimit":3,"hintCost":8,"availableOperations":["slice","reverse","remove","lower"]}'::jsonb
  when 3 then '{"id":3,"question":"Which planet is known as the Red Planet?","signal":"M#A#R#S","mode":"blocks","timeLimit":82,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","reverse","lower","length"]}'::jsonb
  when 4 then '{"id":4,"question":"What is the freezing point of water in Celsius?","signal":"C0","mode":"blocks","timeLimit":78,"interferenceLimit":3,"hintCost":8,"availableOperations":["swap","reverse","upper","length"]}'::jsonb
  when 5 then '{"id":5,"question":"What is the largest ocean on Earth?","signal":"X-PACIFIC-Y","mode":"blocks","timeLimit":75,"interferenceLimit":3,"hintCost":8,"availableOperations":["slice","remove","reverse","lower"]}'::jsonb
  when 6 then '{"id":6,"question":"What is the currency of Japan?","signal":"N-E-Y","mode":"blocks","timeLimit":72,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","reverse","swap","lower"]}'::jsonb
  when 7 then '{"id":7,"question":"Which gas do plants absorb from the air?","signal":"#CARBON-DIOXIDE#","mode":"blocks","timeLimit":70,"interferenceLimit":3,"hintCost":8,"availableOperations":["strip","remove","reverse","lower"]}'::jsonb
  when 8 then '{"id":8,"question":"Which international distress signal is represented by SxOxS?","signal":"SxOxS","mode":"blocks","timeLimit":68,"interferenceLimit":3,"hintCost":8,"availableOperations":["slice_step","remove","reverse","upper"]}'::jsonb
  when 9 then '{"id":9,"question":"What is the surname of the author of Harry Potter?","signal":"ROWLING!","mode":"blocks","timeLimit":65,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","slice","reverse","lower"]}'::jsonb
  when 10 then '{"id":10,"question":"Who was the first person to walk on the Moon?","signal":"NEIL*ARMSTRONG","mode":"blocks","timeLimit":62,"interferenceLimit":3,"hintCost":8,"availableOperations":["replace","reverse","remove","upper"]}'::jsonb
  when 11 then '{"id":11,"question":"What is the capital city of Australia?","signal":"c-a-n-b-e-r-r-a","mode":"python","timeLimit":60,"interferenceLimit":3,"hintCost":10}'::jsonb
  when 12 then '{"id":12,"question":"What is the chemical symbol for gold?","signal":"#uA#","mode":"python","timeLimit":56,"interferenceLimit":3,"hintCost":10}'::jsonb
  when 13 then '{"id":13,"question":"What shape is commonly used to describe DNA?","signal":"#xileh-elbuod#","mode":"python","timeLimit":52,"interferenceLimit":3,"hintCost":10}'::jsonb
  when 14 then '{"id":14,"question":"What is the approximate speed of light in metres per second?","signal":"854,297,992","mode":"python","timeLimit":48,"interferenceLimit":3,"hintCost":10}'::jsonb
  when 15 then '{"id":15,"question":"What is the largest organ in the human body?","signal":"#n-i-k-s#","mode":"python","timeLimit":44,"interferenceLimit":3,"hintCost":10}'::jsonb
  else configuration end
where game_id = 'signal_decrypter';
