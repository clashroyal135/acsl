# ACSL Practice

A full-stack ACSL-style programming practice platform built with Next.js, TypeScript, Tailwind CSS, Monaco Editor, Supabase, and server-side code execution.

The six bundled challenges are original practice problems across Junior, Intermediate, and Senior divisions. The application never returns fake compiler output: Run and Submit call a real execution service.

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
2. Run the SQL files in `supabase/migrations/` in filename order with the Supabase CLI or SQL editor. Existing installations also need `202611020001_admin_tools.sql` and `20261102202949_profile_settings.sql`.
3. Under **Authentication → Providers → Email**, leave the Email provider enabled.
4. Copy `.env.example` to `.env.local`, then add the project URL, publishable (anon) key, and secret (service-role) key from **Project Settings → API Keys**.
5. Restart the development server, then create an account through `/login`.
6. To grant admin access, update that profile from the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
```

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to client code. Public/authenticated access is constrained with row-level security. Hidden test cases have no student read policy.

### Password reset

The **Forgot password?** button on `/login` sends a Supabase recovery email. Under **Authentication → URL Configuration → Redirect URLs**, allow `http://localhost:3000/api/auth/reset-password` for development and `https://<your-domain>/api/auth/reset-password` for production. Keep the recovery email template's confirmation link pointed at `{{ .ConfirmationURL }}` so Supabase verifies the link before redirecting back to the app.

Users must open the email link in the same browser that requested it. The callback exchanges the recovery code for a session, then `/reset-password` lets them save and confirm a new password. Invalid or expired links offer a way to request another email. See the [Supabase password recovery guide](https://supabase.com/docs/guides/auth/passwords#resetting-a-password).

## Adding problems

Bundled problems live in `src/lib/problems.ts`; their hidden cases live in the server-only `src/lib/test-cases.server.ts`. Database-authored problems can be managed at `/admin` by an admin user. The JSON editor accepts one problem object or an array of up to 100 objects and can import `.json` files.

Database problems remain drafts until `isPublished` is `true`. Test cases are stored in the separate protected table. At least one test should be marked public if you want it available as a visible sample.

## Profiles

Registration asks for a required **Name** (up to 60 characters). Signed-in users can edit their name and **About me** (up to 1,000 characters) on `/profile`, select or remove a profile picture, then choose **Save profile**. **Add profile picture** opens a floating window with the file requirements and an **Upload from computer** button. Dropping a file anywhere on the profile screen opens the same window. Pictures can be repositioned by dragging (or arrow keys), zoomed, and cropped to a square before choosing **Use picture**. Cropping happens in the browser and exports a 512 × 512 PNG. Changes remain unsaved until **Save profile** is selected, and the form shows success or error feedback.

Pictures accept JPG, PNG, and WebP files up to 2 MB. The `profile-pictures` Storage bucket is private; account folders isolate uploads, and temporary signed URLs display images to their owner or an administrator. Replacement pictures are uploaded to a new path, saved to the profile, and only then is the previous image removed. Failed saves discard the new upload. Database permissions let students and administrators update their own profile fields while protecting account IDs and roles. Administrators can see saved biographies and pictures in account review.

## Administration

Sign in with the administrator’s email, or use `admin` as the username shortcut. The shortcut resolves to `NEXT_PUBLIC_ADMIN_EMAIL` (defaults to `chrisgaorb@gmail.com`); it never grants permissions by itself. Authorization always checks the signed-in user’s `profiles.role` on the server. Passwords are stored by Supabase Auth and are never built into the app. Sign-in accepts existing six-character passwords, while registration and password resets require at least eight characters.

An administrator lands on `/admin` and has an **Admin** navigation link. The dashboard includes:

- **Problems:** add or edit a problem through the form, manage samples and hidden grading cases, edit starter code, import JSON, and publish or unpublish with one button. New problems start as drafts. Bundled problems can be edited and unpublished; database overrides take precedence over bundled copies. Added problems can also be deleted.
- **Accounts & progress:** browse every registered account, including those with no submissions; inspect signup and last sign-in times; see all-time submission counts, solved and attempted problems, and progress by problem; page through submission history and open each saved source file.

Problem content and grading cases save in one database transaction. Account and submission APIs require an administrator session and return private, non-cacheable responses. Student code is loaded only when selected. The code viewer shows submitted solutions; drafts saved only in a student’s browser are not uploaded or visible to administrators.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

## Deployment

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

ACSL Practice is an independent practice project. ACSL is a trademark of its respective owner. The bundled problems are original and do not reproduce competition materials.
