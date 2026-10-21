-- Phase 8 platform preparation: extend the stable game identity enum.
-- Registry rows are created in the following migration, after these values
-- have been committed by PostgreSQL.

alter type public.game_id add value if not exists 'chemistry';
alter type public.game_id add value if not exists 'biology';
