import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

type ExportedDocument = {
  name: string
  pages: Array<{
    nodes: Array<{ data: { label: string } }>
    edges: Array<{ label?: string }>
  }>
}

const demos = [
  { name: 'Product flow', nodes: 9, edges: 10, visualExport: 'Export SVG', extension: /\.svg$/ },
  { name: 'Release checklist', nodes: 7, edges: 6, visualExport: 'Export PDF', extension: /\.pdf$/ },
  { name: 'Architecture map', nodes: 7, edges: 7, visualExport: 'Export PNG', extension: /\.png$/ },
  { name: 'Bug triage swimlane', nodes: 7, edges: 6, visualExport: 'Export SVG', extension: /\.svg$/ },
]

test.skip(({ browserName }) => browserName !== 'chromium', 'Automated beta smoke downloads visual artifacts in Chromium only.')

async function runCommand(page: Page, query: string) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await expect(search).toBeVisible()
  await search.fill(query)
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette.getByRole('button', { name: new RegExp(query) })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(search).toBeHidden()
}

async function clickToolbarMenuItem(page: Page, menu: string, item: string) {
  const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: `${menu} ▾` }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(`${escapedItem}$`) }).click()
}

async function openDemo(page: Page, name: string) {
  await clickToolbarMenuItem(page, 'Insert', 'Demos')
  await expect(page.getByRole('dialog', { name: 'Demo gallery' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await page.getByRole('dialog', { name: 'Confirm action' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('.document-title')).toContainText(name)
}

async function downloadFromButton(page: Page, name: string) {
  const download = page.waitForEvent('download')
  if (name === 'Export SVG' || name === 'Export PNG' || name === 'Export PDF') {
    await clickToolbarMenuItem(page, 'Export', name)
  } else {
    await page.getByRole('button', { name }).click()
  }
  const file = await download
  const path = await file.path()
  if (!path) throw new Error(`No download path for ${name}`)
  return { name: file.suggestedFilename(), path, bytes: await readFile(path) }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('99diagrams:beta-smoke-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('99diagrams:beta-smoke-seeded', '1')
    }
    localStorage.setItem('99diagrams:language', 'en')
    localStorage.setItem('99diagrams:theme', 'light')
  })
})

for (const demo of demos) {
  test(`beta smoke workflow: ${demo.name}`, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
    await openDemo(page, demo.name)

    await expect(page.locator('.react-flow__node')).toHaveCount(demo.nodes)
    await expect(page.locator('.react-flow__edge')).toHaveCount(demo.edges)

    const betaLabel = `Beta node ${demo.name}`
    await runCommand(page, 'Add Process')
    await page.getByLabel('Label').fill(betaLabel)
    await expect(page.locator('.react-flow__node').getByText(betaLabel, { exact: true })).toBeVisible()

    await runCommand(page, 'Add Decision')
    await expect(page.locator('.react-flow__node')).toHaveCount(demo.nodes + 2)

    await runCommand(page, 'Select all')
    await runCommand(page, 'Connect selected shapes')
    await expect.poll(() => page.locator('.react-flow__edge').count()).toBeGreaterThan(demo.edges)

    await expect(page.getByLabel('Connector label')).toBeVisible()
    await page.getByLabel('Connector label').fill('Beta path')
    await expect(page.getByLabel('Connector label')).toHaveValue('Beta path')

    await clickToolbarMenuItem(page, 'Edit', 'Undo (Cmd/Ctrl+Z)')
    await clickToolbarMenuItem(page, 'Edit', 'Redo (Cmd/Ctrl+Shift+Z)')
    await expect(page.locator('.react-flow__node').getByText(betaLabel, { exact: true })).toBeVisible()

    await page.waitForTimeout(1_000)
    await page.reload()
    await expect(page.locator('.document-title')).toContainText(demo.name)
    await expect(page.locator('.react-flow__node').getByText(betaLabel, { exact: true })).toBeVisible()
    await expect(page.locator('.react-flow__edge-text').getByText('Beta path', { exact: true })).toBeVisible()

    const visual = await downloadFromButton(page, demo.visualExport)
    expect(visual.name).toMatch(demo.extension)
    expect(visual.bytes.byteLength).toBeGreaterThan(100)

    const json = await downloadFromButton(page, 'Export file')
    expect(json.name).toMatch(/\.99diagrams\.json$/)
    const exported = JSON.parse(json.bytes.toString('utf8')) as ExportedDocument
    expect(exported.name).toBe(demo.name)
    expect(exported.pages[0].nodes.map((node) => node.data.label)).toContain(betaLabel)
    expect(exported.pages[0].edges.some((edge) => edge.label === 'Beta path')).toBe(true)

    await page.locator('input[accept*=".99diagrams"]').setInputFiles(json.path)
    await expect(page.locator('.react-flow__node').getByText(betaLabel, { exact: true })).toBeVisible()

    await clickToolbarMenuItem(page, 'View', 'Light')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Change language: Vietnamese' }).click()
    await expect(page.getByRole('button', { name: 'Đổi ngôn ngữ: Tiếng Anh' })).toBeVisible()
  })
}
