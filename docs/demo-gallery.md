# Demo gallery

The in-app demo gallery contains original 99draw diagrams for trying real
editing workflows. These are not copied from draw.io and do not use external
stencils or brand assets.

Open the gallery from the toolbar with **Demo** or from the command palette with
**Open demo gallery**.

## Included demos

| Demo | Purpose | Coverage |
| --- | --- | --- |
| Product flow | Product idea to beta feedback and launch | Decision branches, loopback edge, database node |
| Release checklist | v1 release gate and rollback path | Group container, document/note nodes, dashed blocker edge |
| Architecture map | PWA, document model, worker, storage and export | Multi-layer diagram, import/export feedback loop |
| Bug triage swimlane | Community bug flow across user, maintainer, contributor and CI | Swimlane lanes, parented nodes, external merge endpoint |

## Quality rules

- Every demo is generated from `src/demoGallery.ts`.
- `src/demoGallery.test.ts` verifies localized copy and v2 document round-trip.
- Demo labels are available in Vietnamese and English.
- Demos should stay small enough for new contributors to understand quickly.

## Adding a demo

1. Add an entry to `demoGallery` with localized copy and a deterministic
   snapshot.
2. Use only built-in node kinds and open-source-safe colors/text.
3. Keep the diagram useful as a manual smoke test for at least one real product
   workflow.
4. Extend the test expectation if the gallery size changes.
