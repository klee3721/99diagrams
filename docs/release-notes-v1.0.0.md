# 99draw v1.0.0 release notes

These notes are the release-note source for the first stable 99draw release.
The public GitHub release is published at
<https://github.com/klee3721/99draw/releases/tag/v1.0.0>.

## Summary

99draw v1.0.0 is a local-first, open-source flowchart and workflow editor for
the browser. It focuses on a practical diagramming core instead of trying to
clone draw.io: editable nodes and connectors, pages and layers, local autosave,
validated `.99draw.json` import/export, SVG/PNG/PDF export, PWA support and
static/Docker self-hosting.

## Highlights

- Flowchart canvas powered by React Flow with pan, zoom, grid, minimap,
  selection, resize, duplicate, delete, undo/redo and context menus.
- Shape set for start/end, process, decision, input/output, document, database,
  note, image, group and swimlane diagrams.
- Connector editing with labels, color, width, dash, markers, animation and
  reconnect support.
- Pages, layer ordering, visibility and lock state with local autosave and
  recent documents.
- Command palette, templates, Mermaid flowchart import, CSV import,
  find/replace, outline navigation and demo gallery.
- ELK auto-layout through a Web Worker with deterministic grid fallback for
  very large graphs.
- Export full documents, the current page or the current selection to
  `.99draw.json`; export visual diagrams to SVG, PNG and PDF.
- Vietnamese/English UI, light/dark/high-contrast themes, keyboard workflows
  and small-screen read-only fallback.
- PWA shell, static hosting docs, Docker smoke script, SBOM generation and OSS
  contribution docs.

## Verification evidence

Release-candidate evidence from 2026-07-12:

- `npm run rc:full` passed on the current machine after the in-app Mermaid/CSV
  import dialog update.
- After the final package version, UI badge and SBOM update, the same release
  gate components were re-run individually and passed.
- Package metadata and the lockfile are set to `1.0.0`.
- GitHub Actions passed on the published commit `78c4553`:
  - CI run `29182499082`.
  - Release package run `29182500050`.
- `npm run test:static` passed for the production preview/static self-host
  surface.
- `npm run test:self-host` passed for Nginx CSP, SPA fallback, cache headers and
  Dockerfile wiring.
- `npm test` passed with 46 unit tests.
- `npm run benchmark:browser` passed.
- `npm run test:e2e:ci` passed locally with 96 tests passing and 48 configured
  skips after stabilizing the mouse-flow command-palette helper.
- GitHub CI uses `npm run test:e2e:ci` to avoid OS/font-sensitive visual
  golden snapshot drift while keeping the full local visual golden gate intact.
- `tests/e2e/beta-smoke.spec.ts` passed an automated beta workflow over all
  four shipped demos in Chromium.
- `npm run test:e2e:edge` passed with Microsoft Edge installed.
- `npm run test:docker` passed, building and serving the Docker image.
- `tests/e2e/demo-gallery.spec.ts` passed across Chromium, Firefox and WebKit
  for all four shipped demos.
- Lighthouse accessibility score was 100.
- `npm audit --audit-level=high` reported 0 vulnerabilities.
- The release SBOM was regenerated as `99draw@1.0.0` with 536 components.
- SBOM validity and OSS package readiness checks passed.

## Known limitations

- Mobile and very small screens are read-only in v1.0; editing is intended for
  desktop or landscape tablet widths.
- 5,000-node diagrams are treated as stress-test size, not a smooth editing
  target. Current measured limits are documented in `docs/performance.md`.
- Auto-layout uses ELK when possible and falls back to a deterministic grid when
  very large graphs exceed ELK's internal stack limits.
- Edge routing is intentionally simpler than long-lived commercial diagramming
  suites.
- Realtime collaboration, cloud storage, comments, AI generation, plugin
  marketplace, `.drawio` compatibility and third-party stencil libraries are
  outside the v1.0 scope.

## Self-hosting

The release is a static web app. Build with `npm run build` and serve `dist/`
from any static host, or use the Docker instructions in `docs/self-host.md`.
The app does not require an account or backend service, and the default load
path is covered by a no-external-network Playwright smoke test.

## Release artifacts

The GitHub release contains these artifacts:

- Source archive for the tagged commit.
- `dist/` archive.
- CycloneDX SBOM generated with:

```bash
npm run --silent sbom > 99draw-sbom.cdx.json
```

The release package can be reassembled with:

```bash
npm run package:release
```

That command writes the source archive, `dist/` archive, freshly generated SBOM,
release notes, manifest and `SHA256SUMS` into `release/`. Pushing a `v*` tag
runs `.github/workflows/release.yml` to produce the same artifact bundle in
GitHub Actions.

## Rollback

99draw v1.0.0 is static. To roll back, redeploy the previous `dist/` artifact or
Docker image. Avoid changing the `.99draw.json` schema without a migration; if a
schema migration ships, document whether users should export diagrams before
downgrading.

## Release decision checklist

`v1.0.0` was published after the automated checklist items below were true. Keep
using the same checklist before any `v1.0.x` patch:

- `npm run rc:full` passes from a clean checkout.
- `npm run benchmark:browser` passes and `docs/performance.md` reflects any
  material baseline change.
- `npm run test:static` passes.
- `npm run test:self-host` passes.
- `npm run test:e2e:edge` passes in an environment with Microsoft Edge
  installed, or as part of `npm run rc:full`.
- `npm run test:docker` passes in an environment with Docker available, or as
  part of `npm run rc:full`.
- Public beta/manual reports using `.github/ISSUE_TEMPLATE/beta_feedback.yml`
  have no open blocker or data-loss issue.
- Any non-blocking major beta issue is either fixed or listed in known
  limitations.
- SBOM and release notes are attached to the GitHub release.
- `release/SHA256SUMS` is attached or copied into the GitHub release body.
- `npm run check:release-blockers` reports no open blocker/data-loss GitHub
  issues before recommending the release line.
