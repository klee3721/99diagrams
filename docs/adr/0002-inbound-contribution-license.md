# ADR 0002: Inbound contribution license policy

Status: Accepted for v1.0 release candidate

Date: 2026-07-12

## Context

99 Diagrams is intended to be a small community-maintained open-source project. The
release package already ships with a GPL-3.0-only license, third-party notices,
contribution docs, issue templates and a code of conduct. Before v1.0, the repo
also needs a clear decision about whether contributors must sign a CLA, use DCO
sign-offs or follow an inbound-equals-outbound policy.

## Decision

99 Diagrams uses an inbound-equals-outbound policy:

- Contributions are accepted under the same GPL-3.0-only license as the project.
- 99 Diagrams does not require a separate Contributor License Agreement.
- 99 Diagrams does not require Developer Certificate of Origin sign-off lines for
  ordinary pull requests.
- Contributors must confirm in the pull request checklist that they have the
  right to contribute their changes and that no unclear third-party assets,
  draw.io stencils, copied templates or trademarked assets are included.
- Maintainers may ask for provenance details, removal or replacement of any
  asset, dependency, file format fixture or copied text whose license is unclear.

## Consequences

- The contribution flow stays lightweight for first-time contributors.
- Legal expectations are still explicit in the PR process.
- The project must keep third-party notices current and avoid accepting
  ambiguous assets.
- Larger future governance changes, such as requiring DCO sign-offs, should be
  recorded in a new ADR and reflected in the PR template.

## Alternatives considered

- Require a CLA. This adds friction and requires more administrative tooling
  than the v1.0 community size justifies.
- Require DCO sign-off lines on every commit. This is common for some projects,
  but it complicates casual contributions and is not necessary for the current
  GPL inbound policy.
- Leave the policy unstated. This would keep contribution docs short, but it
  would make the v1.0 release package incomplete and ambiguous.

## Release guardrails

- `CONTRIBUTING.md` must describe the inbound GPL-3.0-only policy.
- The pull request template must ask contributors to confirm rights and asset
  provenance.
- `THIRD_PARTY_NOTICES.md` must include runtime dependencies used by the app.
