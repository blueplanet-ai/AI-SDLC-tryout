# Spec: prototype test-session notes (v1)

Source intent: `intent/intent.md` (author Chuhee, 2026-09-23)
Produced by: Claude, 2026-09-23. Reviewed by: Chuhee (product owner), 2026-09-24
Status: approved — ready for Stage 3 (Build)
Skills applied: none — no organizational brand, security, compliance, or UX
skills exist yet (see concern C1). Constraints come from `intent.md` only.

Legend: items marked **[DECISION]** were proposed by Claude and accepted by the
product owner on 2026-09-24. They are kept marked as an audit trail.

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

## 3. Functional requirements

### FR1 — Study setup (S1)
- Create a study with a name and a prototype type: Figma click-through,
  in-vehicle / display, or other.
- Add, rename, reorder, and remove screens in a screen list.
- **[DECISION]** Resolves open question 5: screens are prepared as a list
  before the round, and can also be added on the fly during a session
  (typing a new screen name in the log form adds it to the list).

**Acceptance:** A study with at least one screen exists before a session can start.

### FR2 — Sessions and participants (S2)
- Starting a session suggests the next participant ID (P1, P2, ...).
- The participant field accepts only the pattern `P` + number. No other
  participant fields exist (no name, email, age, or photo).

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
- The screen and type stay selected after saving, so consecutive notes on the
  same screen need only typing and Enter.
- The most recent findings are visible under the input so the note-taker can
  fix a typo immediately.
- **[DECISION]** Resolves open question 4: no severity level in v1.
  Pain vs. positive keeps logging fast; severity is a candidate for loop two.
- **[DECISION]** Speed target: a finding on the current screen can be logged
  with only typing plus Enter; changing screen or type adds one keystroke each.

**Acceptance:** Logging 10 findings in a row without using the mouse is possible.

### FR4 — Review and edit (S4)
- Edit or delete any finding, during or after a session.
- Filter findings by participant, screen, and type.

### FR5 — Summary (S4)
- Header: study name, prototype type, date range, number of participants.
- One section per screen, containing:
  - counts of pain points and positive moments,
  - how many different participants reported a pain point there,
  - the notes, each with its participant ID.
- **[DECISION]** Screens are ordered by the number of different participants
  who reported a pain point (breadth of the problem), then by pain count.
- Positive moments are shown in each screen section, not in a separate list,
  so readers see what works next to what does not.
- The summary ends with a **feedback request** (the "feedback field"):
  a short prompt asking readers to reply to the note-taker with what was
  useful and what they will act on.

### FR6 — Sharing the summary (S4)
- **[DECISION]** Resolves open question 3: two outputs, no hosted link.
  1. "Copy summary" — copies the summary as formatted text (Markdown) for
     pasting into email, Slack, Teams, or a doc.
  2. "Download summary" — saves the same content as a file.
- A hosted page link is not offered, because it would require storing study
  data on a server, which conflicts with the no-accounts, static-site
  constraints in `intent.md`.

### FR7 — Data persistence
- **[DECISION]** Resolves open question 2: data autosaves in the laptop's
  browser storage, plus "Export study" / "Import study" to a file the
  note-taker keeps as a backup or moves to another laptop.
- The app shows when the study was last exported.

### FR8 — Success tracking (S5)
Metric, from `intent.md`: "measured by having a feedback field and actual
feedback is received."
- The summary carries a feedback request (FR5). Because the app has no server,
  readers reply through their usual channel; the note-taker then logs each
  response in the app's **Feedback received** panel for that round.
- Each logged response stores: date received and the feedback text. No reader
  names are stored.
- The app shows **feedback received** = number of logged responses for the
  round, and keeps the count per round so rounds can be compared.
- **Target (set by product owner, 2026-09-24):** at least **2 feedback
  responses per round**. A round with fewer than 2 breaches the target; in
  Stage 6 (Maintain) a breach triggers the next `intent.md`.

**Acceptance:** After logging 1 response the round shows "below target";
after logging a 2nd it shows "target met".

## 4. Design

### 4.1 Screens
1. **Studies** — list of studies; create new; import.
2. **Study setup** — name, prototype type, screen list.
3. **Live log** — the main working screen:
   - top bar: study name, current participant, session timer, "End session";
   - screen picker (numbered chips), pain/positive toggle;
   - large note box with Enter to save;
   - recent findings feed below.
4. **Review** — all findings in a table with filters; edit/delete.
5. **Summary** — generated summary with feedback request; copy, download, and a
   Feedback received panel with the round's count against the target.

The mockup delivered with this spec shows screens 3 (interactive) and 5,
using clearly labelled sample data.

### 4.2 Data model (plain terms)
- **Study**: name, prototype type, screen list, feedback count per round
- **Session**: participant ID, start time, end time
- **Finding**: session, screen, type, note, time
- **Feedback**: round, date received, feedback text (no reader names)

### 4.3 Technical approach
- A single static web app (HTML, CSS, JavaScript), no server, no database,
  no sign-in.
- Works offline after it has been opened once (**[DECISION]**; useful when
  testing in vehicles or labs without reliable Wi-Fi).
- Hosting: GitHub Pages from the public repo (concern C5).

## 5. Non-functional requirements
- **Privacy:** only anonymous participant IDs are stored; no analytics or
  tracking; data never leaves the laptop unless the note-taker exports or
  copies it.
- **Accessibility:** fully usable by keyboard; text contrast meets WCAG 2.1
  level AA.
- **Speed:** saving a finding feels instant (no loading step).
- **Layout:** designed for laptop screens; no phone layout in v1.

## 6. Flagged concerns (all reviewed 2026-09-24)

| # | Concern | Why it matters | Handling | Owner |
|---|---------|----------------|-------------------|-------|
| C1 | No organizational skills applied | The playbook expects brand, security, compliance, and UX policies as skills. This spec was checked only against `intent.md`. | Accepted for the practice run; revisit when skills exist | Product owner — accepted |
| C2 | Free-text notes can capture personal data | A note like "Anna said the menu is confusing" breaks the anonymous-ID constraint, and software cannot reliably prevent it. The same applies to logged feedback text. | Show a reminder next to the note box and feedback box; before copy/download, remind the note-taker to check for names | Product owner — accepted |
| C3 | Browser-only storage can be lost | Clearing the browser or switching laptops loses the study. | Export/import plus "last exported" indicator (FR7) | Product owner — accepted |
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
