---
name: plan-step
description: Build one numbered step of intent/plan.md on its own branch and open a pull request for the owner to review. Use when the owner types /plan-step followed by a step number.
argument-hint: [step-number]
disable-model-invocation: true
---

# Do plan step $ARGUMENTS

You are building step $ARGUMENTS of `intent/plan.md` for this repo. The owner
is a product owner, not a programmer: write every message to them in plain
words, and explain any technical choice in one sentence.

## Current state of the repo

!`git status --short --branch`

## 1. Check before starting

- If the step number is missing or not in section 2 of `intent/plan.md`,
  stop and ask which step to do.
- If there are uncommitted changes above, stop and ask the owner what to do
  with them. Never discard them.
- Switch to `main` and pull the latest from GitHub.
- Check that the steps this one "needs" (section 2 of the plan) are already
  merged into `main`. If not, stop and say which step must be merged first.

## 2. Read before writing code

- `CLAUDE.md` (rules, commands, pitfalls).
- `intent/plan.md`: the row for step $ARGUMENTS in section 2, its proofs in
  section 5, and section 8 "Clarifications to spec", which overrides the spec
  where they differ.
- The FRs in `intent/spec.md` that this step covers.

## 3. Build only this step

- Create a branch named `step-$ARGUMENTS-<short-name>` from `main`.
- Build only what step $ARGUMENTS lists. Do not start later steps.
- If the plan or spec is unclear, conflicts, or the step needs something
  outside its scope: stop and ask the owner. Do not decide silently.
- Add or update the tests that section 5 of the plan names for this step.
  Name each test after the requirement it proves, e.g. "FR3: ...".
- If what you build differs from `intent/plan.md`, update `plan.md` in the
  same pull request and say so in the pull request description.
- Any choice the spec and plan don't cover counts as a difference, even if
  you didn't need to ask: list it in the PR and record it as the next
  D-number in plan.md §8.

## 4. Open the pull request

- Commit with the message `Step $ARGUMENTS: <what it adds>`, push the branch,
  and open a pull request into `main`.
- Pull request description, in plain words:
  - What this step adds and which FRs it covers.
  - The names of tests added or changed.
  - Any differences from the plan, and any open questions.
  - A short "Try it by hand" checklist the owner can follow.
- Never merge the pull request and never push to `main`. Merging is the
  owner's approval.

## 5. Use the feedback loop

- If the GitHub CLI (`gh`) is available, wait for the pull request's checks
  with `gh pr checks --watch`.
- If a check fails: read the log, fix the cause, push to the same branch,
  and wait again. After 3 failed attempts, stop and explain the problem in
  plain words.
- If this step changes anything on screen, start the local server
  (`python3 -m http.server 8000 --directory app`) and give the owner the
  address to try it before merging.

## 6. Report to the owner

End with a short report:

- The pull request link and whether its checks passed.
- A table of "Try this → Expected result" for the by-hand review.
- Anything you flagged or could not decide.
- At the very end of the report, exactly one of:
  - `Open questions: none — ready to merge.`
  - `Open questions: <number> — do not merge yet.` followed by a numbered
    list of the questions.

Also add the same "Open questions" line to the end of the pull request
description, so it is visible on GitHub.

When the owner answers:

- Apply every answer as a new commit on the same branch. Record each
  decision in section 8 of `intent/plan.md` and remove any "open for owner
  review" marker.
- Push, wait for the checks again, and repeat the full report.
- Update the "Open questions" line in the pull request description.
- Say "none" only when every question is answered and every answer is
  pushed to the pull request.

Then stop and wait. Do not merge, and do not start the next step.
