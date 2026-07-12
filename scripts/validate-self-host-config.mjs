import { readFileSync } from 'node:fs'

const failures = []
const nginx = readFileSync('nginx.conf', 'utf8')
const dockerfile = readFileSync('Dockerfile', 'utf8')

const csp = nginx.match(/Content-Security-Policy\s+"([^"]+)"/)?.[1]
if (!csp) failures.push('nginx.conf must define a Content-Security-Policy header')

const requiredCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
]

for (const directive of requiredCsp) {
  if (!csp?.includes(directive)) failures.push(`CSP missing directive: ${directive}`)
}

if (csp && /https?:|wss?:|\*/.test(csp)) {
  failures.push('CSP must not allow remote origins or wildcards in the v1 self-host config')
}

const requiredNginx = [
  'add_header X-Content-Type-Options "nosniff" always;',
  'add_header Referrer-Policy "no-referrer" always;',
  'add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;',
  'try_files $uri $uri/ /index.html;',
  'add_header Cache-Control "public, max-age=31536000, immutable" always;',
  'add_header Cache-Control "no-store" always;',
]

for (const snippet of requiredNginx) {
  if (!nginx.includes(snippet)) failures.push(`nginx.conf missing expected snippet: ${snippet}`)
}

const requiredDocker = [
  'FROM node:20-alpine AS build',
  'RUN npm ci',
  'RUN npm run build',
  'FROM nginx:1.27-alpine',
  'COPY nginx.conf /etc/nginx/conf.d/default.conf',
  'COPY --from=build /app/dist /usr/share/nginx/html',
  'EXPOSE 8080',
  'HEALTHCHECK',
]

for (const snippet of requiredDocker) {
  if (!dockerfile.includes(snippet)) failures.push(`Dockerfile missing expected snippet: ${snippet}`)
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Self-host config valid: nginx CSP, SPA fallback, cache headers and Dockerfile wiring checked')
