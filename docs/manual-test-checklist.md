# Manual test checklist (v1)

For: the product owner, as the acceptance run of plan step 12.
Time: about 30 minutes for the checks, plus reading the decisions at the end.
Needs: a laptop with current **Chrome** and **Firefox**, and a friend to act as
moderator for about 10 minutes.

How to use it: work from top to bottom. Each line says **Do** (what to do) and
**Expect** (what should happen). Tick the box when it happened. If something
else happened, don't tick it: write what you saw under the line and carry on.

Use only made-up data. Every study, note and feedback text starts with
**SAMPLE**, and nobody's real name goes in anywhere.

---

## Before you start (2 min)

- [ ] **Do:** Open https://blueplanet-ai.github.io/AI-SDLC-tryout/ in Chrome.
      **Expect:** the Studies screen opens.
- [ ] **Do:** On GitHub, open the repo's Actions tab.
      **Expect:** the latest "Test and publish" run on `main` has a green tick
      (this means every automated check passed).
- [ ] **Do:** Press Tab a few times.
      **Expect:** a thick red outline shows where you are; "Skip to content"
      appears first.

---

## S1 — Create a study (4 min)

- [ ] **Do:** Press **Create study** with the name box empty.
      **Expect:** a red message asks for a name; nothing is created.
- [ ] **Do:** Create "SAMPLE acceptance study", type "Figma click-through".
      **Expect:** Study setup opens; "Round 1" and "Not backed up yet" at the top.
- [ ] **Do:** Look at the **Session** part before adding screens.
      **Expect:** **Start session** is greyed out, with "Add at least one screen
      before starting a session."
- [ ] **Do:** Add the screens "Home", "Menu", "Settings" and "Help" (type a name,
      press Enter).
      **Expect:** they are listed 1 to 4; **Start session** is now available.
- [ ] **Do:** Rename "Help" to "Help page", move it up once, then remove it.
      **Expect:** each change shows straight away; after the removal three
      screens are left.
- [ ] **Do:** Reload the page (Cmd+R or Ctrl+R).
      **Expect:** the study and its three screens are still there.
- [ ] **Do:** Tab through the whole Setup screen without the mouse.
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

- [ ] **Do:** Press **Start session** in Setup.
      **Expect:** the Live log opens with **P1** already in the Participant ID box.
- [ ] **Do:** Type your own first name as the participant ID and press Enter.
      **Expect:** "Use P followed by a number, like P1 or P12. No names or other
      details." No session starts.
- [ ] **Do:** Type `p1` and press Enter.
      **Expect:** the session starts as **P1**; the timer counts up; the
      cursor is in the note box.

Session 1 (P1), keyboard only:

- [ ] **Do:** Log at least 10 findings in a row: type a note, press Enter.
      Use **Alt+1…3** (Option+1…3 on a Mac) to change screen and **Alt+T** to
      switch between pain point and positive moment.
      **Expect:** each finding appears under "Recent findings" at once, with no
      waiting; the cursor stays in the note box; the screen and type stay
      selected after each save.
- [ ] **Do:** Include a note with digits, like "SAMPLE tapped 3 times".
      **Expect:** the digits stay in the note; the screen does not change.
- [ ] **Do:** Press **Shift+Enter** in the middle of a note, then finish it.
      **Expect:** the note gets a second line; Enter then saves it as one finding.
- [ ] **Do:** Press **Alt+S**, type a new screen name "Search", press Enter,
      and log a note.
      **Expect:** "Search" becomes a new screen chip and the note is saved on it.
- [ ] **Do:** Make a typo in a note on purpose, then fix it from "Recent
      findings" (Tab to its **Edit** button, Enter, fix, Enter).
      **Expect:** the corrected note is shown.
- [ ] **Do:** Tab to **End session**, press Enter, choose **End and export backup**.
      **Expect:** a file `SAMPLE-acceptance-study-round-1.study.json` is saved
      in Downloads; the participant box now suggests **P2**.

Session 2 (P2), keyboard only:

- [ ] **Do:** Press Enter to start P2 and log a few findings.
      **Expect:** the findings show participant P2.
- [ ] **Do:** Half-way, turn off Wi-Fi.
      **Expect:** "Offline — your work is saved on this laptop" appears at the
      top right; logging keeps working.
- [ ] **Do:** Still offline, type half a note (don't press Enter) and reload the page.
      **Expect:** the app opens, session P2 is still running, and the
      half-typed note is still in the box.
- [ ] **Do:** Turn Wi-Fi back on, finish the note, then end the session with **End**.
      **Expect:** the offline note disappears; the participant box suggests **P3**.
- [ ] **Do:** Go to Study setup and try to remove "Home".
      **Expect:** "This screen has N findings and cannot be removed. Rename it instead."

---

## S4 — Review, clean up and share the summary (7 min)

- [ ] **Do:** Open **Review**.
      **Expect:** all findings of both sessions, newest first, with time,
      participant, screen, type and note.
- [ ] **Do:** Filter by participant P1, then also by type "Pain point", then
      press **Clear filters**.
      **Expect:** only matching findings show each time; "Showing N of M
      findings."; then all of them again.
- [ ] **Do:** Edit a finding: change its screen and its note, save.
      **Expect:** the row shows the new screen and note.
- [ ] **Do:** Delete a finding; first press **Cancel**, then delete it for real.
      **Expect:** Cancel keeps it; confirming removes it for good.
- [ ] **Do:** Open **Summary**.
      **Expect:** **Copy summary** and **Download summary** are greyed out until
      you tick "I checked for names and personal details".
- [ ] **Do:** Read the summary as if you were on the team.
      **Expect:** the header shows the study, type, dates and 2 participants;
      the screen with most participants reporting pain comes first;
      screens without findings (if any) are listed at the end under "No findings";
      it ends with the feedback request. Write down anything a reader would
      find hard to follow.
- [ ] **Do:** Tick the check, press **Copy summary**, and paste into an email
      draft (don't send it) and into a Slack or Teams message to yourself.
      **Expect:** it reads cleanly as text in both.
- [ ] **Do:** Press **Download summary** and open the file (it ends in `.md`;
      open it with TextEdit or Notepad).
      **Expect:** the same text as the paste.
- [ ] **Do:** Leave Summary and come back.
      **Expect:** the tick is gone again, so the check is asked each time.

---

## S5 — Log feedback, then prove the backup (6 min)

- [ ] **Do:** On Summary, under **Feedback received**, add "SAMPLE reply one".
      **Expect:** "1 of 2 — below target" (amber).
- [ ] **Do:** Try a date received in the future.
      **Expect:** "The date received cannot be in the future."
- [ ] **Do:** Add "SAMPLE reply two" with today's date.
      **Expect:** "2 of 2 — target met" (green).
- [ ] **Do:** Open **Studies**.
      **Expect:** the study row shows "2 of 2 — target met" under Feedback, and
      the Backup column is amber with "— changed since" (you added findings
      and feedback after the backup in S3).
- [ ] **Do:** Press **Export study** on the row, then open the new
      `.study.json` file in TextEdit or Notepad and read it through.
      **Expect:** the Backup column says "Last exported: just now"; the file
      holds only participant IDs, screens, notes, times and feedback text — no
      name, email, phone, age or photo field.
- [ ] **Do:** Clear this site's data in Chrome: click the icon left of the
      web address → **Site settings** → **Delete data**, then reload.
      This also clears your other pages on `blueplanet-ai.github.io`.
      **Expect:** the app opens with "No studies yet."
- [ ] **Do:** Under **Import a study**, choose the file you just exported.
      **Expect:** the study is back with all sessions, findings, feedback and
      "2 of 2 — target met"; Review and Summary show the same as before.
- [ ] **Do:** Import the same file again.
      **Expect:** the app asks **Replace existing** or **Keep both (import as
      copy)**. Choose Keep both: a second row ends in "(copy)". Delete the copy.

---

## Firefox — the parts that differ between browsers (6 min)

Open the same address in Firefox. Only these lines need repeating there.

- [ ] **Do:** Create "SAMPLE firefox study" with two screens and start a session.
      **Expect:** as in Chrome. Firefox may ask whether the site may store
      data: allow it.
- [ ] **Do:** Log a few findings with **Alt+1**, **Alt+2**, **Alt+T**, **Alt+S**
      and Enter.
      **Expect:** the same behaviour as in Chrome, and no odd characters (¡, †)
      appear in the note.
- [ ] **Do:** Tab through Live log and Summary.
      **Expect:** the red outline is always visible.
- [ ] **Do:** End the session, tick the name check, press **Copy summary**
      and paste it somewhere, then **Download summary**.
      **Expect:** both work and give the same text.
- [ ] **Do:** Add one feedback reply, picking the date with Firefox's date box.
      **Expect:** "1 of 2 — below target".
- [ ] **Do:** Export the study, delete it (Studies → Delete → Delete study),
      then import the file.
      **Expect:** the study comes back complete.
- [ ] **Do:** Turn off Wi-Fi and reload.
      **Expect:** the app still opens, with the offline note. Turn Wi-Fi back on.

When you are done: delete the SAMPLE studies you no longer want, and delete
the SAMPLE `.study.json` and `.md` files from Downloads.

---

## Decisions to confirm

These are the details Claude chose while building steps 5 to 10 and marked
"Details chosen by Claude (open for owner review)" in `intent/plan.md`
section 8. D24 and D25 have none: you decided or confirmed all of their details
already. For each item tick **Accept**, or tick **Change** and write what you
want instead. Every change becomes a small follow-up pull request.

### D26 — Summary

- **D26-1** The summary header also shows the round number.
  - [ ] Accept
  - [ ] Change:
- **D26-2** The title is "Test summary: &lt;study name&gt;"; the feedback request
  sits under a "Feedback" heading, after "No findings".
  - [ ] Accept
  - [ ] Change:
- **D26-3** Each screen section lists its three counts as bullets, then "Pain
  points" and "Positive moments" sub-headings (left out when empty).
  - [ ] Accept
  - [ ] Change:
- **D26-4** "Participants" counts different participant IDs (an ID used twice
  counts once).
  - [ ] Accept
  - [ ] Change:
- **D26-5** Dates are written YYYY-MM-DD in the laptop's time zone; one date if
  all sessions were on the same day; "no sessions yet" if there are none.
  - [ ] Accept
  - [ ] Change:
- **D26-6** A note with several lines stays in one bullet.
  - [ ] Accept
  - [ ] Change:
- **D26-7** Notes are copied exactly as typed.
  - [ ] Accept
  - [ ] Change:
- **D26-8** The screen shows the summary as plain text, exactly as it will be copied.
  - [ ] Accept
  - [ ] Change:
- **D26-9** The name-check tick is not remembered: each visit to Summary asks again.
  - [ ] Accept
  - [ ] Change:
- **D26-10** In the download's file name, characters that file systems refuse
  (/ \ : * ? " &lt; &gt; |) become "-", and the date is the day of the download.
  - [ ] Accept
  - [ ] Change:

### D27 — Feedback received

- **D27-1** The Feedback received panel sits on the Summary screen, below the
  summary text.
  - [ ] Accept
  - [ ] Change:
- **D27-2** "In the future" means later than today on the laptop's clock and
  time zone; there is no earliest allowed date.
  - [ ] Accept
  - [ ] Change:
- **D27-3** The error reads "The date received cannot be in the future."
  - [ ] Accept
  - [ ] Change:
- **D27-4** Logged feedback is listed newest date received first (same date:
  last logged first), each with "Received &lt;YYYY-MM-DD&gt;" and a Delete button.
  - [ ] Accept
  - [ ] Change:
- **D27-5** In the feedback box, Enter adds a new line (pasted replies often
  have several lines); the "Add feedback" button adds it.
  - [ ] Accept
  - [ ] Change:
- **D27-6** The status is amber when below target and green when met (the
  words say it too).
  - [ ] Accept
  - [ ] Change:
- **D27-7** Feedback can be logged at any time, also while a session is running.
  - [ ] Accept
  - [ ] Change:

### D28 — Export, import and "Last exported"

- **D28-1** "Export now" updates only the indicator, so half-typed text and the
  Summary name-check tick are kept.
  - [ ] Accept
  - [ ] Change:
- **D28-2** Each study also stores when it last changed, so "changed since the
  export" can be worked out (not personal data). An export alone, or saving
  without a real change, does not count as a change.
  - [ ] Accept
  - [ ] Change:
- **D28-3** Studies saved before step 9 show amber until their next export, to be safe.
  - [ ] Accept
  - [ ] Change:
- **D28-4** When amber, the words say so too: "Last exported: 3 days ago —
  changed since".
  - [ ] Accept
  - [ ] Change:
- **D28-5** "How long ago" reads "just now", "N minutes ago", "N hours ago" or
  "N days ago", and is updated when the screen is drawn (it does not tick by itself).
  - [ ] Accept
  - [ ] Change:
- **D28-6** On the Studies list it sits in a column headed "Backup".
  - [ ] Accept
  - [ ] Change:
- **D28-7** "Keep both" imports the copy with "(copy)" after the name.
  - [ ] Accept
  - [ ] Change:
- **D28-8** After an import you stay on the Studies list.
  - [ ] Accept
  - [ ] Change:
- **D28-9** A backup that holds a running session is refused while another
  session runs in this browser; otherwise its session carries on.
  - [ ] Accept
  - [ ] Change:
- **D28-10** Import refuses files that are not backups from this app, from a
  newer app version, larger than 5 MB, or with any field the app does not
  store; each message starts "Could not import this file:".
  - [ ] Accept
  - [ ] Change:
- **D28-11** The browser is asked to keep the data when a study is created or
  imported and when the app opens with studies in it (not on a first empty
  visit); the Studies screen says whether the browser agreed.
  - [ ] Accept
  - [ ] Change:

### D29 — Offline and new versions

- **D29-1** Publishing writes the version into the one version line of `app/sw.js`
  and stops if that line is missing; the files in the repo stay unchanged.
  - [ ] Accept
  - [ ] Change:
- **D29-2** The published app opens from its saved copy (fast, works on bad
  Wi-Fi) and switches to a new version only when you press Reload.
  - [ ] Accept
  - [ ] Change:
- **D29-3** When testing locally, the app always loads the newest files while
  the local server runs, so the banner never shows locally.
  - [ ] Accept
  - [ ] Change:
- **D29-4** The "New version available" banner sits above the menu, in amber,
  and never takes focus (the Live log note box keeps it).
  - [ ] Accept
  - [ ] Change:
- **D29-5** The offline note sits at the right of the menu bar, in amber.
  - [ ] Accept
  - [ ] Change:
- **D29-6** Both are read out by screen readers.
  - [ ] Accept
  - [ ] Change:
- **D29-7** A new version is looked for when the app opens, when you come back
  to the tab, and when the internet returns.
  - [ ] Accept
  - [ ] Change:
- **D29-8** The first visit never shows the banner.
  - [ ] Accept
  - [ ] Change:
- **D29-9** With two tabs open, Reload in one switches both to the new version,
  but only that tab reloads; Reload in the other then just reloads it.
  - [ ] Accept
  - [ ] Change:
- **D29-10** Only saved copies named `tsn-app-…` are ever deleted, because other
  pages on `blueplanet-ai.github.io` share the same browser storage.
  - [ ] Accept
  - [ ] Change:
- **D29-11** The security rule (Content-Security-Policy) did not need to change.
  - [ ] Accept
  - [ ] Change:
- **D29-12** A running session and its half-typed note come back after Reload.
  - [ ] Accept
  - [ ] Change:

---

## Sign-off

- [ ] Every check above is ticked, or what went wrong is written down.
- [ ] Every decision above is marked Accept or Change.

Signed off by: ____________  Date: ____________
