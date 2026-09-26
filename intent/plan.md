# Implementation plan: prototype test-session notes (v1)

Source: `intent/spec.md` (approved 2026-09-24) and `intent/intent.md`.
Produced by: Claude, 2026-09-24. Reviewed by: Chuhee (product owner), 2026-09-24.
Status: approved — all recommendations in sections 0 and 7 accepted.

Every technical choice is followed by a one-line plain explanation in *italics*.

---

## 0. Decisions (section 7 has details; section 8 is the official record)

These are places where the spec was unclear or where Claude proposed a change.
**All recommendations were accepted by the product owner on 2026-09-24** and
now count as part of the spec for v1. Q9: no mockup provided, so the build
follows the spec text only.

| # | Question | Decision (accepted) |
|---|----------|-------------------|
| Q1 | What is a "round"? FR8 counts feedback *per round*, but the data model has no round. | One study = one round. Add "Copy study for next round" (copies name + screens, no findings). |
| Q2 | Alt+number only reaches 9 screens. What about screen 10+? | Alt+1…9 for the first nine; Alt+S jumps to a type-to-search screen box for any screen. |
| Q3 | Enter saves. How does the note-taker write a two-line note? | Shift+Enter adds a new line. |
| Q4 | Removing a screen that already has findings. | Block removal and say how many findings use it; renaming is always allowed and updates all findings. |
| Q5 | Participant ID details: is `p3` OK? `P0`? `P03`? Same ID twice? | Accept `p3` and store `P3`; reject `P0` and leading zeros; warn (don't block) if the ID was already used in this study. |
| Q6 | Screens with no findings in the summary. | List them at the end as "No findings", so readers know they were tested. |
| Q7 | Importing a study that already exists in this browser. | Ask: "Replace existing" or "Keep both (import as copy)". |
| Q8 | "Copy summary" as Markdown shows `**` and `#` symbols when pasted in email. | Keep Markdown (spec), but use only headings and bullet lists so it reads cleanly even as raw text. |
| Q9 | The spec mentions a mockup "delivered with this spec". It is not in the repo. | Send it to me or add it to `intent/`; otherwise I follow the spec text only. |
| Q10 | Where do automated tests run? This laptop has no Node.js installed. | All tests run on GitHub automatically on every pull request and every push to `main`; that pass/fail check is your main proof. The unit-test page is an extra: it only works after starting the local server (`python3 -m http.server 8000`, then open http://localhost:8000/tests/unit/) — opening the file directly will not work. The robot tests run only on GitHub. |

---

## 1. Files to create or change

The app lives in its own `app/` folder so only the app is published — never the
tests, docs, or anything else.

### Project files

| File | New/changed | Purpose |
|------|-------------|---------|
| `CLAUDE.md` | new | Instructions for Claude when working in this repo: commands, rules, pitfalls (step 1, full draft in section 3). |
| `README.md` | changed | Replace the generic template with: what the app is, the live link, how to run it and its tests. |
| `.gitignore` | new | Stops accidental commits of test output and of exported study files (`*.study.json`), which could contain real notes. |
| `intent/plan.md` | new | This plan. |
| `docs/manual-test-checklist.md` | new | Step-by-step checks you can do yourself in the browser (section 5). |

### The app (`app/`)

| File | Purpose |
|------|---------|
| `app/index.html` | The single page. Holds the five screens (Studies, Setup, Live log, Review, Summary); only one is shown at a time. Contains a security rule (Content-Security-Policy) that forbids the page from contacting any other website. |
| `app/styles.css` | Layout and colours for laptop screens, with AA-contrast colours and a clearly visible keyboard focus outline. |
| `app/js/main.js` | Starts the app and switches between screens using the address bar (e.g. `#/live`). *So the browser Back button works and a reload returns to the same screen.* |
| `app/js/store.js` | Saves and loads everything in the browser's storage after every change. All keys start with `tsn:`. *Other GitHub Pages sites of the same account share this storage, so a prefix keeps our data separate.* |
| `app/js/model.js` | The rules, with no screen code: create study, add/rename/reorder/remove screens, validate `P<number>`, suggest next participant, add/edit/delete findings, feedback target status. *Keeping rules separate from screens lets us test them automatically.* |
| `app/js/summary.js` | Builds the summary (ordering, counts, distinct participants) and turns it into Markdown text. Copy and Download both call this one function. *One source guarantees copy and download are identical.* |
| `app/js/backup.js` | Export study to a file and import it back, with checks that reject broken or foreign files. |
| `app/js/persist.js` | Asks the browser to keep this site's data (C3 d, added in step 9). *A browser feature, not a rule, so it sits apart from `model.js`.* |
| `app/js/keyboard.js` | Live-log shortcuts (Alt+1…9, Alt+T, Alt+S, Enter, Shift+Enter). |
| `app/js/views/studies.js` | Studies screen: list, create, import, export, copy for next round. |
| `app/js/views/backup-status.js` | The "Last exported" indicator shown on the Studies list and on each study screen (added in step 9, D28). *One place for it, so all five screens word it the same way.* |
| `app/js/views/setup.js` | Study setup screen: name, prototype type, screen list. |
| `app/js/views/live.js` | Live log screen: top bar with timer, screen chips, pain/positive toggle, note box, recent findings with inline edit. |
| `app/js/views/review.js` | Review table with filters, edit, delete (with confirmation). |
| `app/js/views/summary.js` | Summary preview, Copy, Download, name-check reminder. |
| `app/js/views/feedback.js` | Feedback received panel, shown on the Summary screen below the summary (added in step 8, D27). *Its own file so adding feedback redraws only the panel and keeps the name-check tick.* |
| `app/sw.js` | "Service worker": keeps a copy of the app files so it opens without internet after the first visit (spec 4.3). Its version is set automatically when the app is published (D29). |
| `app/js/views/app-status.js` | Starts the service worker and shows the "New version available — Reload" banner and the "Offline" note at the top of every screen (added in step 10, D29). |
| `app/favicon.svg` | Small tab icon. |

### Tests and automation

| File | Purpose |
|------|---------|
| `tests/unit/*.test.js` | Automatic checks of the rules in `model.js`, `summary.js`, `backup.js`. |
| `tests/unit/index.html` | A page that runs the unit tests in your browser and shows green/red results. *You can check them without installing anything.* |
| `tests/e2e/*.spec.js` | Robot-browser tests (Playwright) that click and type through the real app like a user. *Proves whole scenarios, e.g. 10 findings with keyboard only.* |
| `tests/fixtures/sample-study.study.json` | A clearly fake example study ("SAMPLE — not real data") for tests and demos. |
| `package.json`, `playwright.config.js` | Lists the test tools: Playwright, and since step 11 the accessibility scanner axe-core. *Used only for testing on GitHub; nothing from here is shipped to users.* |
| `.github/workflows/pages.yml` | On every pull request: run all tests and show pass/fail on the pull request (no publishing). On every push to `main`: run all tests; only if they pass, publish `app/` to GitHub Pages, with the commit set as the version in `app/sw.js` (D29). |

No frameworks and no build step: the files in `app/` are exactly what the browser runs
(one exception since step 10: publishing sets the version line in `app/sw.js`, D29).
*Fewer moving parts means less to break and nothing to keep updated.*

---

## 2. Order of work

```
1 CLAUDE.md + repo basics
        │
2 Walking skeleton + publishing pipeline  ──► app is live (empty) on GitHub Pages
        │
3 Rules (model.js) + unit tests
        │
   ┌────┴─────────────┐
4 Studies & Setup    (needs 3)
   │
5 Sessions + Live log + keyboard   (needs 4)  ◄── riskiest part, done early
   │
   ├──► 6 Review & edit            (needs 5)
   └──► 7 Summary + copy/download  (needs 5)
              │
            8 Feedback received    (needs 7)
        │
9 Export / import + "last exported"   (needs the data format from 3–8 to be settled)
        │
10 Offline (service worker)           (last, because it caches finished files)
        │
11 Full robot tests, accessibility + privacy checks, manual checklist
        │
12 Your acceptance run  ──► tag v1
```

| Step | What | Done when |
|------|------|-----------|
| 1 | `CLAUDE.md`, `.gitignore`, README rewrite | You have reviewed CLAUDE.md |
| 2 | Empty page with 5 screen placeholders, storage module, workflow file, Pages switched on | The link opens a page |
| 3 | `model.js` + unit tests for every rule | Unit tests green |
| 4 | FR1: studies list, create study, screen list editing | Cannot start a session without a screen |
| 5 | FR2 + FR3: start session with suggested ID, live logging, shortcuts, recent feed | 10 keyboard-only findings robot test green |
| 6 | FR4: review table, filters, edit, delete | Robot test green |
| 7 | FR5 + FR6: summary, copy, download, name-check reminder | Copy = download robot test green |
| 8 | FR8: feedback panel, count vs target 2, per round | "below target" → "target met" test green |
| 9 | FR7: export, import, last-exported indicator | Export → clear → import test green |
| 10 | Offline caching | Works with Wi-Fi off after one visit |
| 11 | Accessibility scan, privacy checks, `docs/manual-test-checklist.md` | All automated checks green |
| 12 | You run the manual checklist | You sign off |

Each step is one pull request (D22). You review it on GitHub and merge it
once its pass/fail check is green; merging publishes it.

---

## 3. Step 1: `CLAUDE.md` (draft)

```markdown
# CLAUDE.md

Static web app for logging prototype test-session notes. Spec: intent/spec.md
(source of truth), plan: intent/plan.md. The owner is not a programmer:
explain technical choices in one plain sentence.

## Commands
- Run locally:   python3 -m http.server 8000 --directory app   → http://localhost:8000
- Unit tests in browser: python3 -m http.server 8000  → http://localhost:8000/tests/unit/
- All tests (needs Node 20+): npm ci && npx playwright install --with-deps chromium && npm test
- CI runs all tests and deploys app/ to GitHub Pages on push to main.

## Hard rules (from spec)
- Plain HTML/CSS/JS in app/. No frameworks, no build step, no CDN, no fonts
  or scripts from other sites, no analytics, no server calls.
- Never add a field that stores names, emails, ages, photos or contact
  details — for participants or feedback senders.
- Participant IDs are only P<number>. Validate in model.js, not only in the UI.
- Copy and Download summary must both use summary.js → toMarkdown().
- Keep the Content-Security-Policy meta tag in index.html strict.
- Never commit real study data. Test data must be labelled SAMPLE.

## Conventions
- Rules live in app/js/model.js / summary.js / backup.js (no DOM access) and
  have unit tests. Screen code lives in app/js/views/.
- ES modules (import/export). Must be served over http — opening index.html
  by double-click will not work.
- Insert user text with textContent, never innerHTML.
- Storage keys start with "tsn:"; stored data has a schemaVersion.
- Every FR change needs a test that names the FR (e.g. "FR3: ...").

## Pitfalls
- Shortcuts: use event.code (Digit1, KeyT), not event.key — on Mac, Option+1
  types "¡" and Option+T types "†". Always preventDefault on handled shortcuts.
- Enter must not save while an input method is composing (Korean, Japanese,
  Chinese): check event.isComposing.
- Alt+1…9 switches browser tabs on Linux; the app is tested on Mac/Windows.
- CACHE_VERSION in app/sw.js is set automatically on every release (D29,
  replaced the step-1 rule "bump it by hand").
- GitHub Pages serves under /AI-SDLC-tryout/ — use relative paths only.
- localStorage is shared with other *.github.io pages of this account.
```

---

## 4. Risks and how they are handled

| Risk | What could happen | Handling |
|------|-------------------|----------|
| **Browser storage loss** (C3) | Clearing browser data, a different browser/laptop, or Safari automatically deleting site data after 7 days of not opening the site, erases a study. | (a) Export/import to a file (FR7). (b) "Last exported: 3 days ago" always visible; turns amber if anything in the study changed after the last export (widened from "findings" by D28). (c) After "End session", offer "Export backup now". (d) Ask the browser to mark storage as "persistent" so it is less likely to be auto-cleared (built in step 9, D28). (e) Recommend Chrome/Edge/Firefox in the README; warn about Safari's 7-day rule. |
| **Names in free-text notes** (C2) | "Anna said…" breaks anonymity; software cannot reliably detect names. | Reminder text beside the note box and the feedback box; before Copy/Download, a check step: "Check the summary for names or personal details" with the summary visible. No automatic name detection — *it would give false confidence.* |
| **Exported files leaking** | An exported study file is accidentally committed to this public repo. | `.gitignore` blocks `*.study.json`; exports are named `<study>.study.json`. |
| **Shortcuts clash with typing** | Alt+number/Alt+T type special characters on Mac; Enter fires during Korean/Japanese typing; digits in notes change screen. | Only Alt-combinations are shortcuts (plain digits stay text); detect by physical key, block the special character; ignore Enter while composing; robot tests type notes containing digits and special characters. |
| **Alt conflicts with the browser/OS** | On Linux, Alt+1…9 switches tabs. | Laptop is Mac/Windows; documented. If it clashes on your machine, fallback is Alt+S search. |
| **Old version stuck after updates** | The offline copy keeps showing the previous app. | The version in `sw.js` is set automatically to the commit on each release, so nobody has to remember it (D29); the app shows "New version available — Reload" when one is ready. Never reloads by itself, also not mid-session. |
| **Data format changes later** | v2 can't read v1 data or exports. | Every saved study and export carries `schemaVersion: 1`; import rejects unknown versions with a clear message. |
| **Malicious or broken import file** | A crafted file injects code into the page. | Import validates every field; notes are always displayed as plain text; the security rule blocks outside scripts. |
| **Losing the note while typing** | Tab closes mid-note. | Autosave after every saved finding; the unsaved note draft is also kept in storage. |
| **Shared github.io storage** | Another Pages site from the same account can read this storage. | All are your own repos; keys prefixed; documented in CLAUDE.md. Low risk. |

---

## 5. How each requirement is proven

"Robot test" = automated Playwright test run on GitHub on every push.
"Unit test" = automated check of the rules. "Manual" = in `docs/manual-test-checklist.md`, for you.

### Functional requirements

| Criterion | Automated proof | Manual check for you |
|-----------|-----------------|----------------------|
| FR1: a study with ≥1 screen must exist before a session can start | Unit: `canStartSession` false with 0 screens. Robot: Start session button disabled + explanation until a screen is added; add/rename/reorder/remove screens persist after reload. | Create a study with no screens, try to start a session. |
| FR1: typing a new screen in the log form adds it to the list | Robot: type new screen name in live log, save, check it appears in Setup. | Do it once live. |
| FR2: next ID suggested | Unit: P1 → P2 → P3; gaps handled. Robot: second session pre-fills P2. | Start two sessions. |
| FR2: anything other than `P<number>` rejected inline | Unit: table of good (`P1`, `p12`) and bad (`Anna`, `P`, `P0`, `P1a`, `1`, `P 1`, empty) inputs. Robot: inline message shown, session not started. | Type your own name as participant. |
| FR3: 10 findings in a row, no mouse | Robot: after starting a session, uses only the keyboard to log 10 findings across 3 screens and both types (including notes with digits and Enter-with-Korean-composition), then checks all 10 stored with correct fields. | Unplug/ignore the mouse and log 10 findings. |
| FR3: screen/type stay selected; focus back in note box | Robot: after Enter, note box focused and empty, chip and type unchanged. | — |
| FR3: recent findings visible, editable | Robot: fix a typo in the most recent finding from the feed. | — |
| FR4: edit, delete, filter | Robot: filter by participant, screen, type (and combined); edit; delete with confirm. | — |
| FR5: summary content and order | Unit: fixed sample data → exact expected Markdown (ordering by distinct participants with pain, then pain count; counts; positives inside screen sections; header; feedback request at the end). | Read a summary of sample data and judge if the team would read it. |
| FR6: copy and download | Robot: clipboard text === downloaded file text. | Paste into an email and Slack; open the downloaded file. |
| FR7: autosave, export/import, last exported | Robot: reload keeps data; export → clear storage → import → identical. Unit: import rejects bad files. | Section below. |
| FR8: 1 response → "below target"; 2 → "target met" | Unit + Robot exactly as worded; per-round counts shown on the Studies list. | Log two feedback responses. |

### Definition of done

| DoD item | Automated proof | Manual check |
|----------|-----------------|--------------|
| S1–S5 end to end, no mouse during live logging | One robot test walks S1→S5 in order. | Full dry run with a friend moderating, 2 short sessions. |
| Every FR acceptance criterion passes | All tests above green on GitHub (visible as a green tick on each commit). | Look at the tick on the Actions tab. |
| No field stores names or contact details | Unit: the saved-data format is compared to an allowed list of fields — any new field fails the test until reviewed. Robot: the labels of all input fields on every screen are compared to an allowed list in the same way (D30), and no field is an email, phone or web-address box. | Look through the export file (it is readable text). |
| Copy and download identical | Robot test (FR6). | Compare paste vs file. |
| Export, clear browser data, import restores completely | Robot: deep comparison of the whole study before and after, including sessions, findings, feedback, times. | Export, clear site data in browser settings, reload (app empty), import, check. |

### Non-functional requirements

| Requirement | Proof |
|-------------|-------|
| Privacy: no analytics, no data leaves | Robot: records every network request during a full run — fails if any goes to another website. Security rule in `index.html` blocks it anyway. Code check: no `fetch` to other origins. |
| Accessibility: keyboard, WCAG AA contrast | Robot: automated accessibility scan (axe) on all 5 screens; keyboard-only S1–S5 run. Manual: Tab through each screen, check focus is always visible. |
| Speed: saving feels instant | Manual: log findings quickly; each should appear in the feed with no visible wait. Robot: only a generous safety limit (feed updates within 1 second) to catch a real slowdown. *GitHub's test machines vary in speed, so a tight limit would fail at random.* |
| Offline | Robot: load once, go offline (and stop the web server), reload, log a finding — for the published app and for local testing; every app file is in the offline copy; the "Offline" note shows only while offline; a new version shows the banner, does not reload by itself, and Reload during a session keeps the session and the half-typed note (D29). Manual: turn off Wi-Fi and reload. |

---

## 6. Publishing on GitHub Pages

1. **You, once:** on GitHub, open the repo → Settings → Pages → "Build and
   deployment" → Source: **GitHub Actions**. *This lets the workflow publish;
   it is one setting and nothing else changes.*
2. **Automatic, on every pull request:** `.github/workflows/pages.yml` runs
   the unit and robot tests and shows a pass/fail check on the pull request.
   Nothing is published. *You see whether a change works before you merge it.*
3. **Automatic, on every push to `main`:** the same tests run again; if all
   pass, it publishes only the `app/` folder.
   *A failing test blocks publishing, so a broken version never goes live.*
4. **Address:** https://blueplanet-ai.github.io/AI-SDLC-tryout/
5. **What is public:** the app's code (already public with the repo). Study
   data is never in the repo or on GitHub — it stays in the browser of the
   laptop that uses the app, and in export files you keep.
6. **Rollback:** revert the bad commit on GitHub; the previous version is
   republished automatically.

---

## 7. Spec items flagged (all accepted 2026-09-24)

1. **"Round" is undefined (Q1).** FR8 and the data model mention counts per
   round, but nothing defines where a round starts or ends. Recommendation:
   one study = one round, plus "Copy study for next round". Rounds are then
   compared on the Studies list.
2. **Data model stores "feedback count per round" on the Study.** I would
   *calculate* the count from the logged feedback instead of storing it
   separately. *A stored count can drift out of step with the actual list.*
3. **Screens 10+ and Alt+number (Q2)**, **multi-line notes (Q3)**, **removing
   a screen with findings (Q4)**, **participant ID edge cases (Q5)**, **empty
   screens in summary (Q6)**, **duplicate import (Q7)**, **Markdown in email
   (Q8)** — see the table in section 0.
4. **Only one active session at a time.** Not stated; I assume it. If the
   browser closes mid-session, reopening the app resumes that session.
5. **Timer and "End session".** The timer is display-only; ending a session
   records the end time. Findings can still be edited afterwards (FR4).
6. **Date range in the summary** = earliest to latest session start date.
7. **Summary tie-break.** After distinct participants and pain count, screens
   keep their order from the screen list.
8. **Delete is permanent.** I propose a confirmation step; no undo in v1.
9. **Mockup missing from repo (Q9).**
10. **Addition I recommend (C3):** after "End session", prompt to export a
    backup. Small, and directly reduces the biggest data-loss risk.
11. **Browser support is not stated.** I propose: current Chrome, Edge,
    Firefox on Mac/Windows laptops. Safari works but auto-clears unused site
    data after 7 days, so it is "supported with care".

Nothing in this plan adds a server, accounts, analytics, or any participant
field beyond `P<number>`.

---

## 8. Clarifications to spec

Decided by the product owner (Chuhee) on 2026-09-24. For v1 these count as part
of `intent/spec.md`; where they differ from the spec text, this list wins.

| # | Topic | Decision |
|---|-------|----------|
| D1 | Rounds (Q1) | One study = one round. "Copy study for next round" copies name and screen list, no findings or feedback. Rounds are compared on the Studies list. |
| D2 | Screens 10+ (Q2) | Alt+1…9 pick the first nine screens; Alt+S opens a type-to-search screen box for any screen. |
| D3 | Multi-line notes (Q3) | Enter saves; Shift+Enter adds a new line. |
| D4 | Removing screens (Q4) | A screen with findings cannot be removed (the app says how many findings use it). Renaming is always allowed and updates all findings. |
| D5 | Participant IDs (Q5) | `p3` accepted and stored as `P3`; `P0` and leading zeros (`P03`) rejected; an ID already used in the study shows a warning but is allowed. |
| D6 | Empty screens in summary (Q6) | Listed at the end as "No findings". |
| D7 | Importing an existing study (Q7) | The app asks: "Replace existing" or "Keep both (import as copy)". |
| D8 | Summary format (Q8) | Markdown, limited to headings and bullet lists so it reads cleanly as raw text. |
| D9 | Mockup (Q9) | No mockup exists in the repo; `spec.md` text is the source of truth for layout. |
| D10 | Where tests run (Q10) | GitHub runs all tests on every pull request and push to `main` — this is the main proof. The unit-test page is optional and needs the local server command. |
| D11 | Feedback count (item 2) | Calculated from the logged feedback, never stored separately. |
| D12 | Active sessions (item 4) | One active session at a time; it resumes if the browser is closed and reopened. |
| D13 | Timer and End session (item 5) | Timer is display-only; End session records the end time; findings stay editable afterwards. |
| D14 | Summary date range (item 6) | Earliest to latest session start date. |
| D15 | Summary tie-break (item 7) | Distinct participants with pain ↓, then pain count ↓, then screen-list order. |
| D16 | Delete (item 8) | Confirmation step; permanent; no undo in v1. |
| D17 | Backup prompt (item 10) | After "End session", the app offers "Export backup now". |
| D18 | Browser support (item 11) | Current Chrome, Edge, Firefox. Safari "with care"; the README warns that Safari clears site data after 7 days without a visit. |
| D19 | CI on pull requests | All tests run on every pull request (no publishing) and show a pass/fail check before merge. |
| D20 | Speed check | No tight timing test in CI. Manual "feels instant" check, plus a generous 1-second robot limit. |
| D21 | README (was O1) | Keep the original intro, goals and other sections; add a section called "The app: test-session notes" after Goals. |
| D22 | Work style (was O2) | One pull request per plan step. Each pull request must show a passing check before it is merged. |
| D23 | Deleting a study (added in step 4, 2026-09-24) | A study can be deleted from the Studies list. A confirmation dialog explains that deleted data cannot be recovered and offers "Export a backup first" in the same dialog. Deleting is blocked while one of the study's sessions is running. Delete is permanent (no undo, as D16). Because the backup needs it, **exporting a study to a `.study.json` file moves forward from step 9 to step 4**; import stays in step 9. |
| D24 | Live log details (added in step 5, 2026-09-24; confirmed by the product owner 2026-09-25) | The participant ID is entered on the Live log screen ("Start session" in Setup leads there). Keeping the half-typed note after the tab closes (section 4) is built in step 5. While a session runs, Setup and Studies show "Continue in Live log", and no other study can start a session (D12). "Find or add a screen" (Alt+S) picks an existing screen or adds the typed name to the list (FR1, D2). **End session asks for confirmation**, combined with the D17 backup offer in one dialog: "End session for P<n>?" with "End and export backup", "End" and "Cancel" (Cancel and Escape keep the session running). **Recent findings fixes only the note text**; screen and type are fixed in Review (step 6). |
| D25 | Review details (added in step 6, decided by the product owner 2026-09-25) | The participant of a finding is not editable in Review (it belongs to the session). Findings are listed newest first, matching the Live log recent feed. Filters reset when another study is opened or the page reloads. The edit box shows the "No names or personal details" reminder. Findings can be edited in Review while a session is running. |
| D26 | Summary details (added in step 7, decided by the product owner 2026-09-25) | **Decided by the owner:** the summary ends with the feedback request, word for word: "Reply to this message with one thing that was useful and one thing you'll act on." Inside a screen section, pain points come first, then positive moments; oldest first within each. Notes show the participant ID only, no time. The download is named "&lt;study name&gt; - round &lt;N&gt; - summary - &lt;YYYY-MM-DD&gt;.md" (round number added by the owner on 2026-09-25, so two rounds downloaded on the same day get different names). Name check (C2): the summary is shown with a checkbox "I checked for names and personal details"; Copy and Download stay disabled until it is ticked. **Details chosen by Claude in step 7 (open for owner review):** the header also shows the round number. The title is "Test summary: &lt;study name&gt;"; the request sits under a "Feedback" heading, after "No findings". Each screen section lists its three counts as bullets, then "Pain points" and "Positive moments" sub-headings (left out when empty). "Participants" counts different participant IDs (an ID used twice counts once). Dates are written YYYY-MM-DD in the laptop's time zone; one date if all sessions were on the same day; "no sessions yet" if none. A note with several lines stays in one bullet. Notes are copied exactly as typed. The screen shows the summary as plain text, exactly as it will be copied. The tick is not remembered: each visit to Summary asks again. In the file name, characters that file systems refuse (/ \ : * ? " &lt; &gt; \|) become "-", and the date is the day of the download. |
| D27 | Feedback received (added in step 8, decided by the product owner 2026-09-25) | **Decided by the owner:** logged feedback cannot be edited; delete it (with confirmation, as D16) and add it again. Date received defaults to today; future dates are rejected. With 0 or 1 responses the status reads "&lt;n&gt; of 2 — below target"; with 2 or more, "&lt;n&gt; of 2 — target met". Each study row on the Studies list shows the round's status in a column headed "Feedback", as "&lt;n&gt; of 2 — &lt;status&gt;" (first worded "Feedback: &lt;n&gt; of 2 — &lt;status&gt;"; the owner dropped the repeated "Feedback:" on 2026-09-25). The feedback box shows the reminder "Paste the content only — no names, email addresses or signatures." The target stays fixed at 2 (not editable in the app). **Details chosen by Claude in step 8 (open for owner review):** the panel sits on the Summary screen below the summary text, in its own file `views/feedback.js`. "Future" means later than today on the laptop's clock and time zone; there is no earliest allowed date. The error reads "The date received cannot be in the future." Logged feedback is listed newest date received first (same date: last logged first), each with "Received &lt;YYYY-MM-DD&gt;" and a Delete button. In the feedback box, Enter adds a new line (pasted replies often have several lines); the "Add feedback" button adds it. The status is amber when below target and green when met (the words carry the meaning too). Feedback can be logged at any time, also while a session is running. |
| D28 | Export, import and "Last exported" (added in step 9, decided by the product owner 2026-09-25) | **Decided by the owner:** each row of the Studies list has an "Export study" button next to Delete. "Last exported: &lt;how long ago&gt;" is shown on each Studies row and at the top of the study's screens (Setup, Live log, Review, Summary). It turns amber when anything in the study changed after the last export — findings, feedback, screens or sessions (wider than section 4, which said findings only). A study never exported shows "Not backed up yet", amber once it has findings. "Replace existing" on import (D7) is blocked while that study has a running session, with a message (same rule as D23). Section 4 C3(d) is built in this step: the app asks the browser to keep this site's data. A small "Export now" button sits next to the indicator on Setup, Live log, Review and Summary (added by the owner on 2026-09-25 after review); on Live log it never takes focus from the note box and is never pressed by Enter or the Alt shortcuts, and the FR3 "10 findings with the keyboard only" test still passes. **Details chosen by Claude in step 9 (open for owner review):** "Export now" redraws only the indicator, so half-typed text and the Summary name-check tick are kept; a screen drawn before the export can still save afterwards without losing the export time. the study stores one more time, `changedAt` (when anything last changed; not personal data), so "changed since the export" can be worked out; an export alone, or saving without a real change, does not count as a change. Studies saved before this step have no `changedAt` and show amber until the next export, to be safe. When amber, the words say so too: "Last exported: 3 days ago — changed since". "How long ago" reads "just now", "N minutes ago", "N hours ago" or "N days ago", and is worked out each time the screen is drawn (it does not tick by itself). On the Studies list it sits in a column headed "Backup". "Keep both" imports the copy with "(copy)" after the name, so the two rows can be told apart. After an import the note-taker stays on the Studies list. A backup that holds a running session is refused while another session runs in this browser (D12); otherwise its session resumes. Import refuses files that are not backups from this app, from a newer app version, larger than 5 MB, or with any field the app does not store (so no names or contact details can come in), each with a message starting "Could not import this file:". The browser is asked to keep the data when a study is created or imported and when the app opens with studies in it (not on a first empty visit, since Firefox may show a question); the Studies screen says whether the browser agreed. |
| D29 | Offline and new versions (added in step 10, decided by the product owner 2026-09-25) | **Decided by the owner:** the offline-copy version is set automatically on every release, so nobody has to remember to change it (replaces "bump `CACHE_VERSION` by hand" in section 3 and `CLAUDE.md`). "New version available — Reload" is a slim banner at the top of every screen with a Reload button; the app never reloads by itself. Reload is allowed during a running session, but only when pressed. While the laptop is offline a small note says "Offline — your work is saved on this laptop". The README explains how to see the latest version when testing locally. If the security rule (Content-Security-Policy) has to change, the pull request explains why. **Details chosen by Claude in step 10 (open for owner review):** the publish workflow writes the commit into the one line `const CACHE_VERSION = 'dev';` of `app/sw.js` just before publishing, and stops publishing if that line is missing; the files in the repo are unchanged. The published app opens from its saved copy (fast, works on bad Wi-Fi) and switches to a new version only on Reload. In local testing the version stays `'dev'`, and the app then always loads the newest files while the local server runs and uses the saved copy only when the server is off — so the banner never shows locally. The banner sits above the menu, in amber, and never takes focus (the Live log note box keeps it). The offline note sits at the right of the menu bar, in amber. Both are announced by screen readers. A new version is looked for when the app opens, when the note-taker comes back to the tab, and when the internet returns. The first visit never shows the banner. With two tabs open, Reload in one tab switches both to the new version, but only that tab reloads; Reload in the other tab then just reloads it. Only saved copies named `tsn-app-…` are ever deleted, because other sites on `blueplanet-ai.github.io` share the same browser storage. The Content-Security-Policy did not need to change: it already allowed the app's own service worker (`worker-src 'self'`). A session's half-typed note and running session come back after Reload (as after any reload, D12 and step 5). |
| D30 | Final checks and manual checklist (added in step 11, decided by the product owner 2026-09-26) | **Decided by the owner:** accessibility problems found by the scan are fixed in this step, and each fix is listed in the pull request in plain words. Robot tests stay on Chromium; the manual checklist covers Chrome and Firefox. `docs/manual-test-checklist.md` is organised by scenario S1 to S5, each line "Do this / Expect this" with a checkbox, about 30 minutes in total. It ends with a "Decisions to confirm" section listing every "Details chosen by Claude (open for owner review)" item from D24–D29, each with Accept / Change. It includes the definition-of-done dry run: a friend moderates, the owner takes notes, two short SAMPLE sessions. **Details chosen by Claude in step 11 (open for owner review):** the scan uses axe-core (a free, widely used accessibility checker), added as a test tool only; the robot hands it to the page, so the app does not load it and its security rule is unchanged. It checks the WCAG 2.1 level A and AA rules only (the level the spec asks for), not axe's extra "best practice" advice. It scans every screen with and without a study, plus the edit modes, every confirmation dialog, the refused-participant message, and the "New version" banner and offline note. The S1–S5 robot test uses the keyboard for the whole run, not only during live logging, and records every request the browser makes, including the offline copy's. The privacy robot test compares the labels of all input fields to an allowed list, so any new field fails until reviewed; a second test reads the app's code and fails on any web address (except the name of the SVG format in the tab icon, which is never visited), on any way of sending data out, and on `fetch` anywhere except the offline copy, which only fetches the app's own files. In the checklist, the full run is done in Chrome on the published app (offline behaviour needs it) and Firefox repeats only the parts that differ between browsers: shortcuts, focus outline, copy/download, the date box, export/import and offline. The dry run is the S2–S3 part of the checklist, with the offline and reload checks done during session 2. D24 and D25 have no items in "Decisions to confirm", because the owner decided or confirmed all of their details. |
