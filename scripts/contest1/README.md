# Contest 1 catalog

The supplied Drive archive contains 18 season/title groups and 53 division versions. `sources.json` preserves the retrieved source text, exact Drive IDs, and links; `manifest.json` maps those sources to stable site IDs. The archive has no Junior ACSL Tiles version for 2023–2024.

Run these from the repository root:

```sh
python3 scripts/contest1/build.py
python3 scripts/contest1/audit.py
npm test
npm run typecheck
npm run build
```

`reference.py` is an authoring-only implementation. `fixtures.py` and `old_fixtures.py` preserve 161 independently sourced sample/test input-output sets, including sample tables checked visually in the original PDFs. Worksheet numbering, commas between fields, and the flexible “by #pick” salary format are normalized to the site’s documented format. No expected result is calculated by the reference solver before a source fixture comparison.

`cases.py` deterministically produces twelve distinct hidden inputs per division version. The audit validates the supported input domains, runs every expected answer, checks all public samples and source fixtures, and cross-checks 180 numeric cases with a second method (including positional digit-count formulas rather than enumerating the Next Base range). `verification.json` records the resulting counts. The largest-number cases include 50-digit decimal values, 16-digit base starts crossing a carry boundary, large row indices, and prime-factor edge cases. Stateful suites include bridge resets, double locks, hand rescanning, and division-specific card rules.

The application imports only `catalog.json` for statements and samples. `hidden-tests.json` is imported through a `server-only` module. The authoring scripts and reference solvers are never imported by browser code.

To verify the production UI with an installed Playwright package and Chrome:

```sh
npm run start -- --hostname 127.0.0.1 --port 3100
# In another shell; NODE_PATH can point to a bundled Playwright installation.
node scripts/contest1/browser-check.cjs
node scripts/contest1/execution-check.cjs
```

`ACSL_CHECK_URL` can select another same-origin test deployment. The execution check sends trusted example solutions through the real configured execution service and grades the complete Next Base Senior suite. `ACSL_BROWSER_CHANNEL` overrides Playwright’s default Chrome channel.

`payload.cjs START COUNT` emits bounded JSON chunks for the existing transactional `admin_save_problem` RPC. It stages drafts, including every public sample and hidden case, without credentials. Publishing must happen only after the audit, UI checks, and database readback. Replace the published catalog in one transaction and unpublish retired original problems. Retired records and historical submissions are preserved.

`originals.json` preserves the original PROBLEM wording for every version and records source PDF hashes and figure bounds. `restore-originals.py --source-dir <cached-pdfs>` rebuilds it and the 49 PNG diagrams/tables under `public/problems/figures` using pdfplumber. It excludes worksheet branding, input/test-data pages, and duplicate image layers, checks every prose word against the source, and leaves runtime input/output adapters and all grading fixtures unchanged. The generated JSON/assets are committed, so normal builds do not need the private Drive archive or PDF dependencies.

`node scripts/contest1/presentation.cjs` prepares the 53 responsive reading layouts in `src/lib/contest1/presentation.json`. It preserves the immutable worksheet transcription, replaces flattened tables and fraction images with semantic tables and MathML, redraws small numbered boards/clocks, and uses PDF figure bounds to choose display sizes. Explicit corrections include the lost 10⁵⁰ exponent, broken ordinal/rule continuations, misplaced Henry/AFCS equations, flattened example fields, and the Senior Bridge examples' misleading claim that every successful hand immediately wins a match. The judge, runtime adapters, samples, and hidden tests are unchanged. A source hash prevents the curated layout from overriding later admin edits. KaTeX runs only in the authoring script; its renderer and the complete presentation catalog are not shipped in the browser bundle.

`node scripts/checks/statements.cjs` checks every statement at 620px and 360px in both themes, verifies there is no clipped/scrolling content or duplicate constraint marker, checks images load, and saves full screenshots to `/private/tmp/acsl-statement-review`. It also checks three real workspace routes. Like the theme check, it requires Playwright/Chrome, uses removable local fixtures by default, and accepts `ACSL_CHECK_URL` for a published site.
