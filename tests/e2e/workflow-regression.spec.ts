import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function runCommand(page: Page, query: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await search.fill(query)
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette.getByRole('button', { name: new RegExp(query) })).toBeVisible()
  await page.keyboard.press('Enter')
}

async function openBlankDiagram(page: Page) {
  page.once('dialog', (dialog) => dialog.accept())
  await runCommand(page, 'Open template gallery')
  await page.getByRole('button', { name: /Blank diagram/ }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
}

async function renameCurrentDocument(page: Page, name: string) {
  page.once('dialog', (dialog) => dialog.accept(name))
  await page.locator('.document-title').click()
  await expect(page.locator('.document-title')).toContainText(name)
}

async function downloadDocument(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  return JSON.parse(await readFile(await file.path() ?? '', 'utf8')) as {
    activePageId: string
    pages: Array<{
      id: string
      name: string
      layers: Array<{ id: string; name: string; visible: boolean; locked: boolean }>
      nodes: Array<{ id: string; data: { label: string; layerId?: string } }>
      edges: unknown[]
    }>
  }
}

async function downloadDocumentFromCommand(page: Page, query: string) {
  const download = page.waitForEvent('download')
  await runCommand(page, query)
  const file = await download
  const path = await file.path()
  if (!path) throw new Error(`No download path for ${query}`)
  return JSON.parse(await readFile(path, 'utf8')) as Awaited<ReturnType<typeof downloadDocument>>
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('99draw:workflow-regression-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('99draw:workflow-regression-seeded', '1')
    }
    localStorage.setItem('99draw:language', localStorage.getItem('99draw:language') ?? 'en')
    localStorage.setItem('99draw:theme', localStorage.getItem('99draw:theme') ?? 'light')
  })
})

test('uses localized default document, page and layer names', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await expect(page.locator('.document-title')).toContainText('Untitled diagram')
  await expect(page.getByRole('button', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Default' })).toBeVisible()
})

test('opens a previously autosaved diagram from recent documents', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await renameCurrentDocument(page, 'Recent Alpha')
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
  await page.waitForTimeout(1_000)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'New' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(5)
  await renameCurrentDocument(page, 'Recent Beta')
  await page.waitForTimeout(1_000)

  await page.getByRole('button', { name: 'Recent', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Recent diagrams' })).toBeVisible()
  await page.getByRole('button', { name: /Recent Alpha/ }).click()

  await expect(page.locator('.document-title')).toContainText('Recent Alpha')
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
})

test('persists pages, hidden and locked layers, and layer membership across reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  page.once('dialog', (dialog) => dialog.accept('QA Layer'))
  await page.getByRole('button', { name: 'Add layer' }).click()
  await expect(page.getByRole('button', { name: 'QA Layer' })).toBeVisible()

  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const qaLayer = page.locator('.layer-row').filter({ hasText: 'QA Layer' })
  await qaLayer.getByRole('button', { name: 'Hide layer' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await qaLayer.getByRole('button', { name: 'Lock layer' }).click()

  await runCommand(page, 'Add page')
  await expect(page.getByRole('button', { name: 'Page 2' })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const exported = await downloadDocument(page)
  expect(exported.pages).toHaveLength(2)
  const firstPage = exported.pages[0]
  const secondPage = exported.pages[1]
  const persistedLayer = firstPage.layers.find((layer) => layer.name === 'QA Layer')
  expect(persistedLayer).toMatchObject({ visible: false, locked: true })
  expect(firstPage.nodes).toHaveLength(1)
  expect(firstPage.nodes[0].data.layerId).toBe(persistedLayer?.id)
  expect(secondPage.nodes).toHaveLength(1)

  await page.getByRole('button', { name: 'Page 1' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  const persistedQaLayer = page.locator('.layer-row').filter({ hasText: 'QA Layer' })
  await persistedQaLayer.getByRole('button', { name: 'Show layer' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
})

test('navigates shapes and connectors from the outline panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await expect(page.getByText('This page has no shapes yet.')).toBeVisible()

  await runCommand(page, 'Add Process')
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Process step process/ })).toBeVisible()

  await page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Process step process/ }).click()
  await expect(page.getByLabel('Label')).toHaveValue('Process step')

  await runCommand(page, 'Add Decision')
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await runCommand(page, 'Connect selected shapes')

  const connector = page.getByRole('list', { name: 'Connectors' }).getByRole('button', { name: /Connector: Process step to Condition/ })
  await expect(connector).toBeVisible()
  await connector.click()
  await expect(page.getByLabel('Connector label')).toBeVisible()
})

test('imports an editable diagram from CSV', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Import CSV diagram')
  const importDialog = page.getByRole('dialog', { name: 'Import CSV' })
  await expect(importDialog).toBeVisible()
  await importDialog.getByRole('textbox', { name: 'Source' }).fill(`id,label,kind,next,x,y
start,Start,start,review,120,80
review,Review request,decision,ship;revise,340,80
ship,Ship it,process,,580,40
revise,Revise,document,,580,170`)
  await importDialog.getByRole('button', { name: 'Import' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__edge')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Review request decision/ })).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label).sort()).toEqual(['Review request', 'Revise', 'Ship it', 'Start'])
  expect(exported.pages[0].edges).toHaveLength(3)
})

test('imports an editable diagram from Mermaid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Import Mermaid flowchart')
  const importDialog = page.getByRole('dialog', { name: 'Import Mermaid' })
  await expect(importDialog).toBeVisible()
  await importDialog.getByRole('textbox', { name: 'Source' }).fill(`flowchart TD
A(Start) --> B{Ready?}
B -->|Yes| C[Ship]
B -->|No| D[Revise]`)
  await importDialog.getByRole('button', { name: 'Import' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__edge')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Ready\? decision/ })).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label).sort()).toEqual(['Ready?', 'Revise', 'Ship', 'Start'])
  expect(exported.pages[0].edges).toHaveLength(3)
})

test('exports only the selected shapes or the active page from command palette', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Add Process')
  await runCommand(page, 'Add Decision')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  const selectionExport = await downloadDocumentFromCommand(page, 'Export selection')
  expect(selectionExport.pages).toHaveLength(1)
  expect(selectionExport.pages[0].nodes.map((node) => node.data.label)).toEqual(['Condition?'])
  expect(selectionExport.pages[0].edges).toHaveLength(0)

  await runCommand(page, 'Add page')
  await expect(page.getByRole('button', { name: 'Page 2' })).toBeVisible()
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const pageExport = await downloadDocumentFromCommand(page, 'Export current page')
  expect(pageExport.pages).toHaveLength(1)
  expect(pageExport.pages[0].name).toBe('Page 2')
  expect(pageExport.pages[0].nodes.map((node) => node.data.label)).toEqual(['Process step'])
})

test('finds, replaces, reloads, and exports updated labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node').getByText('Process step')).toBeVisible()

  await page.getByRole('button', { name: 'Find' }).click()
  const findDialog = page.getByRole('dialog', { name: 'Find and replace' })
  await expect(findDialog).toBeVisible()
  await findDialog.getByRole('textbox', { name: 'Find' }).fill('Process step')
  await findDialog.getByRole('textbox', { name: 'Replace with' }).fill('Reviewed step')
  await page.getByRole('button', { name: 'Replace all' }).click()
  await expect(page.locator('.react-flow__node').getByText('Reviewed step')).toBeVisible()

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.locator('.react-flow__node').getByText('Reviewed step')).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label)).toContain('Reviewed step')
})
