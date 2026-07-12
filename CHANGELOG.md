# Changelog

All notable changes to 99draw will be documented in this file.

The project follows semantic versioning after the first stable `v1.0.0`
release. Dates use `YYYY-MM-DD`.

## 1.0.0 - 2026-07-12

### Added

- Local-first React Flow editor for flowchart/workflow diagrams.
- Core node set: start/end, process, decision, input/output, document,
  database, note, image, group and swimlane.
- Connector editing with labels, line style, marker, dash, animation and
  reconnect support.
- Pages, layers, templates, command palette, Mermaid flowchart import, CSV
  import and ELK auto-layout in a Web Worker.
- Outline navigation for visible shapes and connectors, with click-to-select and
  fit-to-canvas behavior.
- Export to `.99draw.json`, SVG, PNG and PDF; SVG/PNG/PDF output now shares the
  deterministic SVG model exporter.
- Việt/Anh language toggle, dark/high-contrast themes and PWA/offline shell.
- Static and Docker self-hosting support with Nginx CSP, SPA fallback and cache
  header validation.
- Demo gallery with four original diagrams and automated beta smoke coverage.
- Export fixture suite with SVG snapshots, PNG visual snapshots and PDF renderer
  verification through Poppler.
- Browser performance benchmark for render/pan/zoom/select at 100, 1,000 and
  5,000 nodes.
- OSS package gate for required community docs, local documentation links and
  runtime third-party notices.
- CycloneDX SBOM generation and validation.

### Security

- 5 MB import limit for document files.
- Embedded image data URL validation.
- SVG sanitizer regression coverage.
- Sample self-host CSP in `nginx.conf`.
- Default-load network smoke confirming only same-origin static asset requests.

### Known limitations

- Human beta/manual feedback is still needed to judge real-user UX quality; any
  confirmed blocker should ship as a `v1.0.x` patch.
- Small screens use a read-only fallback; desktop and landscape tablet widths
  are the primary editing target.
- 5,000-node diagrams are currently stress-test territory, not a smooth editing
  target.
- Realtime collaboration, cloud storage, plugin marketplace, AI generation and
  `.drawio` compatibility are outside the v1.0 scope.
