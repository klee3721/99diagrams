import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { chromium } from '@playwright/test'

const workflowSizes = parseSizes(process.env.BENCHMARK_WORKFLOW_SIZES, [200, 1000, 5000])
const exportSize = Number(process.env.BENCHMARK_EXPORT_SIZE ?? 200)
const port = Number(process.env.BENCHMARK_PORT ?? 4175)
const origin = `http://127.0.0.1:${port}`
const kindDefaults = {
  process: { fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
  decision: { fill: '#fef3c7', stroke: '#f59e0b', textColor: '#78350f' },
  document: { fill: '#fef9c3', stroke: '#ca8a04', textColor: '#713f12' },
}

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
    console.log('99 Diagrams workflow benchmark')
    console.log('size,json_kb,import_ms,layout_down_ms,dom_nodes,dom_edges')
    for (const size of workflowSizes) {
      const result = await benchmarkWorkflow(browser, size)
      console.log([
        size,
        result.jsonKb.toFixed(1),
        result.importMs.toFixed(2),
        result.layoutMs.toFixed(2),
        result.domNodes,
        result.domEdges,
      ].join(','))
    }

    const exportResult = await benchmarkExports(browser, exportSize)
    console.log('')
    console.log('export_size,svg_ms,svg_kb,png_ms,png_kb,pdf_ms,pdf_kb')
    console.log([
      exportSize,
      exportResult.svg.ms.toFixed(2),
      exportResult.svg.kb.toFixed(1),
      exportResult.png.ms.toFixed(2),
      exportResult.png.kb.toFixed(1),
      exportResult.pdf.ms.toFixed(2),
      exportResult.pdf.kb.toFixed(1),
    ].join(','))
  } finally {
    await browser.close()
  }
} finally {
  server.kill('SIGTERM')
}

async function benchmarkWorkflow(browser, size) {
  const context = await createContext(browser)
  const page = await context.newPage()
  const document = createDocument(size)
  const serialized = JSON.stringify(document)

  try {
    await page.addInitScript(() => {
      localStorage.setItem('99diagrams:language', 'en')
      localStorage.removeItem('99diagrams:active-document')
      localStorage.removeItem('99diagrams:document:v1')
    })
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.app-shell')

    const importMs = await importDocument(page, serialized, `workflow-${size}.99diagrams.json`, size)
    const layoutMs = await measureLayout(page, size)
    const counts = await readCounts(page)

    return {
      jsonKb: serialized.length / 1024,
      importMs,
      layoutMs,
      ...counts,
    }
  } finally {
    await context.close()
  }
}

async function benchmarkExports(browser, size) {
  const context = await createContext(browser)
  const page = await context.newPage()
  const document = createDocument(size)
  const serialized = JSON.stringify(document)

  try {
    await page.addInitScript(() => {
      localStorage.setItem('99diagrams:language', 'en')
      localStorage.removeItem('99diagrams:active-document')
      localStorage.removeItem('99diagrams:document:v1')
    })
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.app-shell')
    await importDocument(page, serialized, `export-${size}.99diagrams.json`, size)
    await measureLayout(page, size)

    return {
      svg: await measureDownload(page, 'Export SVG'),
      png: await measureDownload(page, 'Export PNG'),
      pdf: await measureDownload(page, 'Export PDF'),
    }
  } finally {
    await context.close()
  }
}

async function createContext(browser) {
  return browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    acceptDownloads: true,
  })
}

async function importDocument(page, serialized, fileName, expectedNodes) {
  await page.evaluate(() => {
    localStorage.setItem('99diagrams:language', 'en')
    localStorage.removeItem('99diagrams:active-document')
    localStorage.removeItem('99diagrams:document:v1')
  })

  const start = performance.now()
  await page.locator('input[accept*=".99diagrams"]').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  })
  await waitForImportedNodes(page, expectedNodes)
  return performance.now() - start
}

async function measureLayout(page, expectedNodes) {
  await waitForImportedNodes(page, expectedNodes)
  const before = await nodeTransformSignature(page)

  const start = performance.now()
  await page.locator('button[aria-label="Auto layout down"], button[aria-label="Sap xep doc tu dong"], button[aria-label="Sắp xếp dọc tự động"]').click()
  await page.waitForFunction((previous) => {
    const status = document.querySelector('.toolbar-status')?.textContent ?? ''
    if (status.includes('Could not auto layout') || status.includes('Không thể tự động sắp xếp')) {
      throw new Error(status.trim())
    }
    const signature = [...document.querySelectorAll('.react-flow__node')]
      .map((node) => node.getAttribute('style') ?? '')
      .join('|')
    return signature !== previous
  }, before, { timeout: 600_000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
  return performance.now() - start
}

async function nodeTransformSignature(page) {
  return page.evaluate(() => [...document.querySelectorAll('.react-flow__node')]
    .map((node) => node.getAttribute('style') ?? '')
    .join('|'))
}

async function measureDownload(page, label) {
  const start = performance.now()
  const downloadPromise = page.waitForEvent('download', { timeout: 180_000 })
  await page.locator(exportSelector(label)).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error(`No local download path for ${label}`)
  const info = await stat(downloadPath)
  return { ms: performance.now() - start, kb: info.size / 1024 }
}

function exportSelector(label) {
  const labels = {
    'Export SVG': ['Export SVG', 'Xuất SVG'],
    'Export PNG': ['Export PNG', 'Xuất PNG'],
    'Export PDF': ['Export PDF', 'Xuất PDF'],
  }[label]
  if (!labels) throw new Error(`Unknown export label: ${label}`)
  return labels.map((item) => `button[aria-label="${item}"]`).join(', ')
}

async function readCounts(page) {
  return page.evaluate(() => ({
    domNodes: document.querySelectorAll('.react-flow__node').length,
    domEdges: document.querySelectorAll('.react-flow__edge').length,
  }))
}

async function waitForImportedNodes(page, expectedNodes) {
  await page.waitForFunction((expected) => (
    document.querySelectorAll('.react-flow__node').length >= expected
      && document.querySelectorAll('.react-flow__edge').length >= expected - 1
  ), expectedNodes, { timeout: 180_000 })
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

function parseSizes(value, fallback) {
  if (!value) return fallback
  const parsed = value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0)
  return parsed.length ? parsed : fallback
}

function createDocument(size) {
  const now = '2026-01-01T00:00:00.000Z'
  const page = createPage(size)

  return {
    version: 2,
    id: `workflow-benchmark-${size}`,
    name: `Workflow benchmark ${size}`,
    createdAt: now,
    updatedAt: now,
    activePageId: page.id,
    pages: [page],
  }
}

function createPage(size) {
  return {
    id: `workflow-page-${size}`,
    name: `Benchmark ${size}`,
    layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
    ...createSnapshot(size),
  }
}

function createSnapshot(size) {
  const nodes = Array.from({ length: size }, (_, index) => createNode(index))
  const edges = nodes.slice(1).map((node, index) => ({
    id: `workflow-edge-${index}`,
    source: nodes[index].id,
    target: node.id,
    type: 'smoothstep',
    animated: false,
    reconnectable: true,
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#64748b' },
    labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
  }))

  return { nodes, edges }
}

function createNode(index) {
  const kind = index % 9 === 0 ? 'decision' : index % 13 === 0 ? 'document' : 'process'
  const defaults = kindDefaults[kind]

  return {
    id: `workflow-node-${index}`,
    type: 'diagram',
    position: { x: (index % 80) * 190, y: Math.floor(index / 80) * 120 },
    data: {
      kind,
      label: `Node ${index}`,
      layerId: 'default',
      ...defaults,
    },
  }
}
