# Phase 2 backend foundation

This phase adds the database foundation for student accounts, level progress,
attempt tracking, tutor messages, and the five bonus challenges.

## Files

- `supabase/migrations/001_initial_learning_schema.sql` creates the schema,
  indexes, row-level security, and the profile trigger.
- `supabase/seed/001_game_levels.sql` seeds the current 30 physics levels and
  30 RoboMaze levels from Prototype3.
- `.env.example` documents the required configuration names.

## Setup

1. Create a Supabase project.
2. Run the migration SQL in the Supabase SQL Editor.
3. Run the seed SQL after the migration.
4. Keep the service-role key and AI-provider key on a server or Edge Function.
   Never put either key in a game HTML file.
5. Use only the project URL and anonymous key in the browser.

The seed is safe to re-run: it updates matching game/level records instead of
creating duplicates.

## Security boundary

Row-level security limits student-owned records to the authenticated student.
The level catalog is readable by authenticated users, but progress and attempt
records cannot be written directly by a browser in this phase. A later server
or Edge Function layer should validate a completed attempt before writing
progress, enforce sequential unlocks, and gate bonus submissions after level
30.

## Phase 2 validation

- Confirm the migration completes without errors.
- Confirm the seed creates 30 rows for each game.
- Confirm an authenticated student can read levels but cannot read another
  student's progress, attempts, messages, or bonus submissions.
- Confirm unauthenticated requests cannot read any protected table.

Frontend login, progress wiring, AI tutoring, and the bonus-level UI are
implemented in later phases.
