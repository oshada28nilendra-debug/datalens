# DataLens

A local-first CSV quality inspector. Upload a dataset, inspect column summaries, define checks, investigate flagged records, and export a JSON report. No accounts, analytics, paid APIs or remote data processing. This is a focused portfolio project, not a data-correctness certification or research novelty claim.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm start
```

Open http://127.0.0.1:4173 and select **Try the sample dataset**. Sample orders intentionally produce **7 findings across 4 records** with the supplied checks. For your own CSV, checks start empty; inferred types do not silently create rules.

```sh
npm test                         # validation/parser tests
npm run build                    # reproducible static bundle in dist/
npx playwright install chromium # one-time test browser download
npm run test:browser              # real Chromium interface tests
```

On Linux CI, use `npx playwright install --with-deps chromium`. Production files are in `dist/`. To test the production bundle locally, run `SERVE_DIST=1 npm start` on macOS/Linux or set `$env:SERVE_DIST='1'` before `npm start` in PowerShell. No deployment is configured. There are no runtime npm dependencies; Playwright is used only for development tests. Installation and browser downloads require internet; processing user datasets does not.

## Features

- Strict UTF-8 CSV import and paginated table preview.
- Per-column observed type, missing count, distinct non-empty count and completeness.
- Required-value, unique-value, inclusive numeric-range and calendar-date rules.
- Flagged-only preview, removable rules, explanatory findings and full JSON report export.
- Responsive layout, native keyboard-accessible controls, status announcements and visible focus indicators.
- Sample data, unit tests and real browser tests in GitHub CI.

## Exact semantics

- Comma separator and one header record are required. Quoted commas, escaped double quotes, embedded line breaks, CRLF/LF/CR, and a UTF-8 BOM are supported.
- Headers are trimmed and must be non-empty and unique. Data values remain unchanged. Malformed quoting and rows with a different field count are rejected, not repaired. Blank physical records are not silently discarded. A final newline does not add a record.
- Whitespace-only cells count as missing. Rules compare trimmed values. Unique checks are case-sensitive and flag **all** occurrences of repeated non-empty values, including the first. Numeric equivalents like `01` and `1` are distinct strings for uniqueness.
- Only Required flags missing values. Combine Required with another check if empty cells should also fail. Literal `NA`, `null`, and `N/A` are ordinary strings.
- Ranges include both endpoints, reject non-numeric text and infinity, and use JavaScript finite floating-point numbers. Dates require real Gregorian dates in `YYYY-MM-DD` (years 0001–9999), with leap-year validation. No locale/date-time guessing.
- Record numbers count the header as record 1; they are **not physical line numbers** when a quoted value spans lines.
- Distinct counts ignore blanks and trim values. Observed types are descriptive and do not impose a schema. With zero records, completeness is shown as “No records”.

## Architecture

`src/engine.js` is a pure parser/profiler/validator/report module shared by Node tests and the browser. `src/app.js` owns session state and renders with DOM `textContent`, so imported text is not executed as HTML. `src/style.css` handles responsive presentation. `scripts/build.mjs` copies deployable static assets; `scripts/serve.mjs` provides a loopback-only development server. CI runs validation tests, builds static assets and exercises Chromium.

The importer validates a new file before replacing the active dataset. A load-version guard stops an earlier asynchronous read from overwriting a later selection. No localStorage, IndexedDB, cookies or server upload are used. Refreshing the page clears the session. The same-origin fetch is only for the bundled sample CSV.

## Limits and privacy

- Maximum 5 MiB, 20,000 data records and 100 columns; synchronous in-memory processing. Not designed for large datasets or many hundreds of rules.
- CSV only: no Excel, semicolon/tab separators, database connections, multi-column uniqueness, automatic fixes, AI inference or cross-file checks.
- Preview is 50 records per page; findings display is capped at 200. The JSON export includes **all** findings, rules and profiles. Long table values may be visually truncated; original values are retained and flagged values appear fully in the report.
- Downloaded reports contain filenames, column names and flagged source values and may be sensitive. Review before sharing.
- Passing the configured checks does not establish data correctness, fairness or suitability for machine learning. Human review remains necessary.
- Browser tests cover Chromium, not an exhaustive browser/accessibility matrix. The development server is not a hardened public server.

## Acceptance checks

The sample yields 7 findings / 4 affected records. Tests cover strict CSV syntax, malformed records, limits, leap years, numeric coercion traps, required/unique/range semantics, reports, HTML-safe rendering, invalid-upload recovery, filtering, rule removal, pagination, download contents and mobile overflow.

For an interview: explain why parsing and validation are separate, why inferred types do not automatically become rules, how flagged-record counts differ from issue counts, and why validation is evidence rather than proof of correctness.
