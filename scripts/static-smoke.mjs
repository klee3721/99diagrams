import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const port = Number(process.env.STATIC_SMOKE_PORT ?? 4176)
const origin = `http://127.0.0.1:${port}`
const uiTimeout = 20_000

if (!existsSync('dist/index.html')) {
  throw new Error('dist/index.html is missing. Run npm run build before npm run test:static.')
}

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
})

let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

try {
  await waitForServer(origin)
  await verifyHttpSurface()
  await verifyBrowserApp()
  console.log(`Static self-host smoke passed on ${origin}`)
} finally {
  await stopServer()
}

async function verifyHttpSurface() {
  const index = await readOk(`${origin}/`, 'root page')
  if (!index.text.includes('<div id="root"></div>')) throw new Error('Root page did not include the app mount node')
  if (!index.text.includes('manifest.webmanifest')) throw new Error('Root page did not reference the web manifest')

  const manifest = await readOk(`${origin}/manifest.webmanifest`, 'web manifest')
  const manifestJson = JSON.parse(manifest.text)
  if (manifestJson.name !== '99 Diagrams' || manifestJson.display !== 'standalone') {
    throw new Error('Manifest did not include expected 99 Diagrams PWA metadata')
  }

  const serviceWorker = await readOk(`${origin}/sw.js`, 'service worker')
  if (!serviceWorker.text.includes('precacheAndRoute')) throw new Error('Service worker did not include precache routing')

  for (const asset of await htmlAssets(index.text)) {
    await readOk(`${origin}${asset}`, `asset ${asset}`)
  }

  const fallback = await readOk(`${origin}/self-host/smoke-route`, 'SPA fallback route')
  if (!fallback.text.includes('<div id="root"></div>')) throw new Error('Fallback route did not serve the app shell')
}

async function verifyBrowserApp() {
  const browser = await chromium.launch()
  const requestOrigins = new Set()
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } })
    const page = await context.newPage()
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('http://') || url.startsWith('https://')) requestOrigins.add(new URL(url).origin)
    })

    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('99diagrams:language', 'en')
      localStorage.setItem('99diagrams:theme', 'light')
    })
    await page.goto(origin, { waitUntil: 'networkidle', timeout: uiTimeout })
    await page.getByRole('button', { name: 'Export file' }).waitFor({ timeout: uiTimeout })

    await runCommand(page, 'Add Process')
    await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length >= 6, undefined, { timeout: uiTimeout })
    await page.waitForFunction(() => {
      const draft = localStorage.getItem('99diagrams:document:v1')
      if (!draft) return false
      try {
        return (JSON.parse(draft).nodes?.length ?? 0) >= 6
      } catch {
        return false
      }
    }, undefined, { timeout: uiTimeout })
    await waitForIndexedDatabase(page)
    await page.reload({ waitUntil: 'networkidle', timeout: uiTimeout })
    await page.getByRole('button', { name: 'Export file' }).waitFor({ timeout: uiTimeout })
    await waitForIndexedDatabase(page)

    const unexpected = [...requestOrigins].filter((item) => item !== origin)
    if (unexpected.length) throw new Error(`Static app requested external origins: ${unexpected.join(', ')}`)

    await context.close()
  } finally {
    await browser.close()
  }
}

async function runCommand(page, query) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await search.waitFor({ timeout: uiTimeout })
  await search.fill(query)
  await page.getByRole('dialog', { name: 'Command palette' }).getByRole('button', { name: new RegExp(query) }).waitFor({ timeout: uiTimeout })
  await page.keyboard.press('Enter')
}

async function waitForIndexedDatabase(page) {
  const deadline = Date.now() + uiTimeout
  while (Date.now() < deadline) {
    const hasDatabase = await page.evaluate(async () => {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 1_000))
      const lookup = new Promise((resolve) => {
        const open = indexedDB.open('99diagrams', 1)
        open.onerror = () => resolve(false)
        open.onblocked = () => resolve(false)
        open.onsuccess = () => {
          const database = open.result
          const ready = database.objectStoreNames.contains('documents')
          database.close()
          resolve(ready)
        }
      })

      return Promise.race([lookup, timeout])
    })

    if (hasDatabase) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`IndexedDB database did not expose the documents store within ${uiTimeout}ms`)
}

async function htmlAssets(html) {
  const assets = new Set()
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const value = match[1]
    if (value.startsWith('/assets/') || value === '/manifest.webmanifest') assets.add(value)
  }
  return assets
}

async function readOk(url, description) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${description} returned ${response.status}`)
  return { response, text: await response.text() }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview server did not start at ${url}.\n${serverOutput}`)
}

async function stopServer() {
  if (server.killed) return

  const closed = new Promise((resolve) => {
    server.once('close', resolve)
    server.once('exit', resolve)
  })

  if (process.platform === 'win32') {
    server.kill('SIGTERM')
  } else if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  } else {
    server.kill('SIGTERM')
  }

  await Promise.race([
    closed,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ])

  if (!server.killed && process.platform !== 'win32' && server.pid) {
    try {
      process.kill(-server.pid, 'SIGKILL')
    } catch {
      // The preview process already exited.
    }
  }

  server.stdout.destroy()
  server.stderr.destroy()
  server.unref()
}
