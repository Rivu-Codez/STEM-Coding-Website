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

The current RPC is still a transitional progress writer: it records the result
reported by the game. It must not be treated as final server-authoritative
validation. The backend-validation phase will replace this with canonical level
loading, raw-attempt validation, authoritative rewards, atomic unlocks, and
duplicate-submission protection.

Phase 4A adds structured mistake events. Run
supabase/migrations/003_mistake_events.sql before testing mistake analysis.

The first server-authoritative validator is migration
`supabase/migrations/007_robo_maze_authoritative_attempts.sql`. Run it after
the earlier migrations. RoboMaze now sends its command program to
`submit_robo_maze_attempt`; the database replays that program against the
canonical grid before recording success or unlocking the next level. Physics
uses migration `supabase/migrations/008_physics_authoritative_attempts.sql` to
replay the canonical Euler simulation before recording success or unlocking the
next level.

Migration `009_authoritative_achievements.sql` makes stars and XP server-owned.
The browser now submits only the completed level identifier; the RPC derives
the reward from the server-validated attempt and canonical level configuration.

Migration `010_tutor_quota_refunds.sql` adds request-scoped tutor reservations
and refunds. After applying it, redeploy `analyze-mistake` so the function uses
retry, timeout, explicit provider states, and quota refunds.

Phase 4C adds Gemini analysis through the
supabase/functions/analyze-mistake Edge Function. Run
supabase/migrations/004_ai_insights.sql, set the GEMINI_API_KEY secret, and
deploy the function before AI hints can appear.

For Gemini setup, create a key in Google AI Studio and add it only as the
GEMINI_API_KEY secret in Supabase Edge Function Secrets. Do not put it in
js/supabase-config.js or any HTML file. The Edge Function uses the model
configured by GEMINI_MODEL. Provider failures currently return a clear tutor
error so the browser can keep its rule-based hint; retry and quota-refund
behavior remains planned for the tutor reliability phase.

For the latest migration and verification steps, see the repository
README.md. Always run migrations in filename order and verify the hosted
project before testing the browser.
