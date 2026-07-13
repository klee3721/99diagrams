# Self-host 99 Diagrams

99 Diagrams is a static Vite/PWA build. It does not require a backend for the v1
local-first editor.

## Static files

```bash
npm ci
npm run build
npm run preview
```

Publish the generated `dist/` directory with any static host that supports SPA
fallback to `index.html`.

## Docker

```bash
docker build -t 99diagrams:local .
docker run --rm -p 8080:8080 99diagrams:local
```

Open `http://127.0.0.1:8080/`.

The included Nginx config serves the app with a restrictive CSP:

- `connect-src 'self'` keeps the app from making network calls by default.
- `img-src 'self' data: blob:` allows embedded diagram images and local export
  previews without allowing remote image URLs.
- `object-src 'none'` and `frame-ancestors 'none'` reduce common embed/XSS risk.
- `worker-src 'self' blob:` supports the PWA service worker and browser APIs that
  may create local workers/blobs.

## Release check

Before publishing a static build:

```bash
npm test
npm run build
npm run test:static
npm run test:self-host
```

Then verify:

- The editor loads without a backend.
- Reload keeps the local draft.
- Import rejects files larger than 5 MB.
- SVG export passes through the sanitizer.
- Browser devtools show no network request except same-origin static assets.
  This is covered by `tests/e2e/network.spec.ts` in the Playwright suite.
- The Nginx CSP, SPA fallback, cache headers and Dockerfile wiring remain
  aligned. This is covered by `npm run test:self-host`.
