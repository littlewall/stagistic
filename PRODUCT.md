# Product Vision & Identity: Stagistic

## Purpose
Stagistic is an open-source, cloud-capable script editor built specifically for theatre and musicals. It structures a script the way theatre structures it — acts, scenes, stage directions, characters, musical numbers. Success looks like a playwright finishing a full-length script and handing a director a correctly-formatted PDF without touching a second tool.

## Users
- **Wave 1**: Playwrights and librettists — writers working alone or in collaboration, deep in drafting or revision. They sit down to write a full-length theatrical script. The tool is the only thing on screen.
- **Future waves**: Connected apps for production teams (stage managers, marketing, directors) using the same script as a shared source of truth.

## Creative North Star: “The Dark Stage”
The theatre before the house lights come up. Attention belongs to the work on the page, not to the tool holding it. Stagistic exists in the wings: disciplined, unobtrusive, and available exactly when the playwright needs it. The interface never interrupts a line of dialogue or a blocking note to announce itself.

- **Quiet, precise, theatrical**: The interface carries the discipline of a prompt book.
- **Two visual registers**:
  - **Product register**: Warm, hue-cohesive neutrals with restrained copper and lavender semantics. The script canvas remains dominant.
  - **Brand register**: The landing page uses paper, umber, and aubergine more expressively, while preserving editorial restraint.

## Design Principles
1. **The script is the center.** Every UI decision is measured against whether it serves or distracts from the act of writing. When in doubt, subtract.
2. **Theatrical without theatrics.** Structure and restraint over decoration. The interface carries the precision of a prompt book, not the noise of a poster.
3. **Structure is a first-class feature.** The theatrical hierarchy is meaningful data, not just formatting. Make it visible without overwhelming the page.
4. **Compose, don't sprawl.** The editor must sit comfortably next to future production management apps without becoming a dashboard itself.
5. **Professional discretion.** No onboarding fanfare, no empty-state cheerfulness. A playwright picks it up and gets to work.

## Anti-references
- **Heavy SaaS dashboards** (Jira, Asana, PM tools): Dense sidebars, data tables as defaults. Stagistic is a writing instrument, not a project tracker.
- **Gamified or cluttered writing apps**: Visual busy-ness that pulls attention from the script. No panels for the sake of panels.
- **Loud marketing / AI landing pages**: Purple gradients, hero metrics, buzzword copy.

## Core Visual Identity
- **Color System**: Warm product neutrals anchored by `--base-neutral`. Two distinct semantic accents: **Copper** (action, progress, music) and **Lavender** (selection, focus, utility).
- **Two-Voice Typography**: **IBM Plex Sans Variable** is the interface's voice. **Courier Prime** is the script's voice. They are never mixed within a single element.
- **Elevation**: Surfaces are flat at rest (tonal layering). Shadows are reserved strictly for floating elements (modals, popovers) and the script canvas.

*(Note: Actionable engineering, CSS, and component composition rules are maintained in `.agents/skills/stagistic-general-codestyle/SKILL.md`.)*
