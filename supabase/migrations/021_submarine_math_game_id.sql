-- PostgreSQL requires a newly added enum value to commit before it is used.
alter type public.game_id add value if not exists 'submarine_math';
