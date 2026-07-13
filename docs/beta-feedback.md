# Beta feedback runbook

Use this runbook for public beta/manual feedback on the v1.0 line. The goal is
to find data loss, import/export and editing issues that should block or trigger
a `v1.0.x` patch release.

## Participants

Target at least 10 people across these profiles:

- Maintainer or developer making a release/checklist diagram.
- Product or operations user making a flowchart.
- Engineer making a simple architecture diagram.
- Contributor triaging a bug or support process.

## Test diagrams

Each participant should start from one in-app demo and then make it their own:

| Demo | Primary workflow |
| --- | --- |
| Product flow | Add one decision, reconnect one loopback and export SVG. |
| Release checklist | Edit the group contents, add a rollback note and export PDF. |
| Architecture map | Add one service, use auto-layout and export PNG. |
| Bug triage swimlane | Move one task between lanes, edit lane names and reload. |

## Required tasks

Ask every participant to complete these tasks without help after the app loads:

1. Open the assigned demo from the demo gallery.
2. Add at least two nodes and connect them.
3. Edit one node label and one edge label.
4. Move a node into or out of a group or swimlane when the demo has one.
5. Use undo and redo.
6. Reload the browser and confirm the diagram is preserved.
7. Switch theme or language once.
8. Export `.99diagrams.json` and one visual format: SVG, PNG or PDF.
9. Reopen the exported `.99diagrams.json`.

## Automated pre-beta smoke

`tests/e2e/beta-smoke.spec.ts` automates the machine-checkable portion of this
runbook for the four shipped demos in Chromium:

- open the demo;
- add two nodes and connect the graph;
- edit one node label and one connector label;
- use undo and redo;
- reload and confirm the edited document is preserved;
- export `.99diagrams.json` and a representative visual format;
- reopen the exported `.99diagrams.json`;
- switch theme and language.

This automated smoke does not replace human beta feedback. It cannot judge
layout quality, task clarity or whether a real user feels blocked.

## Report template

Record one entry per participant:

```text
Participant:
Profile:
Browser/OS:
Demo:
Completed tasks:
Export formats tested:
Issues:
Severity:
Notes:
```

On GitHub, use the **Beta feedback** issue template. It captures severity,
diagram, task, browser and supporting files in the format maintainers need for
the release decision.

Maintainers can run `npm run check:release-blockers` before any public release
or patch. It fails when an open GitHub issue is labeled `blocker`, `data-loss`
or when a beta feedback issue selects blocker severity.

Severity definitions:

- `blocker`: data loss, app crash, exported file unusable or task cannot be
  completed.
- `major`: wrong behavior with a workaround.
- `minor`: confusing text, visual polish or non-blocking usability issue.
- `idea`: future feature request outside v1.0 scope.

## Release rule

Do not publish a `v1.0.x` patch release while any `blocker` issue remains open.
`major` issues must either be fixed or listed as known limitations in
`docs/release-candidate.md`. For the already-published `v1.0.0`, any confirmed
blocker or data-loss report should be triaged immediately and fixed in a patch.
