# Backend verification

This is a read-only check. It does not change Supabase data or schema.

## How to run it

1. Open your Supabase project in the browser.
2. Open **SQL Editor**.
3. Create a new query.
4. Open `docs/phase-7-backend-verification.sql` from this repository.
5. Copy the complete file into the SQL Editor.
6. Click **Run**.
7. Review each result set using the checks below.

Do not run this file together with a migration. It is only a verification query.

## Expected results

1. The first result should show a non-null function name in every column.
2. The RLS result should show `rls_enabled = true` for every listed table.
3. The policy result should show policies using `auth.uid()` for user-owned data.
4. The routine privilege result should show authenticated execution for the idempotent submit wrappers and authoritative procedures. The direct submit procedures must not be executable by `authenticated`.
5. The game-level result should show 30 levels per configured game, with levels 1 through 30.
6. The index result should show the indexes used by progress, attempts, achievements, and tutor quota records.

## If a check fails

- A missing function usually means a migration was not applied or was applied out of order.
- `rls_enabled = false` is a security issue; do not add data until it is investigated.
- Missing `authenticated` execution usually means the function grant was not applied.
- Fewer than 30 game levels means the canonical seed/configuration is incomplete.
- Missing progression indexes should be reviewed before production use.

Copy the failing result and the migration number shown in the Supabase error before asking for help. Do not expose API keys or service-role credentials.

## Current migration baseline

This verification applies after migrations `001` through `016` and the seed
file have been applied. Migrations `011` through `013` revoke legacy
client-trusted writes, add duplicate-safe attempt receipts, and close the
compatibility window by revoking direct client access to the authoritative
submit procedures. Migration `014` adds Creator Academy storage and server
validation. Migration `015` adds the authenticated owner-read RPC used by the
integrated Level 31 player; direct creator table reads remain revoked. Migration
`016` fixes the PostgreSQL validation query used by creator saves and publishes.

Clients must call only `submit_robo_maze_attempt_idempotent` and
`submit_physics_attempt_idempotent`. Repeating the same user, game, and attempt
ID should return the stored receipt result instead of creating a second
progression event.
