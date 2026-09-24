# Intent: prototype test-session notes

Author: Chuhee. Status: draft (awaiting originator review).
Date: 2026-09-23

## Problem
During prototype test sessions, a dedicated note-taker logs observations live
while someone else moderates. Notes are not consistently tied to the screen
where each observation happened, and turning them into something the team
will read takes extra effort after the sessions end.

## Proposed outcome
A note-taker can log findings live during a session, each tagged to a
participant (anonymous ID) and a prototype screen, and marked as a pain point
or a positive moment. After a round of sessions, the app produces a shareable
summary grouped by screen that the team actually reads and acts on.

## Affected users and systems
- Note-taker (primary user) — logs live on a laptop during sessions
- Moderator — runs the session; does not use the app during it
- Team / stakeholders — read the shareable summary
- Prototypes under test: Figma click-throughs and in-vehicle / display
  prototypes (screens are entered by the note-taker, not imported)

## Constraints
- Laptop-first; logging must be fast enough to keep up with a live session
- Participants identified only by anonymous IDs (P1, P2, ...); no names,
  emails, photos, or other personal data stored
- No sign-in or accounts; single note-taker, single device per session
- Simple web app, hostable as a static site

## Out of scope (v1)
- Video or audio recording
- Multi-user real-time sync
- Figma integration
- Login / accounts

## Success measure
The team actually reads the summary and acts on it. This is measured by having a
feedback field and actual feedback is received.

## Open questions
1. How do we measure "the team reads and acts on it" without accounts or
   analytics? Candidate proxies to decide in Design: number of summary items
   turned into follow-up actions, or a quick "was this useful?" check with
   readers after each round.
2. Where should data live between sessions — only in this laptop's browser, or
   exported to a file the note-taker keeps?
3. In what form is the summary shared — a page link, a copied text block, or a
   downloaded file?
4. Does a finding need a severity level (e.g., minor / major / blocker), or is
   pain vs. positive enough for v1?
5. How are screen names set up before a session — typed ad hoc, or a list
   prepared in advance per prototype?
