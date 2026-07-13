# Performance notes

## Current baseline

Measured on the local development machine with `npm run benchmark`.

The production build splits React, React Flow and icon vendor code into separate
chunks. The app entry chunk is currently about 118 KB minified, avoiding Vite's
500 KB chunk warning while keeping PDF/PNG export dependencies lazy-loaded.

| Nodes | Create model | Serialize JSON | Scope 20 nodes | Build layout graph | JSON size |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 0.15 ms | 0.06 ms | 0.16 ms | 0.09 ms | 36.4 KB |
| 1,000 | 1.13 ms | 0.43 ms | 0.40 ms | 0.46 ms | 371.8 KB |
| 5,000 | 2.15 ms | 2.33 ms | 0.64 ms | 0.12 ms | 1,884.6 KB |

## Browser interaction baseline

Measured on the same machine with `npm run benchmark:browser`, which builds the
production app, serves it with Vite preview, seeds a synthetic document into
localStorage and drives Chromium through Playwright.

| Nodes | Initial render | Pan gesture | Zoom gesture | Select gesture | DOM nodes | DOM edges |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 201.90 ms | 381.45 ms | 363.23 ms | 16.91 ms | 101 | 99 |
| 1,000 | 917.40 ms | 378.16 ms | 382.83 ms | 337.62 ms | 1,001 | 999 |
| 5,000 | 5,919.70 ms | 1,264.31 ms | 1,043.51 ms | 27.70 ms | 5,000 | 4,999 |

These browser numbers are interaction latency measurements, not a full FPS lab.
They are enough to set a conservative v1 expectation: 99 Diagrams is comfortable for
hundreds of nodes, usable around 1,000 nodes on desktop, and 5,000 nodes should
be treated as a stress-test size rather than a smooth editing target until
viewport virtualization/level-of-detail work lands.

## Layout

ELK layout runs through `elk-api` with the packaged `elk-worker.min.js` Web
Worker asset, so the heavy layout computation does not execute on the main
React/UI thread. Very large graphs can still exceed ELK's internal stack limits;
for graphs with at least 2,000 nodes, 99 Diagrams falls back to a deterministic grid
layout instead of failing the user action.

## Workflow baseline

Measured on the same machine with `npm run benchmark:workflow`, which builds the
production app, imports `.99diagrams.json` files through the UI, runs auto-layout and
downloads representative exports.

| Nodes | JSON size | Import/open | Auto-layout | DOM nodes | DOM edges |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 107.4 KB | 128.52 ms | 278.92 ms | 200 | 199 |
| 1,000 | 540.0 KB | 524.72 ms | 731.40 ms | 1,000 | 999 |
| 5,000 | 2,725.2 KB | 4,657.78 ms | 2,239.98 ms | 5,000 | 4,999 |

The 5,000-node workflow uses the large-graph grid fallback after ELK reports a
stack overflow on a single long chain. This is acceptable for v1 stress
handling, but it is not a claim that ELK produces an optimized 5,000-node layered
layout.

| Export diagram | SVG | PNG | PDF |
| ---: | ---: | ---: | ---: |
| 200 nodes | 78.05 ms / 115.9 KB | 255.22 ms / 2,041.5 KB | 2,252.36 ms / 102,033.2 KB |

PDF export is intentionally simple in v1: the app rasterizes the SVG into a
single-page PDF. This keeps export reliable and viewer-compatible, but large
diagrams produce large PDF files.
