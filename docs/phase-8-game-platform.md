# Phase 8: Registry-driven game platform

Phase 8 prepares the platform for Chemistry without changing the
existing Physics or RoboMaze validators.

## What is now implemented

- `js/game-registry.js` is the browser registry for stable IDs, routes, level
  counts, validator keys, display metadata, and release flags.
- Physics and RoboMaze remain enabled with 15 levels each.
- Chemistry is registered but disabled and has no playable level count until its
  real module and authoritative validator are supplied.
- Migration `019_game_registry.sql` adds the new stable game IDs and stores
  registry metadata without rewriting historical progress.
- Migration `020_common_attempt_boundary.sql` adds one idempotent submission
  boundary. It dispatches enabled attempts to the existing authoritative
  Physics or RoboMaze validator and rejects games without a validator.
- Dashboard routing and progress limits consume registry metadata. The legacy
  two-game fallback remains only for isolated tests or older pages that have
  not loaded the registry script.

## Enabling a new game

1. Add its level definitions to `game_levels` using the stable game ID.
2. Add a server-authoritative validator and idempotency coverage.
3. Add a frontend module created through `StemGameModule.create`.
4. Add the game adapter, payload contract, mistake categories, tutor context,
   and browser/integration tests.
5. Set its registry `levelCount`, `validator`, and `enabled` values together
   only after hosted Supabase verification.

Chemistry intentionally remains hidden from playable navigation in the first
rollout. Its dashboard card is an informational placeholder only.
Creator Academy remains RoboMaze-specific.
