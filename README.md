# ACSL Practice

A full-stack ACSL-style programming practice platform built with Next.js, TypeScript, Tailwind CSS, Monaco Editor, Supabase, and a Judge0-compatible execution service.

The six bundled challenges are original practice problems across Junior, Intermediate, and Senior divisions. The application never returns fake compiler output: Run and Submit call a real Judge0 backend, or return a clear configuration error if no judge is configured.

## Included

- Searchable/filterable problem library with division, difficulty, topic, completion, and acceptance metadata
- Resizable problem/editor workspace with Monaco, language-specific autosave, light/dark mode, samples, custom input, and collapsible hints
- Python 3, C++17, and Java execution through server-only Judge0 API routes
- Automatic grading with hidden cases, trailing-whitespace normalization, verdicts, time, memory, compiler errors, and runtime errors
- Per-IP in-process limits of 20 runs and 8 submissions per minute (use a shared Redis-backed limiter for multi-instance production deployments)
- Supabase email/password authentication, submission history, profile statistics, and leaderboard
- Admin-only JSON editor, file import, bulk import, publishing, test-case management, and deletion
- Row-level security migration that prevents students from reading hidden tests or writing their own verdicts

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The problem library and editor UI work immediately. Code execution needs Judge0; accounts and persisted progress need Supabase.

## Judge0 configuration

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
2. Run `supabase/migrations/202610210001_initial_schema.sql` with the Supabase CLI or SQL editor.
3. Copy the project URL, anon key, and service-role key into `.env.local`.
4. Create an account through `/login`.
5. To grant admin access, update that profile from the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
```

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to client code. Public/authenticated access is constrained with row-level security. Hidden test cases have no student read policy.

## Adding problems

Bundled problems live in `src/lib/problems.ts`; their hidden cases live in the server-only `src/lib/test-cases.server.ts`. Database-authored problems can be managed at `/admin` by an admin user. The JSON editor accepts one problem object or an array of up to 100 objects and can import `.json` files.

Database problems remain drafts until `isPublished` is `true`. Test cases are stored in the separate protected table. At least one test should be marked public if you want it available as a visible sample.

## Quality checks

```bash
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
