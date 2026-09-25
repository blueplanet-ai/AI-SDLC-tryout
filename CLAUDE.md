# CLAUDE.md

Static web app for logging prototype test-session notes.
- Spec (source of truth): `intent/spec.md`
- Plan: `intent/plan.md` — section 8 "Clarifications to spec" (D1–D20)
  overrides the spec text where they differ
- Intent: `intent/intent.md`

The owner is not a programmer: explain every technical choice in one plain
sentence, and flag unclear requirements instead of deciding silently.

## Commands
- Run the app locally: `python3 -m http.server 8000 --directory app` → http://localhost:8000
- Unit tests in a browser: `python3 -m http.server 8000` → http://localhost:8000/tests/unit/
- All tests (needs Node 20+): `npm ci && npx playwright install --with-deps chromium && npm test`
- Build a plan step: /plan-step <number>
- CI (`.github/workflows/pages.yml`) runs all tests on every pull request
  (no deploy) and on push to `main`, then deploys only `app/` to GitHub Pages
  if they pass.
- Live site: https://blueplanet-ai.github.io/AI-SDLC-tryout/

## Hard rules (from the spec)
- Plain HTML/CSS/JS in `app/`. No frameworks, no build step, no CDN, no
  external fonts or scripts, no analytics, no server calls.
- Never add a field that stores names, emails, ages, photos, or contact
  details — for participants or for feedback senders.
- Participant IDs are only `P<number>` (`p3` → stored `P3`; `P0` and leading
  zeros rejected; reused ID warns but is allowed). Validate in `model.js`,
  not only in the UI.
- Copy and Download summary must both use `summary.js` → `toMarkdown()`.
- Keep the Content-Security-Policy meta tag in `app/index.html` strict.
- Never commit real study data. Test data must be labelled SAMPLE.
  Exports are named `*.study.json` and are git-ignored.

## Accepted design decisions (summary of plan section 8)
- One study = one round; "Copy study for next round" copies name + screens.
- Feedback count is calculated from logged feedback, never stored separately.
- Shortcuts: Alt+1…9 pick screen, Alt+S screen search, Alt+T toggle type,
  Enter saves, Shift+Enter new line.
- A screen with findings cannot be removed; renaming updates all findings.
- Summary order: distinct participants with pain ↓, pain count ↓, then
  screen-list order. Screens without findings listed last as "No findings".
- Import of an existing study asks: replace, or keep both.
- One active session at a time; it resumes after the browser reopens.
- Delete asks for confirmation; no undo in v1.
- Delete study (D23): the confirm dialog offers "Export a backup first";
  blocked while one of its sessions is running.
- No tight timing tests in CI (machines vary); use generous limits (≥1 s).

## Conventions
- Rules live in `app/js/model.js`, `summary.js`, `backup.js` (no DOM access)
  and have unit tests. Screen code lives in `app/js/views/`.
- ES modules (`import`/`export`). Must be served over http — opening
  `index.html` by double-click will not work.
- Insert user text with `textContent`, never `innerHTML`.
- Storage keys start with `tsn:`; stored data and exports carry `schemaVersion`.
- Every FR change needs a test whose name starts with the FR (e.g. `FR3: ...`).
- One pull request per plan step (branch `step-N-<name>`); never commit
  directly to `main`. The owner merges once the CI check is green.
- Relative paths only (the site is served under `/AI-SDLC-tryout/`).

## Pitfalls
- Shortcuts: use `event.code` (`Digit1`, `KeyT`), not `event.key` — on Mac,
  Option+1 types "¡" and Option+T types "†". Always `preventDefault` on
  handled shortcuts.
- Enter must not save while an input method is composing (Korean, Japanese,
  Chinese): check `event.isComposing`.
- Alt+1…9 switches browser tabs on Linux; target is Mac/Windows laptops.
- Bump `CACHE_VERSION` in `app/sw.js` on every release, or users keep the old app.
- `localStorage` is shared with other `*.github.io` pages of this account.
- Safari clears site data after 7 days without a visit — export reminders matter.
