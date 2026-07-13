# 99 Diagrams release checklist

Use this checklist before cutting a public release or `v1.0.x` patch.

## Scope freeze

- Confirm the release scope in `docs/v1-completion-plan.md`.
- Move feature requests outside the release scope to a future milestone.
- Update `CHANGELOG.md` with user-facing changes and known limitations.
- Review `docs/release-candidate.md` and keep known limitations current.
- Confirm beta feedback issues use `.github/ISSUE_TEMPLATE/beta_feedback.yml`
  and that there are no open `blocker` or data-loss reports.
- Review `docs/release-notes-v1.0.0.md` and keep the release decision checklist
  aligned with the current gates.
- Check that no draw.io brand assets, stencils or templates were copied.

## Local verification

Run:

```bash
npm ci
npm run check:release-blockers
npm run rc:full
npm run --silent sbom > 99-diagrams-sbom.cdx.json
npm run package:release
```

`npm run rc:full` runs the local release-candidate gate, browser benchmark,
Microsoft Edge smoke and Docker smoke.

`npm run package:release` requires a clean tree with `HEAD` tagged as the
current package version. It writes source, `dist/`, freshly generated SBOM,
release notes, manifest and SHA256 checksums into `release/`.

Pushing a `v*` tag also runs `.github/workflows/release.yml`, which packages the
same release artifacts and uploads them as a workflow artifact.

Expected result:

- Unit tests pass.
- Production build succeeds.
- Static self-host smoke confirms the production preview serves the app shell,
  PWA manifest, service worker, asset links, SPA fallback route, same-origin
  asset requests and local storage backend.
- Self-host config check confirms the Nginx CSP, SPA fallback, cache headers
  and Dockerfile wiring remain release-ready.
- Playwright smoke/export checks pass.
- GitHub CI runs `npm run test:e2e:ci`, which keeps deterministic workflow,
  import/export and PDF render checks in CI while leaving OS-sensitive visual
  golden screenshots in the full local `npm run test:e2e` gate.
- 20-node keyboard and palette drag/drop flowchart smokes pass and preserve the
  document across reload/export.
- Network smoke confirms the app only requests same-origin static assets on
  default load.
- Import guard smoke confirms valid `.99diagrams.json` files open, malformed JSON is
  rejected and files larger than 5 MB do not replace the current document.
- Preference smoke confirms Việt/Anh and light/dark/high-contrast themes switch
  and persist across reload.
- Workflow regression smoke confirms recent documents, pages/layers reload,
  hidden/locked layer state, layer membership, localized default
  document/page/layer names, export current page/selection scope and
  find/replace reload/export, Mermaid/CSV import plus outline navigation for
  shapes/connectors on Chromium, Firefox and WebKit.
- Demo gallery smoke confirms every shipped demo opens, remains editable and
  exports valid `.99diagrams.json` on Chromium, Firefox and WebKit.
- Automated beta smoke confirms all four shipped demos can be edited, connected,
  reloaded, visually exported, JSON-exported and reopened on Chromium.
- Edge branded smoke passes in an environment with Microsoft Edge installed.
- Lighthouse Accessibility remains at least 90.
- `npm run audit` has no high severity findings.
- With Docker available, Docker image builds, serves the static app and exposes
  PWA metadata.
- Performance results are reflected in `docs/performance.md` when materially
  different from the current baseline.
- Workflow benchmark covers UI import/open, auto-layout and SVG/PNG/PDF export.
- SBOM validity check passes and the release SBOM command writes a valid
  CycloneDX JSON document.
- OSS package check confirms license, community docs, local documentation links
  and runtime third-party notices are complete.
- Release blocker check confirms there is no open GitHub issue labeled
  `blocker`, `data-loss` or submitted through beta feedback with blocker
  severity.

## Manual product smoke

- Create a 20-node flowchart with mouse and keyboard paths.
- Open every demo from the in-app demo gallery and inspect the rendered layout
  by eye after the automated demo gallery smoke passes.
- Connect, reconnect, duplicate, delete, undo and redo.
- Create a group and a swimlane; move a normal node into/out of the container.
- Reload the app and confirm the local draft is preserved.
- Import a valid `.99diagrams.json` file.
- Confirm a file larger than 5 MB is rejected.
- Export JSON, SVG, PNG and PDF.
- Open exported SVG/PNG/PDF in external viewers.
- Switch Việt/Anh, light/dark/high-contrast themes and inspect focus rings.

## Self-host smoke

Static:

```bash
npm run build
npm run preview
npm run test:static
npm run test:self-host
```

Docker:

```bash
docker build -t 99diagrams:release-candidate .
docker run --rm -p 8080:8080 99diagrams:release-candidate
```

Verify:

- App loads without any backend.
- Browser devtools show only same-origin static asset requests by default.
- Reload preserves local data.
- Nginx CSP does not block the PWA shell, image export or layout worker.

## Tag and publish

- Set the version in `package.json`.
- Ensure `CHANGELOG.md` has a dated section for the version.
- Build release artifacts from a clean checkout.
- Push the release tag and confirm the Release package workflow uploads
  `99-diagrams-release-package`.
- Attach SBOM output to the GitHub release.
- Attach the `release/` artifacts and `SHA256SUMS` generated by
  `npm run package:release`.
- Include known limitations and rollback instructions from
  `docs/release-notes-v1.0.0.md` in the release notes.
- Link `docs/adr/0001-local-first-react-flow.md`, `docs/demo-gallery.md` and
  `docs/beta-feedback.md`, `docs/release-candidate.md` from the release notes
  when helpful.

## Rollback

99 Diagrams v1 is a static app. To roll back, redeploy the previous `dist/` artifact
or Docker image. Avoid changing the `.99diagrams.json` schema without a migration;
if a schema migration shipped, document whether rollback requires exporting
documents before downgrading.
