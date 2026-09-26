# Acceptance run (v1)

- **Tested:** 2026-09-26, by the product owner
- **Result:** Accepted — no blockers
- **Sections not done:** none
- **Decisions to confirm (D26–D30):** all accepted

This is the owner's filled-in copy of `docs/manual-test-checklist.md`. All test
data was made up and labelled **SAMPLE**.

---

## Before you start (2 min)

- [x] **Do:** Open https://blueplanet-ai.github.io/AI-SDLC-tryout/ in Chrome.
      **Expect:** the Studies screen opens.
- [x] **Do:** On GitHub, open the repo's Actions tab.
      **Expect:** the latest "Test and publish" run on `main` has a green tick
      (this means every automated check passed).
- [x] **Do:** Press Tab a few times.
      **Expect:** a thick red outline shows where you are; "Skip to content"
      appears first.

---

## S1 — Create a study (4 min)

- [x] **Do:** Press **Create study** with the name box empty.
      **Expect:** a red message asks for a name; nothing is created.
- [x] **Do:** Create "SAMPLE acceptance study", type "Figma click-through".
      **Expect:** Study setup opens; "Round 1" and "Not backed up yet" at the top.
- [x] **Do:** Look at the **Session** part before adding screens.
      **Expect:** **Start session** is greyed out, with "Add at least one screen
      before starting a session."
- [x] **Do:** Add the screens "Home", "Menu", "Settings" and "Help" (type a name,
      press Enter).
      **Expect:** they are listed 1 to 4; **Start session** is now available.
- [x] **Do:** Rename "Help" to "Help page", move it up once, then remove it.
      **Expect:** each change shows straight away; after the removal three
      screens are left.
- [x] **Do:** Reload the page (Cmd+R or Ctrl+R).
      **Expect:** the study and its three screens are still there.
- [x] **Do:** Tab through the whole Setup screen without the mouse.
      **Expect:** you can reach every box and button, and the red outline is
      always visible.

---

## S2 and S3 — The dry run: two short sessions (10 min)

This is the definition-of-done dry run. Your friend moderates: they play a
participant and "use" the prototype out loud (they can simply describe screens
of any app on their phone). You only take notes, **with the keyboard only** —
put the mouse or trackpad out of reach once the session has started.
Session 1 is P1, session 2 is P2, about 4 minutes each.

Before your friend starts:

- [x] **Do:** Press **Start session** in Setup.
      **Expect:** the Live log opens with **P1** already in the Participant ID box.
- [x] **Do:** Type your own first name as the participant ID and press Enter.
      **Expect:** "Use P followed by a number, like P1 or P12. No names or other
      details." No session starts.
- [x] **Do:** Type `p1` and press Enter.
      **Expect:** the session starts as **P1**; the timer counts up; the
      cursor is in the note box.

Session 1 (P1), keyboard only:

- [x] **Do:** Log at least 10 findings in a row: type a note, press Enter.
      Use **Alt+1…3** (Option+1…3 on a Mac) to change screen and **Alt+T** to
      switch between pain point and positive moment.
      **Expect:** each finding appears under "Recent findings" at once, with no
      waiting; the cursor stays in the note box; the screen and type stay
      selected after each save.
- [x] **Do:** Include a note with digits, like "SAMPLE tapped 3 times".
      **Expect:** the digits stay in the note; the screen does not change.
- [x] **Do:** Press **Shift+Enter** in the middle of a note, then finish it.
      **Expect:** the note gets a second line; Enter then saves it as one finding.
- [x] **Do:** Press **Alt+S**, type a new screen name "Search", press Enter,
      and log a note.
      **Expect:** "Search" becomes a new screen chip and the note is saved on it.
- [x] **Do:** Make a typo in a note on purpose, then fix it from "Recent
      findings" (Tab to its **Edit** button, Enter, fix, Enter).
      **Expect:** the corrected note is shown.
- [x] **Do:** Tab to **End session**, press Enter, choose **End and export backup**.
      **Expect:** a file `SAMPLE-acceptance-study-round-1.study.json` is saved
      in Downloads; the participant box now suggests **P2**.

Session 2 (P2), keyboard only:

- [x] **Do:** Press Enter to start P2 and log a few findings.
      **Expect:** the findings show participant P2.
- [x] **Do:** Half-way, turn off Wi-Fi.
      **Expect:** "Offline — your work is saved on this laptop" appears at the
      top right; logging keeps working.
- [x] **Do:** Still offline, type half a note (don't press Enter) and reload the page.
      **Expect:** the app opens, session P2 is still running, and the
      half-typed note is still in the box.
- [x] **Do:** Turn Wi-Fi back on, finish the note, then end the session with **End**.
      **Expect:** the offline note disappears; the participant box suggests **P3**.
- [x] **Do:** Go to Study setup and try to remove "Home".
      **Expect:** "This screen has N findings and cannot be removed. Rename it instead."

---

## S4 — Review, clean up and share the summary (7 min)

- [x] **Do:** Open **Review**.
      **Expect:** all findings of both sessions, newest first, with time,
      participant, screen, type and note.
- [x] **Do:** Filter by participant P1, then also by type "Pain point", then
      press **Clear filters**.
      **Expect:** only matching findings show each time; "Showing N of M
      findings."; then all of them again.
- [x] **Do:** Edit a finding: change its screen and its note, save.
      **Expect:** the row shows the new screen and note.
- [x] **Do:** Delete a finding; first press **Cancel**, then delete it for real.
      **Expect:** Cancel keeps it; confirming removes it for good.
- [x] **Do:** Open **Summary**.
      **Expect:** **Copy summary** and **Download summary** are greyed out until
      you tick "I checked for names and personal details".
- [x] **Do:** Read the summary as if you were on the team.
      **Expect:** the header shows the study, type, dates and 2 participants;
      the screen with most participants reporting pain comes first;
      screens without findings (if any) are listed at the end under "No findings";
      it ends with the feedback request. Write down anything a reader would
      find hard to follow.
- [x] **Do:** Tick the check, press **Copy summary**, and paste into an email
      draft (don't send it) and into a Slack or Teams message to yourself.
      **Expect:** it reads cleanly as text in both.
- [x] **Do:** Press **Download summary** and open the file (it ends in `.md`;
      open it with TextEdit or Notepad).
      **Expect:** the same text as the paste.
- [x] **Do:** Leave Summary and come back.
      **Expect:** the tick is gone again, so the check is asked each time.

---

## S5 — Log feedback, then prove the backup (6 min)

- [x] **Do:** On Summary, under **Feedback received**, add "SAMPLE reply one".
      **Expect:** "1 of 2 — below target" (amber).
- [x] **Do:** Try a date received in the future.
      **Expect:** "The date received cannot be in the future."
- [x] **Do:** Add "SAMPLE reply two" with today's date.
      **Expect:** "2 of 2 — target met" (green).
- [x] **Do:** Open **Studies**.
      **Expect:** the study row shows "2 of 2 — target met" under Feedback, and
      the Backup column is amber with "— changed since" (you added findings
      and feedback after the backup in S3).
- [x] **Do:** Press **Export study** on the row, then open the new
      `.study.json` file in TextEdit or Notepad and read it through.
      **Expect:** the Backup column says "Last exported: just now"; the file
      holds only participant IDs, screens, notes, times and feedback text — no
      name, email, phone, age or photo field.
- [x] **Do:** Clear this site's data in Chrome: click the icon left of the
      web address → **Site settings** → **Delete data**, then reload.
      This also clears your other pages on `blueplanet-ai.github.io`.
      **Expect:** the app opens with "No studies yet."
- [x] **Do:** Under **Import a study**, choose the file you just exported.
      **Expect:** the study is back with all sessions, findings, feedback and
      "2 of 2 — target met"; Review and Summary show the same as before.
- [x] **Do:** Import the same file again.
      **Expect:** the app asks **Replace existing** or **Keep both (import as
      copy)**. Choose Keep both: a second row ends in "(copy)". Delete the copy.

---

## Firefox — the parts that differ between browsers (6 min)

Open the same address in Firefox. Only these lines need repeating there.

- [x] **Do:** Create "SAMPLE firefox study" with two screens and start a session.
      **Expect:** as in Chrome. Firefox may ask whether the site may store
      data: allow it.
- [x] **Do:** Log a few findings with **Alt+1**, **Alt+2**, **Alt+T**, **Alt+S**
      and Enter.
      **Expect:** the same behaviour as in Chrome, and no odd characters (¡, †)
      appear in the note.
- [x] **Do:** Tab through Live log and Summary.
      **Expect:** the red outline is always visible.
- [x] **Do:** End the session, tick the name check, press **Copy summary**
      and paste it somewhere, then **Download summary**.
      **Expect:** both work and give the same text.
- [x] **Do:** Add one feedback reply, picking the date with Firefox's date box.
      **Expect:** "1 of 2 — below target".
- [x] **Do:** Export the study, delete it (Studies → Delete → Delete study),
      then import the file.
      **Expect:** the study comes back complete.
- [x] **Do:** Turn off Wi-Fi and reload.
      **Expect:** the app still opens, with the offline note. Turn Wi-Fi back on.

---

## Decisions to confirm

All items below: **Accept**. No changes requested, so no follow-up pull
requests are needed for them.

### D26 — Summary

- **D26-1** The summary header also shows the round number.
  - [x] Accept
- **D26-2** The title is "Test summary: &lt;study name&gt;"; the feedback request
  sits under a "Feedback" heading, after "No findings".
  - [x] Accept
- **D26-3** Each screen section lists its three counts as bullets, then "Pain
  points" and "Positive moments" sub-headings (left out when empty).
  - [x] Accept
- **D26-4** "Participants" counts different participant IDs (an ID used twice
  counts once).
  - [x] Accept
- **D26-5** Dates are written YYYY-MM-DD in the laptop's time zone; one date if
  all sessions were on the same day; "no sessions yet" if there are none.
  - [x] Accept
- **D26-6** A note with several lines stays in one bullet.
  - [x] Accept
- **D26-7** Notes are copied exactly as typed.
  - [x] Accept
- **D26-8** The screen shows the summary as plain text, exactly as it will be copied.
  - [x] Accept
- **D26-9** The name-check tick is not remembered: each visit to Summary asks again.
  - [x] Accept
- **D26-10** In the download's file name, characters that file systems refuse
  (/ \ : * ? " &lt; &gt; |) become "-", and the date is the day of the download.
  - [x] Accept

### D27 — Feedback received

- **D27-1** The Feedback received panel sits on the Summary screen, below the
  summary text.
  - [x] Accept
- **D27-2** "In the future" means later than today on the laptop's clock and
  time zone; there is no earliest allowed date.
  - [x] Accept
- **D27-3** The error reads "The date received cannot be in the future."
  - [x] Accept
- **D27-4** Logged feedback is listed newest date received first (same date:
  last logged first), each with "Received &lt;YYYY-MM-DD&gt;" and a Delete button.
  - [x] Accept
- **D27-5** In the feedback box, Enter adds a new line (pasted replies often
  have several lines); the "Add feedback" button adds it.
  - [x] Accept
- **D27-6** The status is amber when below target and green when met (the
  words say it too).
  - [x] Accept
- **D27-7** Feedback can be logged at any time, also while a session is running.
  - [x] Accept

### D28 — Export, import and "Last exported"

- **D28-1** "Export now" updates only the indicator, so half-typed text and the
  Summary name-check tick are kept.
  - [x] Accept
- **D28-2** Each study also stores when it last changed, so "changed since the
  export" can be worked out (not personal data). An export alone, or saving
  without a real change, does not count as a change.
  - [x] Accept
- **D28-3** Studies saved before step 9 show amber until their next export, to be safe.
  - [x] Accept
- **D28-4** When amber, the words say so too: "Last exported: 3 days ago —
  changed since".
  - [x] Accept
- **D28-5** "How long ago" reads "just now", "N minutes ago", "N hours ago" or
  "N days ago", and is updated when the screen is drawn (it does not tick by itself).
  - [x] Accept
- **D28-6** On the Studies list it sits in a column headed "Backup".
  - [x] Accept
- **D28-7** "Keep both" imports the copy with "(copy)" after the name.
  - [x] Accept
- **D28-8** After an import you stay on the Studies list.
  - [x] Accept
- **D28-9** A backup that holds a running session is refused while another
  session runs in this browser; otherwise its session carries on.
  - [x] Accept
- **D28-10** Import refuses files that are not backups from this app, from a
  newer app version, larger than 5 MB, or with any field the app does not
  store; each message starts "Could not import this file:".
  - [x] Accept
- **D28-11** The browser is asked to keep the data when a study is created or
  imported and when the app opens with studies in it (not on a first empty
  visit); the Studies screen says whether the browser agreed.
  - [x] Accept

### D29 — Offline and new versions

- **D29-1** Publishing writes the version into the one version line of `app/sw.js`
  and stops if that line is missing; the files in the repo stay unchanged.
  - [x] Accept
- **D29-2** The published app opens from its saved copy (fast, works on bad
  Wi-Fi) and switches to a new version only when you press Reload.
  - [x] Accept
- **D29-3** When testing locally, the app always loads the newest files while
  the local server runs, so the banner never shows locally.
  - [x] Accept
- **D29-4** The "New version available" banner sits above the menu, in amber,
  and never takes focus (the Live log note box keeps it).
  - [x] Accept
- **D29-5** The offline note sits at the right of the menu bar, in amber.
  - [x] Accept
- **D29-6** Both are read out by screen readers.
  - [x] Accept
- **D29-7** A new version is looked for when the app opens, when you come back
  to the tab, and when the internet returns.
  - [x] Accept
- **D29-8** The first visit never shows the banner.
  - [x] Accept
- **D29-9** With two tabs open, Reload in one switches both to the new version,
  but only that tab reloads; Reload in the other then just reloads it.
  - [x] Accept
- **D29-10** Only saved copies named `tsn-app-…` are ever deleted, because other
  pages on `blueplanet-ai.github.io` share the same browser storage.
  - [x] Accept
- **D29-11** The security rule (Content-Security-Policy) did not need to change.
  - [x] Accept
- **D29-12** A running session and its half-typed note come back after Reload.
  - [x] Accept

### D30 — Final checks and manual checklist

- **D30** The step 11 details chosen by Claude, as listed in `intent/plan.md`
  section 8: the axe-core accessibility scan (WCAG 2.1 A and AA only, every
  screen and dialog, with a self-check), the keyboard-only S1–S5 robot run,
  the privacy tests, and a checklist that runs fully in Chrome and repeats only
  the parts that differ in Firefox.
  - [x] Accept

---

## Loop-two backlog

Ideas for the next round of work, in the product owner's words. None of these
is part of v1.

1. Allow more than one participant per session.
2. Group sessions for a larger project with many sessions and varying numbers
   of participants.
3. Recognise the same participant across sessions (P1 stays P1), still no names.

---

## Sign-off

- [x] Every check above is ticked, or what went wrong is written down.
- [x] Every decision above is marked Accept or Change.

Signed off by: Product owner  Date: 2026-09-26
