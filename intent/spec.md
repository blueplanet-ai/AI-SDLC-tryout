# Spec: prototype test-session notes (v1)

Source intent: `intent/intent.md` (author Chuhee, 2026-09-23)
Produced by: Claude, 2026-09-23. Reviewed by: Chuhee (product owner), 2026-09-24
Version: 1.1 — 2026-09-30 — folds in plan.md §8 D1–D30
Status: approved — v1 shipped as v1.0.0 (accepted 2026-09-26, see
`docs/acceptance-v1.md`)
Skills applied: none — no organizational brand, security, compliance, or UX
skills exist yet (see concern C1). Constraints come from `intent.md` only.

Legend: items marked **[DECISION]** were proposed by Claude and accepted by the
product owner on 2026-09-24. They are kept marked as an audit trail.
Tags like "(D12)" point to the decision in `intent/plan.md` section 8 where the
rule was first agreed (D1–D30, all accepted by the product owner by
2026-09-26). This spec is the source of truth; the plan's table is history.

---

## 1. Summary
A laptop web app for a dedicated note-taker to log observations live during
prototype test sessions. Each finding is tagged to an anonymous participant,
a prototype screen, and a type (pain point or positive moment). After a round
of sessions, the app generates a summary grouped by screen that the team can
read and act on.

## 2. Users and key scenarios

| # | When | Who | Scenario |
|---|------|-----|----------|
| S1 | Before the round | Note-taker | Creates a study: name, prototype type, and the list of screens being tested |
| S2 | Start of each session | Note-taker | Starts a session for the next anonymous participant (P1, P2, ...) |
| S3 | During the session | Note-taker | Logs findings fast while the moderator runs the session |
| S4 | After the round | Note-taker | Reviews and cleans up findings, then generates and shares the summary |
| S5 | After sharing the summary | Note-taker | Logs the feedback readers send back about the summary (feeds the success metric) |

The moderator does not use the app. Team members read the summary and reply
with feedback through their usual channel (email, chat); they never use the app.

A **round** is one study: one study = one round (D1). The next round starts
from "Copy study for next round" (FR1).

## 3. Functional requirements

### FR1 — Study setup (S1)
- Create a study with a name and a prototype type: Figma click-through,
  in-vehicle / display, or other.
- Add, rename, reorder, and remove screens in a screen list.
- **[DECISION]** Resolves open question 5: screens are prepared as a list
  before the round, and can also be added on the fly during a session
  (typing a new screen name in the log form adds it to the list; see
  "Find or add a screen" in FR3) (D24).
- A screen with findings cannot be removed; the app says how many findings
  use it. Renaming is always allowed and updates all findings (D4).
- "Copy study for next round" copies the name and screen list, with no
  findings or feedback. Rounds are compared on the Studies list (D1).
- A study can be deleted from the Studies list. A confirmation dialog explains
  that deleted data cannot be recovered and offers "Export a backup first" in
  the same dialog. Deleting is blocked while one of the study's sessions is
  running. Delete is permanent, with no undo (D16, D23).

**Acceptance:** A study with at least one screen exists before a session can start.

### FR2 — Sessions and participants (S2)
- "Start session" in Setup leads to the Live log, where the participant ID is
  entered (D24).
- Starting a session suggests the next participant ID (P1, P2, ...).
- The participant field accepts only the pattern `P` + number. No other
  participant fields exist (no name, email, age, or photo).
- `p3` is accepted and stored as `P3`; `P0` and leading zeros (`P03`) are
  rejected; an ID already used in the study shows a warning but is allowed (D5).
- One active session at a time; it resumes if the browser is closed and
  reopened (D12). While a session runs, Setup and Studies show
  "Continue in Live log", and no other study can start a session (D24).
- The session timer is display-only. "End session" records the end time;
  findings stay editable afterwards (D13).
- End session asks for confirmation, combined with the backup offer in one
  dialog: "End session for P<n>?" with "End and export backup", "End" and
  "Cancel". Cancel and Escape keep the session running (D17, D24).

**Acceptance:** Entering anything other than `P<number>` is rejected with an inline message.

### FR3 — Live logging (S3)
Each finding records:
| Field | Required | Source |
|-------|----------|--------|
| Participant | yes | automatic, from the active session |
| Screen | yes | picked from list (or typed new) |
| Type | yes | pain point or positive moment |
| Note | yes | free text |
| Time | yes | automatic |

- Keyboard-first: Alt+number picks a screen, Alt+T toggles pain/positive,
  Enter saves, and focus returns to the note box. (Changed after the mockup:
  plain number keys would clash with typing digits inside a note.)
- Alt+1…9 pick the first nine screens. Alt+S opens "Find or add a screen", a
  type-to-search screen box for any screen: it picks an existing screen or
  adds the typed name to the list (D2, D24).
- Enter saves; Shift+Enter adds a new line (D3).
- The screen and type stay selected after saving, so consecutive notes on the
  same screen need only typing and Enter.
- The most recent findings are visible under the input so the note-taker can
  fix a typo immediately. Recent findings fixes only the note text; screen and
  type are fixed in Review (D24).
- The half-typed note is kept if the tab closes or the page reloads (D24).
- **[DECISION]** Resolves open question 4: no severity level in v1.
  Pain vs. positive keeps logging fast; severity is a candidate for loop two.
- **[DECISION]** Speed target: a finding on the current screen can be logged
  with only typing plus Enter; changing screen or type adds one keystroke each.

**Acceptance:** Logging 10 findings in a row without using the mouse is possible.

### FR4 — Review and edit (S4)
- Edit or delete any finding, during or after a session. Findings can be
  edited in Review while a session is running (D25).
- The participant of a finding is not editable in Review (it belongs to the
  session) (D25).
- Delete asks for confirmation; it is permanent, with no undo in v1 (D16).
- Findings are listed newest first, matching the Live log recent feed (D25).
- Filter findings by participant, screen, and type. Filters reset when
  another study is opened or the page reloads (D25).
- The edit box shows the "No names or personal details" reminder (D25).

### FR5 — Summary (S4)
- Title: "Test summary: &lt;study name&gt;" (D26).
- Header: study name, prototype type, round number (D26), date range, number
  of participants.
  - The date range is the earliest to latest session start date (D14). Dates
    are written YYYY-MM-DD in the laptop's time zone; one date if all sessions
    were on the same day; "no sessions yet" if none (D26).
  - "Participants" counts different participant IDs (an ID used twice counts
    once) (D26).
- One section per screen, containing:
  - counts of pain points and positive moments,
  - how many different participants reported a pain point there,
  - the notes, each with its participant ID.
- Each screen section lists its three counts as bullets, then "Pain points"
  and "Positive moments" sub-headings (left out when empty). Pain points come
  first, then positive moments; oldest first within each. Notes show the
  participant ID only, no time. A note with several lines stays in one
  bullet. Notes are copied exactly as typed (D26).
- **[DECISION]** Screens are ordered by the number of different participants
  who reported a pain point (breadth of the problem), then by pain count,
  then by their order in the screen list (D15).
- Screens with no findings are listed at the end as "No findings", so readers
  know they were tested (D6).
- Positive moments are shown in each screen section, not in a separate list,
  so readers see what works next to what does not.
- The summary ends with a **feedback request** (the "feedback field"):
  under a "Feedback" heading, after "No findings", word for word:
  "Reply to this message with one thing that was useful and one thing you'll act on." (D26)
- The Summary screen shows the summary as plain text, exactly as it will be
  copied (D26).

### FR6 — Sharing the summary (S4)
- **[DECISION]** Resolves open question 3: two outputs, no hosted link.
  1. "Copy summary" — copies the summary as formatted text (Markdown) for
     pasting into email, Slack, Teams, or a doc.
  2. "Download summary" — saves the same content as a file.
- The Markdown uses only headings and bullet lists, so it reads cleanly even
  as raw text (D8).
- The download is named "&lt;study name&gt; - round &lt;N&gt; - summary - &lt;YYYY-MM-DD&gt;.md",
  where the date is the day of the download. Characters that file systems
  refuse (`/ \ : * ? " < > |`) become "-" (D26).
- Name check (C2): the summary is shown with a checkbox
  "I checked for names and personal details"; Copy and Download stay disabled
  until it is ticked.
  The tick is not remembered: each visit to Summary asks again (D26).
- A hosted page link is not offered, because it would require storing study
  data on a server, which conflicts with the no-accounts, static-site
  constraints in `intent.md`.

### FR7 — Data persistence
- **[DECISION]** Resolves open question 2: data autosaves in the laptop's
  browser storage, plus "Export study" / "Import study" to a file the
  note-taker keeps as a backup or moves to another laptop.
- Each row of the Studies list has an "Export study" button next to Delete.
  A small "Export now" button sits next to the backup indicator on Setup,
  Live log, Review and Summary. On Live log it never takes focus from the note
  box and is never pressed by Enter or the Alt shortcuts, so the FR3
  "10 findings with the keyboard only" acceptance still holds. "Export now"
  redraws only the indicator, so half-typed text and the Summary name-check
  tick are kept (D28).
- After "End session", the app offers a backup ("End and export backup",
  FR2) (D17, D24).
- The app shows when the study was last exported (D28):
  - "Last exported: &lt;how long ago&gt;" is shown on each Studies row, in a
    column headed "Backup", and at the top of the study's screens (Setup,
    Live log, Review, Summary).
  - "How long ago" reads "just now", "N minutes ago", "N hours ago" or
    "N days ago", and is worked out each time the screen is drawn (it does
    not tick by itself).
  - It turns amber when anything in the study changed after the last export —
    findings, feedback, screens or sessions — and the words say so too:
    "Last exported: 3 days ago — changed since".
  - The study remembers when it last changed (not personal data), so
    "changed since the export" can be worked out. An export alone, or saving
    without a real change, does not count as a change. Studies saved before
    the app kept this time show amber until their next export, to be safe.
  - A study never exported shows "Not backed up yet", amber once it has
    findings.
- Import (D7, D28):
  - Importing a study that already exists asks: "Replace existing" or
    "Keep both (import as copy)". "Keep both" imports the copy with "(copy)"
    after the name, so the two rows can be told apart.
  - "Replace existing" is blocked while that study has a running session,
    with a message (same rule as deleting a study, FR1).
  - A backup that holds a running session is refused while another session
    runs in this browser (D12); otherwise its session resumes.
  - Import refuses files that are not backups from this app, from a newer app
    version, larger than 5 MB, or with any field the app does not store (so
    no names or contact details can come in), each with a message starting
    "Could not import this file:".
  - After an import the note-taker stays on the Studies list.
- The app asks the browser to keep this site's data when a study is created
  or imported and when the app opens with studies in it (not on a first empty
  visit, since Firefox may show a question); the Studies screen says whether
  the browser agreed (D28).

### FR8 — Success tracking (S5)
Metric, from `intent.md`: "measured by having a feedback field and actual
feedback is received."
- The summary carries a feedback request (FR5). Because the app has no server,
  readers reply through their usual channel; the note-taker then logs each
  response in the app's **Feedback received** panel for that round (one
  round = one study, D1). The panel sits on the Summary screen, below the
  summary text (D27).
- Each logged response stores: date received and the feedback text. No reader
  names are stored.
  - Date received defaults to today; future dates are rejected. "Future"
    means later than today on the laptop's clock and time zone; there is no
    earliest allowed date. The error reads
    "The date received cannot be in the future." (D27)
  - The feedback box shows the reminder "Paste the content only — no names, email addresses or signatures."
    In the feedback box, Enter adds a new line (pasted replies often have
    several lines); the "Add feedback" button adds it (D27).
  - Logged feedback cannot be edited; delete it (with confirmation, as FR4)
    and add it again. It is listed newest date received first (same date:
    last logged first), each with "Received &lt;YYYY-MM-DD&gt;" and a Delete
    button (D27).
  - Feedback can be logged at any time, also while a session is running (D27).
- The app shows **feedback received** = number of logged responses for the
  round, and keeps the count per round so rounds can be compared. The count is
  calculated from the logged feedback, never stored separately (D11).
  - With 0 or 1 responses the status reads "&lt;n&gt; of 2 — below target";
    with 2 or more, "&lt;n&gt; of 2 — target met". The status is amber when
    below target and green when met (the words carry the meaning too) (D27).
  - Each study row on the Studies list shows the round's status in a column
    headed "Feedback", as "&lt;n&gt; of 2 — &lt;status&gt;" (D27).
- **Target (set by product owner, 2026-09-24):** at least **2 feedback
  responses per round**. A round with fewer than 2 breaches the target; in
  Stage 6 (Maintain) a breach triggers the next `intent.md`. The target stays
  fixed at 2 (not editable in the app) (D27).

**Acceptance:** After logging 1 response the round shows "below target";
after logging a 2nd it shows "target met".

## 4. Design

### 4.1 Screens
1. **Studies** — list of studies; create new; import. Each row shows the
   "Feedback" and "Backup" columns and has "Export study", Delete and
   "Copy study for next round" (FR1, FR7, FR8).
2. **Study setup** — name, prototype type, screen list; "Start session"
   (or "Continue in Live log" while a session runs).
3. **Live log** — the main working screen:
   - top bar: study name, current participant, session timer, "End session";
   - screen picker (numbered chips), "Find or add a screen" (Alt+S),
     pain/positive toggle;
   - large note box with Enter to save;
   - recent findings feed below.
4. **Review** — all findings in a table with filters; edit/delete.
5. **Summary** — generated summary with feedback request and name check;
   copy, download, and below the summary a Feedback received panel with the
   round's count against the target (D27).

Setup, Live log, Review and Summary show the "Last exported" indicator with
"Export now" at the top (D28). Every screen can show the
"New version available — Reload" banner and the offline note (4.3).

No mockup is in the repo; this spec's text is the source of truth for layout
(D9).

### 4.2 Data model (plain terms)
- **Study** (= one round, D1): name, prototype type, screen list, when it
  last changed and when it was last exported (D28). The feedback count is
  not stored; it is calculated from the logged feedback (D11).
- **Session**: participant ID, start time, end time
- **Finding**: session, screen, type, note, time
- **Feedback**: round, date received, feedback text (no reader names)

### 4.3 Technical approach
- A single static web app (HTML, CSS, JavaScript), no server, no database,
  no sign-in.
- Works offline after it has been opened once (**[DECISION]**; useful when
  testing in vehicles or labs without reliable Wi-Fi).
- Offline and new versions (D29):
  - The published app opens from its saved copy (fast, works on bad Wi-Fi).
  - While the laptop is offline, a small note says
    "Offline — your work is saved on this laptop". It sits at the right of the
    menu bar, in amber.
  - When a new version is ready, "New version available — Reload" is a slim
    banner at the top of every screen, above the menu, in amber, with a
    Reload button. It never takes focus (the Live log note box keeps it).
  - The app never reloads by itself; it switches to a new version only when
    Reload is pressed. Reload is allowed during a running session, but only
    when pressed; the running session and its half-typed note come back
    after Reload (D12, D24).
  - A new version is looked for when the app opens, when the note-taker comes
    back to the tab, and when the internet returns. The first visit never
    shows the banner.
  - With two tabs open, Reload in one tab switches both to the new version,
    but only that tab reloads; Reload in the other tab then just reloads it.
  - The banner and the offline note are both announced by screen readers.
- Hosting: GitHub Pages from the public repo (concern C5).

## 5. Non-functional requirements
- **Privacy:** only anonymous participant IDs are stored; no analytics or
  tracking; data never leaves the laptop unless the note-taker exports or
  copies it.
- **Accessibility:** fully usable by keyboard; text contrast meets WCAG 2.1
  level AA.
- **Speed:** saving a finding feels instant (no loading step).
- **Layout:** designed for laptop screens; no phone layout in v1.
- **Browsers:** current Chrome, Edge and Firefox on Mac/Windows laptops.
  Safari is supported "with care": it clears site data after 7 days without
  a visit, so regular exports matter (D18).

## 6. Flagged concerns (all reviewed 2026-09-24)

| # | Concern | Why it matters | Handling | Owner |
|---|---------|----------------|-------------------|-------|
| C1 | No organizational skills applied | The playbook expects brand, security, compliance, and UX policies as skills. This spec was checked only against `intent.md`. | Accepted for the practice run; revisit when skills exist | Product owner — accepted |
| C2 | Free-text notes can capture personal data | A note like "Anna said the menu is confusing" breaks the anonymous-ID constraint, and software cannot reliably prevent it. The same applies to logged feedback text. | Show a reminder next to the note box, the Review edit box and the feedback box; before copy/download, the name-check tick (FR4, FR6, FR8; D25, D26, D27) | Product owner — accepted |
| C3 | Browser-only storage can be lost | Clearing the browser or switching laptops loses the study. | Export/import plus "last exported" indicator, backup offer at End session, and asking the browser to keep the data (FR7; D17, D28) | Product owner — accepted |
| C4 | Success metric depends on manual logging | Feedback that arrives but is not logged in the app will not count, so a breach could be a logging gap rather than a real drop. | Accepted; check for unlogged replies before declaring a breach in Stage 6 | Product owner — accepted |
| C5 | Hosting on GitHub Pages depends on the GitHub plan | GitHub Pages is available for public repos on GitHub Free, and for private repos only on paid plans. | **Resolved 2026-09-24:** repo made public; no study data is ever stored in the repo | Product owner — resolved |
| C6 | Company data policy for user-test data | Company confidentiality rules could apply to test notes. | **Not applicable (2026-09-24):** personal project, not company work | Product owner — resolved |
| C7 | In-vehicle sessions assumed to use a laptop | The intent says laptop-first; logging from inside a vehicle may be awkward. | Keep laptop-first for v1; revisit after the first real round | Product owner — accepted |

## 7. Open questions from `intent.md` — status

| # | Question | Status in this spec |
|---|----------|---------------------|
| 1 | How to measure "team reads and acts on it" | Answered in `intent.md` and FR8: feedback received, target at least 2 responses per round |
| 2 | Where data lives | Decided: browser storage + export/import (FR7) |
| 3 | How the summary is shared | Decided: copy as text + download (FR6) |
| 4 | Severity levels | Decided: not in v1 (FR3) |
| 5 | How screens are set up | Decided: prepared list + add on the fly (FR1) |

## 8. Out of scope (v1)
From `intent.md`: video/audio recording, multi-user real-time sync, Figma
integration, login/accounts.
Also deferred by this spec: severity levels, phone/tablet layout, hosted
share links.

## 9. Definition of done (v1)
- [ ] A note-taker can run S1–S5 end to end on a laptop, with no mouse
      needed during live logging.
- [ ] Every FR acceptance criterion above passes.
- [ ] No field anywhere stores participant names or contact details.
- [ ] Summary copy and download produce the same content.
- [ ] Export, clear browser data, and import restores the study completely.

## References
- Anthropic, "Requirements and design", The AI-Native SDLC Playbook, Claude
  Academy: https://academy.claude.com/courses/ai-native-sdlc-playbook/requirements-and-design
- Anthropic, "Capture as intent.md", The AI-Native SDLC Playbook:
  https://academy.claude.com/courses/ai-native-sdlc-playbook/capture-intent
- GitHub Docs, "What is GitHub Pages?" (plan availability):
  https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- W3C, Web Content Accessibility Guidelines (WCAG) 2.1:
  https://www.w3.org/TR/WCAG21/
