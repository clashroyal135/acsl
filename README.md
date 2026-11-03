# ACSL Practice

A full-stack ACSL-style programming practice platform built with Next.js, TypeScript, Tailwind CSS, Monaco Editor, Supabase, and server-side code execution.

The library contains 18 ACSL Contest 1 problem families (2007–2008 through 2024–2025), with 53 division versions adapted from the supplied source archive. Every version has 12 hidden grading cases (636 total), plus its public source examples. The 2023–2024 ACSL Tiles archive includes Intermediate and Senior only. The application never returns fake compiler output: Run and Submit call a real execution service.

## Included

- Searchable/filterable problem library with division, difficulty, topic, completion, and acceptance metadata
- Resizable problem/editor workspace with Monaco, language-specific autosave, light/dark mode, samples, custom input, and collapsible hints
- Python 3, C++17, and Java execution through server-only API routes
- Automatic grading with hidden cases, trailing-whitespace normalization, verdicts, time, memory, compiler errors, and runtime errors
- Per-IP in-process limits of 20 runs and 8 submissions per minute (use a shared Redis-backed limiter for multi-instance production deployments)
- Supabase email/password authentication, submission history, profile statistics, and leaderboard
- Profile pictures, editable names, and an About me field with an explicit Save profile button
- Admin dashboard with a problem form, JSON/file imports, publish/unpublish controls, and test-case management
- Admin-only account directory, complete progress totals, paginated submission history, and submitted source-code review
- Row-level security migration that prevents students from reading hidden tests or writing their own verdicts

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The problem library, editor, and fallback code execution work immediately. Accounts and persisted progress need Supabase.

## Judge0 configuration

Without any judge variables, the app uses Wandbox as a convenient fallback. Wandbox is a public third-party service with rate limits and no SLA, so self-hosted Judge0 is recommended for dependable production use.

Deploy a Judge0-compatible service in an isolated environment and set:

```dotenv
JUDGE0_URL=https://judge.example.com
JUDGE0_API_KEY=your-server-only-key
JUDGE0_API_KEY_HEADER=X-Auth-Token
```

The default language IDs are Python 3 `71`, C++ `54`, and Java `62`. Override them with the variables documented in [.env.example](.env.example) if the deployment uses a different language catalog.

The browser never receives Judge0 credentials. `/api/run` and `/api/submit` disable network access in the submission request and set CPU, wall-clock, and memory limits. Judge0 itself must be deployed with container isolation and outbound networking disabled; do not run untrusted code directly in the Next.js process.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in filename order with the Supabase CLI or SQL editor. Existing installations also need `202611020001_admin_tools.sql`, `20261102202949_profile_settings.sql`, `20261102230901_profile_names.sql`, and `20261102233329_required_unique_profile_names.sql`.
3. Under **Authentication → Providers → Email**, leave the Email provider enabled.
4. Copy `.env.example` to `.env.local`, then add the project URL, publishable (anon) key, and secret (service-role) key from **Project Settings → API Keys**.
5. Under **Authentication → URL Configuration**, set **Site URL** to `https://acsl.netlify.app`. Allow `https://acsl.netlify.app/login` and `https://acsl.netlify.app/api/auth/reset-password` in **Redirect URLs**. For local development, also allow the equivalent `http://localhost:3000` URLs.
6. Restart the development server, then create an account through `/login`.
7. To grant admin access, update that profile from the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
```

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to client code. Public/authenticated access is constrained with row-level security. Hidden test cases have no student read policy.

### Password reset

The **Forgot password?** button on `/login` sends a Supabase recovery email. Under **Authentication → URL Configuration → Redirect URLs**, allow `http://localhost:3000/api/auth/reset-password` for development and `https://acsl.netlify.app/api/auth/reset-password` for production. Keep the recovery email template's confirmation link pointed at `{{ .ConfirmationURL }}` so Supabase verifies the link before redirecting back to the app.

Users must open the email link in the same browser that requested it. The callback exchanges the recovery code for a session, then `/reset-password` lets them save and confirm a new password. Invalid or expired links offer a way to request another email. See the [Supabase password recovery guide](https://supabase.com/docs/guides/auth/passwords#resetting-a-password).

## Adding problems

Bundled problem metadata lives in `src/lib/contest1/catalog.json`, loaded through `src/lib/problems.ts`; hidden cases in `src/lib/contest1/hidden-tests.json` are imported only by the server-only `src/lib/test-cases.server.ts`. Each season/title appears once in the browser. The workspace division selector loads a distinct problem ID, statement, samples, draft, and grading suite. `year` is the season’s starting year. Missing or unpublished divisions cannot be selected.

Authoring sources, reference solvers, independent source fixtures, generators, and the verification report are in `scripts/contest1/`. Rebuild with `python3 scripts/contest1/build.py`; audit all input domains, source examples, and hidden outputs with `python3 scripts/contest1/audit.py`. The audit checks 161 source fixture sets and uses a second numeric method for 180 hidden cases. Paper worksheet labels and punctuation are normalized to explicit standard-input/output formats.

Run executes every provided sample and shows an input, expected output, and actual output box for each case. Run all test cases grades the complete sample and hidden suite without saving a submission. Submit unlocks only after that exact code and language pass all cases, then regrades the suite on the server before saving the source for the signed-in user. Failed solutions are rejected without saving; a failed save is reported. Each result card turns green or red, while hidden cases show only their status. The workspace fits the viewport with independently scrolling statement, code, and results panels. Both dividers can be dragged. Whole-line wrapper highlights follow the actual Monaco model after edits, restored drafts, and language changes, including blank wrapper lines.

The Wandbox fallback compiles the provided `solve(input)` starter once for the complete test suite, avoiding a separate compilation per hidden case. Judge0 and custom full-program submissions use at most three concurrent executions. Hidden stdout, stderr, expected outputs, and compilation details are never returned to students; incorrect batch sample output is also redacted when the suite includes hidden cases because submitted code can inspect the batch input. Sample-only Run shows actual public sample output. Database-authored problems can be managed at `/admin` by an admin user. The JSON editor accepts one problem object or an array of up to 100 objects and can import `.json` files.

Database problems remain drafts until `isPublished` is `true`. Test cases are stored in the separate protected table. At least one test should be marked public if you want it available as a visible sample.

## Profiles

Registration requires **Display name**, **Full name** (each up to 60 characters), **Email address**, **Password**, **Division**, and **Programming language**. Display names are unique regardless of capitalization or surrounding whitespace, enforced by a database index even for simultaneous signups and profile edits. Taken names produce a clear error. Full name is stored separately, hidden from other users by default, and always available to administrators. On `/profile`, users can edit both fields and choose **Show my full name on my profile**. Both names are required when saving profile text; older accounts with no full name must fill it in before saving text changes. About me and profile pictures remain optional.

Leaderboard display names link to read-only `/profile/<user-id>` pages showing the display name, picture, About me, and progress on published problems. Full name appears only when enabled, or when an administrator is viewing the profile. The server omits hidden names from the data sent to other users. Email addresses and submitted code are not included in public profiles. Raw profile rows remain restricted to their owner and administrators.

Signed-in users choose **Edit profile** to edit their names, visibility, **About me** (up to 1,000 characters), division, or programming language, then choose **Save profile**. Save stays gray and disabled until something changes. Unsaved edits prompt before page navigation or unloading. Registration includes division and language selectors; these preferences appear publicly and choose the problem version and editor language opened from the problem list. The list shows a solved check for the selected version. If a preferred division is unavailable, its link opens an available version.

**Add profile picture** opens a floating window with file requirements, computer upload, screen-wide file drag and drop, square crop, repositioning, and zoom. Choosing **Use picture** saves the cropped image immediately, independently of unsaved text edits. Removing a picture also saves immediately. Existing installations need the `profile_preferences` and `legacy_profile_picture_updates` migrations. The latter preserves legacy blank full names during picture-only updates, while signup and explicit full-name changes still require a valid name. `scripts/contest1/upgrade-starters.sql` replaces only exact previous default templates with direct string-input starters; existing student drafts are preserved.

Pictures accept JPG, PNG, and WebP files up to 2 MB. The `profile-pictures` Storage bucket is private; account folders isolate uploads, and the server issues temporary signed URLs to display pictures on profiles. Replacement pictures are uploaded to a new path, saved to the profile, and only then is the previous image removed. Failed saves discard the new upload. Database permissions let students and administrators update their own profile fields while protecting account IDs and roles. Administrators can see saved names, biographies, and pictures in account review, regardless of the name visibility toggle.

## Administration

Sign in with the administrator’s email, or use `admin` as the username shortcut. The shortcut resolves to `NEXT_PUBLIC_ADMIN_EMAIL` (defaults to `chrisgaorb@gmail.com`); it never grants permissions by itself. Authorization always checks the signed-in user’s `profiles.role` on the server. Passwords are stored by Supabase Auth and are never built into the app. Sign-in accepts existing six-character passwords, while registration and password resets require at least eight characters.

Administrators can copy, cut, and paste using the system clipboard in problem workspaces, including the editor context menu. Other users retain the internal editor clipboard restriction.

An administrator lands on `/admin` and has an **Admin** navigation link. The dashboard includes:

- **Problems:** add or edit a problem through the form, manage samples and hidden grading cases, edit starter code, import JSON, and publish or unpublish with one button. New problems start as drafts. Bundled problems can be edited and unpublished; database overrides take precedence over bundled copies. Added problems can also be deleted.
- **Accounts & progress:** browse every registered account, including those with no submissions; inspect signup and last sign-in times; see all-time submission counts, solved and attempted problems, and progress by problem; page through submission history and open each saved source file.

Admin sections stay mounted after their first visit, so switching tabs preserves problem drafts, account selections, and loaded results. The accounts Refresh button requests current progress. Navigating away from the dashboard still clears unsaved browser state.

Page navigation has a shared loading view that Next.js can prefetch. Independent problem, progress, permission, and submission reads run concurrently. Problem lookups are shared only within the current server render (including metadata), so later requests still check current publication status.

Problem content and grading cases save in one database transaction. Account and submission APIs require an administrator session and return private, non-cacheable responses. Student code is loaded only when selected. The code viewer shows submitted solutions; drafts saved only in a student’s browser are not uploaded or visible to administrators.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

## Deployment

Use `https://acsl.netlify.app` as the public address and `https://acsl.netlify.app/login` for sign-in. The application redirects Netlify deploy permalinks, branch URLs, and deploy-preview URLs ending in `--acsl.netlify.app` to that address before rendering pages or creating auth cookies, preserving paths and query parameters. Signup confirmations, password recovery, and sign-out redirects use the stable domain. Local development keeps its local origin. Netlify's historical deploy permalinks contain immutable copies of older code; redirects added in a new commit apply to deployments built with that commit or later.

Deploy the Next.js app to Vercel or another Node-compatible platform and configure all production environment variables there. The grading routes request a 60-second function duration; choose a plan/runtime that supports the time required by your complete test suite.

For production scale:

- self-host Judge0 separately from the frontend;
- put a distributed rate limiter in front of execution routes;
- monitor queue depth and execution failures;
- keep Supabase service credentials and Judge0 credentials only in the server environment;
- configure `ALLOWED_ORIGINS` only when a trusted non-same-origin client needs API access.

## Project structure

```text
src/app/                 Pages and secure API routes
src/components/          Interface, Monaco workspace, and admin tools
src/lib/                 Problems, Judge0 integration, Supabase, and grading
supabase/migrations/     Database schema and RLS policies
```

ACSL Practice is an independent practice project. ACSL is a trademark of its respective owner. Contest statements are adapted from user-provided ACSL materials; original titles and seasons are retained.
