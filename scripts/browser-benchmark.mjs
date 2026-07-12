import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { chromium } from '@playwright/test'

const sizes = [100, 1000, 5000]
const port = Number(process.env.BENCHMARK_PORT ?? 4174)
const origin = `http://127.0.0.1:${port}`

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

try {
  await waitForServer(origin)
  const browser = await chromium.launch()
  try {
    console.log('99draw browser benchmark')
    console.log('size,render_ms,pan_ms,zoom_ms,select_ms,dom_nodes,dom_edges')
    for (const size of sizes) {
      const result = await benchmarkSize(browser, size)
      console.log([
        size,
        result.renderMs.toFixed(2),
        result.panMs.toFixed(2),
        result.zoomMs.toFixed(2),
        result.selectMs.toFixed(2),
        result.domNodes,
        result.domEdges,
      ].join(','))
    }
  } finally {
    await browser.close()
  }
} finally {
  server.kill('SIGTERM')
}

async function benchmarkSize(browser, size) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const snapshot = createSnapshot(size)

  await page.addInitScript((value) => {
    localStorage.setItem('99draw:language', 'en')
    localStorage.removeItem('99draw:active-document')
    localStorage.setItem('99draw:document:v1', JSON.stringify({ version: 1, ...value }))
    window.__BENCHMARK_START__ = performance.now()
  }, snapshot)

  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction((expected) => document.querySelectorAll('.react-flow__node').length >= expected, size, { timeout: 120_000 })
  await page.waitForSelector('.react-flow__edge')

  const renderMs = await page.evaluate(() => performance.now() - window.__BENCHMARK_START__)
  const panMs = await measurePan(page)
  const zoomMs = await measureZoom(page)
  const selectMs = await measureSelect(page)
  const counts = await page.evaluate(() => ({
    domNodes: document.querySelectorAll('.react-flow__node').length,
    domEdges: document.querySelectorAll('.react-flow__edge').length,
  }))

  await context.close()
  return { renderMs, panMs, zoomMs, selectMs, ...counts }
}

async function measurePan(page) {
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')

  const start = performance.now()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  for (let index = 0; index < 20; index += 1) {
    await page.mouse.move(box.x + box.width / 2 + index * 12, box.y + box.height / 2 + index * 4)
  }
  await page.mouse.up()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
  return performance.now() - start
}

async function measureZoom(page) {
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('React Flow pane is not visible')

  const start = performance.now()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let index = 0; index < 10; index += 1) {
    await page.mouse.wheel(0, index % 2 === 0 ? -180 : 180)
  }
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
  return performance.now() - start
}

async function measureSelect(page) {
  const target = await page.evaluate(() => {
    const node = [...document.querySelectorAll('.react-flow__node')]
      .find((item) => {
        const rect = item.getBoundingClientRect()
        return rect.width > 0
          && rect.height > 0
          && rect.left >= 0
          && rect.top >= 0
          && rect.right <= window.innerWidth
          && rect.bottom <= window.innerHeight
      })
    if (!node) return null
    const rect = node.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })
  if (!target) throw new Error('No fully visible node is available for selection benchmark')

  const start = performance.now()
  await page.mouse.click(target.x, target.y)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
  return performance.now() - start
}

function createNode(index) {
  return {
    id: `bench-node-${index}`,
    type: 'diagram',
    position: { x: (index % 80) * 190, y: Math.floor(index / 80) * 120 },
    data: {
      kind: index % 7 === 0 ? 'decision' : 'process',
      label: `Node ${index}`,
      fill: index % 7 === 0 ? '#fef3c7' : '#dbeafe',
      stroke: index % 7 === 0 ? '#f59e0b' : '#3b82f6',
      textColor: index % 7 === 0 ? '#78350f' : '#172554',
      layerId: 'default',
    },
  }
}

function createSnapshot(size) {
  const nodes = Array.from({ length: size }, (_, index) => createNode(index))
  const edges = nodes.slice(1).map((node, index) => ({
    id: `bench-edge-${index}`,
    source: nodes[index].id,
    target: node.id,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#64748b' },
    labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
  }))

  return { nodes, edges }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview server did not start at ${url}.\n${serverOutput}`)
}
