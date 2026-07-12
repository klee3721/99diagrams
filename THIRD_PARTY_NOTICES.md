# Third-party notices

99draw is released under MIT. Its dependencies retain their own licenses:

| Dependency | Version at integration | License | Purpose |
| --- | --- | --- | --- |
| `react` | 19.2.7 | MIT | User interface runtime |
| `react-dom` | 19.2.7 | MIT | Browser DOM renderer |
| `@xyflow/react` | 12.11.2 | MIT | Interactive node/edge canvas |
| `lucide-react` | 0.468.0 | ISC | Interface icons |
| `html-to-image` | 1.11.13 | MIT | SVG and PNG export |
| `jspdf` | 4.2.1 | MIT | PDF export |
| `elkjs` | 0.11.1 | EPL-2.0 | Automatic graph layout |

Before distributing a bundled build, retain the license notices required by each
dependency. `elkjs` is loaded only when the user runs auto-layout, but still
requires its EPL-2.0 notice in a distribution that includes it.
