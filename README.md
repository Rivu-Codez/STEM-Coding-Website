# STEM Website

An educational STEM platform with authenticated Physics and RoboMaze games,
student progress, and optional AI tutoring through Supabase Edge Functions.

## Project layout

- `index.html` — signed-in game hub.
- `login.html` — sign-in and account creation.
- `PhysicsSim/` and `RoboMaze/` — current game entry pages.
- `PhysicsSim/scene-renderer.js` and `RoboMaze/renderer.js` — isolated canvas rendering.
- `PhysicsSim/events.js` and `RoboMaze/events.js` — isolated DOM event wiring.
- `js/` — shared browser-side platform code.
- `supabase/migrations/` — numbered database migrations.
- `supabase/seed/` — canonical level seed data.
- `supabase/functions/analyze-mistake/` — tutor Edge Function.

## Run the site locally

The pages must be served over HTTP; do not open them with `file://`.

1. Open a terminal in this repository.
2. Start any static web server. VS Code Live Server is acceptable.
3. Open `/login.html` through that server.
4. Sign in with a confirmed student account.
5. Open a game from the dashboard.

The browser only needs the Supabase project URL and publishable/anonymous key
in `js/supabase-config.js`. Never put a service-role key or Gemini key there.

## Supabase setup

### Dashboard setup

1. Create or open the Supabase project.
2. In **SQL Editor**, run migrations in filename order: `001` through `017`.
3. Run `supabase/seed/001_game_levels.sql` after the migrations.
4. In **Authentication > Providers > Email**, enable email/password sign-in.
5. In **Project Settings > API**, copy only the project URL and publishable key
   into `js/supabase-config.js`.
6. In **Edge Functions > Secrets**, add `GEMINI_API_KEY` and optionally
   `GEMINI_MODEL=gemini-2.5-flash`.
7. Deploy the `analyze-mistake` function from the Supabase dashboard or CLI.

### Verify the database

Run these queries in SQL Editor:

```sql
select game_id, count(*)
from public.game_levels
group by game_id
order by game_id;

select proname
from pg_proc
where proname in ('record_game_attempt', 'submit_robo_maze_attempt',
                  'submit_physics_attempt', 'record_authoritative_achievement',
                  'consume_tutor_quota', 'reserve_tutor_quota',
                  'refund_tutor_quota', 'store_ai_insight')
order by proname;

select to_regclass('public.tutor_quota_events');
```

Expected results are 30 seeded levels for each current game, the authoritative
validators and idempotent submit wrappers, revoked direct client access to the
old submit procedures, and `tutor_quota_events` as the table name.

After applying migration `017`, test the server replay with a signed-in user by
running RoboMaze level 1. A successful run should create a `success` row in
`level_attempts` and unlock level 2. A wall collision or incomplete program
must not unlock level 2. Repeating the same attempt ID must return the stored
receipt result rather than awarding progress twice.

### Deploy the tutor function

If using the dashboard, open **Edge Functions**, choose `analyze-mistake`, and
deploy the current `supabase/functions/analyze-mistake/index.ts` source.
Then open **Edge Functions > Logs** while triggering a tutor request in the
game. Do not log prompts, student responses, API keys, or access tokens.

The repository pins the Supabase CLI in `package.json`. After installing
Node.js 20 or newer, install the project tools once:

```text
npm install
```

Then use the project-pinned CLI:

```text
npx --no-install supabase functions deploy analyze-mistake
```

The CLI must be authenticated and linked to the intended Supabase project. The
first-time commands are:

```text
npx --no-install supabase login
npx --no-install supabase link --project-ref qavxpvscadmvxffpuyrh
```

## Automated checks

Run the repository and unit checks before committing:

```text
npm run check
npm test
```

Run the local browser smoke tests with Chromium:

```text
npx playwright install chromium
npm run test:browser
```

The browser suite starts the repository's local static server automatically.
It uses mocked authentication for deterministic UI checks, including a complete
RoboMaze level-success and next-level-unlock flow. It does not require a
service-role key or Gemini key. Hosted authenticated journeys remain a manual
verification step until a dedicated test account and test environment are
configured.

The browser suite also checks accessible names for login controls, game canvases,
and primary game controls. It is intentionally not a visual-regression suite.

For a disposable Supabase integration project, set these variables in the
terminal before running the optional integration checks:

```text
SUPABASE_TEST_URL=https://your-project.supabase.co
SUPABASE_TEST_ANON_KEY=your-publishable-key
SUPABASE_TEST_EMAIL=confirmed-test-user@example.com
SUPABASE_TEST_PASSWORD=use-a-dedicated-test-password
SUPABASE_INTEGRATION=1
```

Never use a service-role key for browser or integration tests. The integration
checks are opt-in because they authenticate a real test account and may create
test-project data. Run them only against a disposable Supabase project after
applying migrations `001` through `017` and the seed file:

```text
npm run test:integration
```

## Migration procedure for future changes

1. Add the next numbered SQL file under `supabase/migrations/`.
2. Review it locally before running it remotely.
3. Run it in Supabase SQL Editor.
4. Run verification SQL and confirm the expected result.
5. Deploy an Edge Function only if its source changed.
6. Test login, one failed attempt, one successful attempt, and tutor fallback.
7. Record the migration and verification result in the pull request.

## Current limitations

- The game controllers now delegate persistence, rendering, and DOM event
  wiring, but state transitions and some legacy compatibility bridges still
  remain inside the controllers.
- The current browser suite covers deterministic local smoke flows. Hosted
  authenticated journeys still require a configured test environment.
- Supabase integration checks are opt-in and require a disposable test project;
  they are not run by the default unit or browser commands.
- Gemini provider rate limits produce an explicit tutor state and preserve the
  rule-based fallback. Failed provider requests refund their quota reservation.

## Safety rules

- Never commit `.env`, service-role keys, Gemini keys, or access tokens.
- Treat browser-supplied attempt data as untrusted.
- Keep database writes behind authenticated RPCs or Edge Functions.
- Review every migration before applying it to the hosted project.
