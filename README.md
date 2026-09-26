# AI SDLC Tryout

Personal project to learn about AI SDLC.

This repository is a sandbox for exploring how AI can support the software development lifecycle, from planning and requirements to implementation, testing, review, and delivery. The goal is to learn by doing and document practical patterns, workflows, and lessons along the way.

## Overview

The project focuses on understanding and applying AI-assisted practices in software engineering, including:

- Requirements and planning
- Prompt engineering and AI-assisted coding
- Code generation and refactoring
- Testing and quality assurance
- Code review and documentation
- CI/CD automation and release workflows
- Continuous learning and process improvement

## Goals

- Learn how AI fits into real-world software delivery workflows
- Improve productivity without sacrificing quality
- Practice disciplined engineering habits alongside AI tooling
- Build a reusable foundation for future AI-enabled projects

## The app: test-session notes

A small web app for a note-taker to log observations live during prototype
test sessions, then produce a summary grouped by screen for the team.

- **Use it:** https://blueplanet-ai.github.io/AI-SDLC-tryout/ *(live once v1 is published)*
- No sign-in, no server, no analytics. Your notes stay in this laptop's
  browser unless you export or copy them.
- Participants are identified only by anonymous IDs (P1, P2, ...). Please
  don't type names or personal details into notes.

### Keep your data safe
Notes are saved in the browser. Clearing browser data, switching browsers, or
(in Safari) not opening the app for 7 days can erase them. Use **Export study**
after each session and keep the file somewhere safe; "Last exported" turns
amber when the study has changed since. To restore a study or move it to
another laptop, use **Import a study** on the Studies screen. Supported browsers:
current Chrome, Edge, and Firefox. Safari works, but only with regular exports
because of its 7-day rule.

### Keyboard shortcuts (live log)
| Keys | Action |
|------|--------|
| Alt+1 … Alt+9 | Pick screen 1–9 |
| Alt+S | Search any screen |
| Alt+T | Toggle pain point / positive moment |
| Enter | Save finding |
| Shift+Enter | New line in the note |

### Run locally
```bash
python3 -m http.server 8000 --directory app
```
Then open http://localhost:8000. See [CLAUDE.md](CLAUDE.md) for tests, and
[docs/manual-test-checklist.md](docs/manual-test-checklist.md) for the checks
to do by hand.

**Seeing the latest version when testing locally:** the app keeps a copy of
itself for offline use. Locally it always loads the newest files while the
server above is running, so a normal reload is enough. If you ever still see
an older version, press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
to reload without the saved copy. The "New version available" banner only
appears on the published site, not locally.

### Offline and updates
After you have opened the app once, it also opens without internet. While
the laptop is offline, a note says "Offline — your work is saved on this
laptop". When a new version is published, a banner says "New version
available — Reload"; the app switches only when you press Reload, so it
never interrupts a session. Pressing it during a session is safe: the session
and your half-typed note come back.

### Project documents
- [intent/intent.md](intent/intent.md) — the problem and goal
- [intent/spec.md](intent/spec.md) — the approved requirements
- [intent/plan.md](intent/plan.md) — the implementation plan and clarifications

## Repository Structure

This repository is intentionally lightweight and will grow as the project evolves. A typical structure may include:

- `README.md` – project overview and setup guidance
- `docs/` – design notes, architecture decisions, and learning logs
- `src/` – application source code
- `tests/` – test suites and validation checks
- `.github/` – GitHub automation, workflows, and templates

## Getting Started

1. Clone the repository.
2. Create a virtual environment or use your preferred local setup.
3. Install dependencies as needed for the project.
4. Run the project and tests locally.
5. Document learnings and iterate on the workflow.

Example:

```bash
git clone https://github.com/blueplanet-ai/AI-SDLC-tryout.git
cd AI-SDLC-tryout
```

## Learning Focus

This project is meant to be practical and experimental. Some themes to explore include:

- AI-assisted requirements drafting
- Architecture and design prompts
- Automated unit and integration testing
- Review workflows for AI-generated code
- Documentation quality and maintenance
- DevOps and deployment automation

## Contributing

This is a personal learning project, but contributions and suggestions are welcome if they help improve the learning experience and engineering process.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Status

This repository is currently being set up as a learning environment for AI SDLC practices. Expect it to evolve over time as experiments, workflows, and examples are added.
