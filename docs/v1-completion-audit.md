# 99draw v1.0 completion audit

Last updated: 2026-07-12.

This audit maps the v1.0 plan requirements to current evidence. It is meant to
avoid calling the project complete merely because the UI looks finished.

## Release state

- Public repository: <https://github.com/klee3721/99draw>
- Public release: <https://github.com/klee3721/99draw/releases/tag/v1.0.0>
- Published commit: `78c4553`
- GitHub CI: run `29182499082`, success on `78c4553`
- GitHub Release package: run `29182500050`, success on `78c4553`
- Release assets: source archive, `dist/` archive, SBOM, release notes,
  manifest and `SHA256SUMS`
- Release blocker gate: `npm run check:release-blockers`

## Requirement evidence

| Requirement group | Current evidence | Status |
| --- | --- | --- |
| Canvas and editor core | `tests/e2e/editor-smoke.spec.ts`, `tests/e2e/keyboard-flow.spec.ts`, `tests/e2e/mouse-flow.spec.ts`, `npm run test:e2e:ci` | Done |
| Nodes and shape fixtures | `src/export-fixtures.ts`, `src/export-fixtures.test.ts`, SVG/PNG/PDF export fixture tests | Done |
| Edges and reconnect/editing | editor smoke, mouse/keyboard 20-node flows, workflow regression, edge inspector coverage in unit/export fixtures | Done |
| File safety | `tests/e2e/import-guard.spec.ts`, document parser tests, 5 MB import guard, autosave/recent document regression | Done |
| Export JSON/SVG/PNG/PDF/copy image | export unit tests, visual fixtures, PDF render verification, UI export smokes | Done |
| Productivity workflows | command palette, templates/demo gallery, Mermaid/CSV import and auto-layout covered by E2E/unit tests | Done |
| Pages/layers/navigation | `tests/e2e/workflow-regression.spec.ts` covers reload, hidden/locked state, layer membership, outline and find/replace | Done |
| Accessibility/i18n/themes/PWA | `npm run test:a11y`, `tests/e2e/preferences.spec.ts`, keyboard flows, static/PWA smoke | Done |
| Performance/security | `npm run benchmark`, `npm run benchmark:browser`, `npm run benchmark:workflow`, `npm run audit`, network smoke, CSP/self-host checks | Done |
| OSS/self-host/release | README, CONTRIBUTING, SECURITY, ADRs, Docker/static docs, SBOM, release checklist, GitHub release assets and green Actions | Done |

## Remaining non-code evidence

Human beta/manual feedback is the only item that code and automation cannot
truthfully prove. The automated beta smoke covers the machine-checkable portion
of `docs/beta-feedback.md`, but real-user beta feedback is still needed to
judge layout clarity, task comprehension and subjective UX blockers.

Current public tracker state checked on 2026-07-12: no open GitHub issues were
returned by `gh issue list --repo klee3721/99draw --state open`, and
`npm run check:release-blockers` can be used before any patch release.

If a human beta report confirms a blocker, data-loss bug or broken export, the
next action is a `v1.0.x` patch release rather than broadening v1.0 scope.
