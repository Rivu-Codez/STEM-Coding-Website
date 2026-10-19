# Phase 3 setup

Phase 3 connects both games to Supabase authentication and student progress.
Students now enter through the root login.html page and choose a game after
signing in.

## One-time manual steps

1. Run supabase/migrations/002_progress_rpc.sql in the Supabase SQL Editor.
2. Open js/supabase-config.js.
3. Add the project URL and the browser-safe anonymous key from Supabase
   Project Settings > API.
4. Open either game through a local web server, not by double-clicking the
   HTML file. For example, use VS Code Live Server.
5. Create a test student account and verify that only level 1 is enabled.
6. Complete level 1, refresh the page, and verify that level 2 unlocks.

The service-role key and AI-provider key are not used in the browser and must
remain server-only.

## What Phase 3 adds

- Email/password sign-up, login, and logout.
- Per-game progress loaded from level_progress.
- Level selection blocked until the previous level is completed.
- Attempt records for successes, misses, collisions, and incomplete programs.
- A server-side RPC that performs the sequential-unlock writes under
  security definer.

The RPC currently records the result reported by the game. A later server
validation phase should verify the physics or maze solution independently
before accepting a success result.
