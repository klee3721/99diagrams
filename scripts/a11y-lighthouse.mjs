import { spawn } from 'node:child_process'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'

const port = Number(process.env.A11Y_PORT ?? 4174)
const url = `http://127.0.0.1:${port}`
const threshold = Number(process.env.A11Y_MIN_SCORE ?? 90)

const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
})

const shutdown = async () => {
  if (preview.killed) return

  const closed = new Promise((resolve) => {
    preview.once('close', resolve)
    preview.once('exit', resolve)
  })

  if (process.platform === 'win32') {
    preview.kill('SIGTERM')
  } else if (preview.pid) {
    try {
      process.kill(-preview.pid, 'SIGTERM')
    } catch {
      preview.kill('SIGTERM')
    }
  } else {
    preview.kill('SIGTERM')
  }

  await Promise.race([
    closed,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ])

  if (!preview.killed && process.platform !== 'win32' && preview.pid) {
    try {
      process.kill(-preview.pid, 'SIGKILL')
    } catch {
      // Already exited.
    }
  }

  preview.stdout.destroy()
  preview.stderr.destroy()
  preview.unref()
}

process.on('exit', () => { void shutdown() })
process.on('SIGINT', () => {
  void shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  void shutdown()
  process.exit(143)
})

try {
  await waitForServer(url)
  process.env.CHROME_PATH = chromium.executablePath()
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  })

  try {
    const result = await Promise.race([
      lighthouse(url, {
        logLevel: 'error',
        output: 'json',
        onlyCategories: ['accessibility'],
        port: chrome.port,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Lighthouse timed out after 120000ms')), 120_000)),
    ])

    const score = Math.round((result?.lhr.categories.accessibility.score ?? 0) * 100)
    console.log(`Lighthouse accessibility score: ${score}`)

    const failedAudits = Object.values(result?.lhr.audits ?? {})
      .filter((audit) => audit.score !== null && audit.score < 1)
      .slice(0, 12)
      .map((audit) => {
        const items = Array.isArray(audit.details?.items) ? audit.details.items : []
        const details = items
          .slice(0, 3)
          .map((item) => {
            const node = item.node ?? item.nodeLabel ?? item
            if (typeof node === 'string') return `    ${node}`
            if (node && typeof node === 'object' && 'snippet' in node) return `    ${node.snippet}`
            if (node && typeof node === 'object' && 'selector' in node) return `    ${node.selector}`
            return ''
          })
          .filter(Boolean)
          .join('\n')
        return details ? `- ${audit.title}\n${details}` : `- ${audit.title}`
      })
      .join('\n')

    if (process.env.A11Y_VERBOSE === '1' && failedAudits) {
      console.log(failedAudits)
    }

    if (score < threshold) {
      if (failedAudits) console.error(failedAudits)
      throw new Error(`Accessibility score ${score} is below required ${threshold}`)
    }
  } finally {
    await Promise.race([
      chrome.kill(),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ])
  }
} finally {
  await shutdown()
}

process.exit(0)

async function waitForServer(targetUrl) {
  const started = Date.now()
  let lastError

  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(targetUrl)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Timed out waiting for ${targetUrl}: ${lastError instanceof Error ? lastError.message : 'no response'}`)
}
