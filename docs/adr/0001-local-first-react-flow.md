# ADR 0001: Local-first React Flow editor architecture

Status: Accepted for v1.0 release candidate

Date: 2026-07-11

## Context

99draw v1.0 is a community diagram editor for flowcharts and workflows. The
release goal is a local-first web app that can be cloned, self-hosted and used
without an account, backend or telemetry. The project also needs enough model
discipline to support future collaboration without locking the file format to a
single canvas library.

## Decision

99draw keeps this boundary:

```text
React UI -> document commands -> React Flow adapter -> persistence/import/export
```

- `.99draw.json` is the canonical versioned document format.
- React Flow is the interaction and rendering adapter, not the storage schema.
- Persistence is local-first through browser storage and validated JSON import.
- Export output is produced from the internal document model, with SVG as the
  shared source for SVG, PNG and PDF paths.
- Heavy layout work runs through an ELK web worker so the editor UI stays
  responsive.
- v1.0 explicitly excludes realtime collaboration, accounts, marketplace
  stencils and `.drawio` compatibility.

## Consequences

- A future canvas or collaboration layer must adapt to the document model
  instead of rewriting the saved file format.
- All schema changes need a migration, fixture and round-trip test.
- Import must validate and sanitize data before it reaches the renderer.
- UI features should have keyboard access and test coverage because the app is
  meant to be a product surface, not just a canvas prototype.

## Alternatives considered

- Store raw React Flow nodes as the public format. This would be faster in the
  short term but would make schema compatibility depend on React Flow internals.
- Build a custom canvas from scratch. This would give full control but would
  slow the release and increase accessibility and interaction risk.
- Start with a backend-backed document service. This conflicts with the v1.0
  local-first and self-host goals.

## Release guardrails

- No default network requests, telemetry or cloud account dependency.
- Import size is capped at 5 MB.
- Export and demo fixtures must round-trip through the same document parser used
  by user files.
- Known performance limits are documented instead of being hidden behind broad
  claims.
