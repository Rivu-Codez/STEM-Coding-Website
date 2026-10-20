-- Apply only after the frontend using migration 012 wrappers is deployed and verified.
-- This closes the compatibility window and forces all client attempts through
-- the idempotent receipt wrappers.

revoke all on function public.submit_robo_maze_attempt(integer, jsonb)
  from public, authenticated, anon;

revoke all on function public.submit_physics_attempt(integer, jsonb)
  from public, authenticated, anon;
