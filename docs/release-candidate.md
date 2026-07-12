# 99draw v1.0 release candidate notes

These notes record the release-candidate evidence used for `v1.0.0` and remain
the baseline for any `v1.0.x` patch release.

## Current RC scope

99draw v1.0 is a local-first flowchart/workflow editor. It supports editing,
autosave, recent documents, validated `.99draw.json` import, templates, demo
gallery, Mermaid flowchart import, CSV import, ELK auto-layout, pages/layers,
SVG/PNG/PDF export, PWA shell and static/Docker self-hosting.

Out of scope for v1.0: realtime collaboration, cloud accounts, comments, AI
generation, plugin marketplace, `.drawio` import/export compatibility and
third-party stencil libraries.

## Known limitations to publish

- Mobile and very small screens are not the primary editing target for v1.0.
- Large diagrams are documented with measured limits in `docs/performance.md`;
  5,000 nodes is treated as a stress test, not a promised smooth editing target.
- Auto-layout uses ELK when possible and falls back to a deterministic grid for
  very large graphs when ELK exceeds its internal stack limit.
- Edge routing is intentionally simple compared with long-lived diagramming
  suites.
- Dependency audit currently returns 0 vulnerabilities. The release gate still
  blocks any high severity finding.
- Edge branded browser coverage uses `npm run test:e2e:edge` in CI after
  installing Microsoft Edge through Playwright.

## RC verification matrix

Full release-candidate evidence from 2026-07-12: `npm run rc:full` passed on
the current development machine after the in-app Mermaid/CSV import dialog
update. The gate included unit tests, production build, static self-host smoke,
self-host config validation, multi-browser Playwright E2E, Lighthouse
accessibility 100, high-severity audit 0 vulnerabilities, SBOM validity, OSS
package readiness, model benchmark, workflow benchmark, browser benchmark,
Microsoft Edge branded smoke and Docker self-host smoke. `tests/e2e/demo-gallery.spec.ts`
also passed across Chromium, Firefox and WebKit for all four shipped demos, and
`tests/e2e/beta-smoke.spec.ts` passed automated beta workflows for the same demos
in Chromium.

| Gate | Evidence |
| --- | --- |
| Full RC bundle | `npm run rc:full` |
| Local RC bundle | `npm run rc:local` |
| Unit/model tests | `npm test` |
| Typecheck and production build | `npm run build` |
| Static self-host smoke | `npm run test:static` |
| Self-host config readiness | `npm run test:self-host` |
| Browser editor smoke | `npm run test:e2e` |
| Demo gallery edit/export smoke | `tests/e2e/demo-gallery.spec.ts` through `npm run test:e2e` |
| Automated beta demo smoke | `tests/e2e/beta-smoke.spec.ts` through `npm run test:e2e` |
| Outline navigation smoke | `tests/e2e/workflow-regression.spec.ts` through `npm run test:e2e` |
| Mermaid import smoke | `tests/e2e/workflow-regression.spec.ts` through `npm run test:e2e` |
| CSV import smoke | `tests/e2e/workflow-regression.spec.ts` through `npm run test:e2e` |
| Default network isolation | `tests/e2e/network.spec.ts` through `npm run test:e2e` |
| Edge branded smoke | `npm run test:e2e:edge` |
| Accessibility | `npm run test:a11y` |
| Dependency high severity audit | `npm run audit` |
| SBOM validity | `npm run test:sbom` |
| OSS package readiness | `npm run test:oss` |
| Model benchmark | `npm run benchmark` |
| Browser benchmark | `npm run benchmark:browser` |
| Workflow benchmark | `npm run benchmark:workflow` |
| SBOM | `npm run --silent sbom > 99draw-sbom.cdx.json` |
| Manual static preview | `npm run build` then `npm run preview` |
| Docker self-host smoke | `npm run test:docker` |

## Beta tasks

Use `docs/beta-feedback.md` with these four diagrams for beta feedback and
manual regression:

- Product flow
- Release checklist
- Architecture map
- Bug triage swimlane

Each beta task should cover create/edit, connect/reconnect, undo/redo,
save/reload, import/export and theme/language switching.

## Release decision

`v1.0.0` was published after the automated gates passed and no public
blocker/data-loss issue was open in the GitHub tracker. For any `v1.0.x` patch,
ship only when there is no known data-loss bug, no blocker export regression and
no high severity dependency finding. Non-blocking limitations must be listed in
the release notes.
