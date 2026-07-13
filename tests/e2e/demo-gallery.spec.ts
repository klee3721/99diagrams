import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

type ExportedDocument = {
  name: string
  pages: Array<{
    name: string
    layers: Array<{ name: string; visible: boolean; locked: boolean }>
    nodes: Array<{ data: { label: string } }>
    edges: unknown[]
  }>
}

const demos = [
  { name: 'Product flow', nodes: 9, edges: 10, layers: ['Default'], anchor: 'Beta feedback' },
  { name: 'Release checklist', nodes: 7, edges: 6, layers: ['Default'], anchor: 'Changelog + SBOM' },
  { name: 'Architecture map', nodes: 7, edges: 7, layers: ['Client', 'Service', 'Data'], anchor: 'PWA shell' },
  { name: 'Bug triage swimlane', nodes: 7, edges: 6, layers: ['Default'], anchor: 'Open focused PR' },
]

async function runCommand(page: Page, query: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await search.fill(query)
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette.getByRole('button', { name: new RegExp(query) })).toBeVisible()
  await page.keyboard.press('Enter')
}

async function clickToolbarMenuItem(page: Page, menu: string, item: string) {
  const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: `${menu} ▾` }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(`${escapedItem}$`) }).click()
}

async function exportDocument(page: Page): Promise<ExportedDocument> {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  const path = await file.path()
  if (!path) throw new Error('No download path for exported demo')
  return JSON.parse(await readFile(path, 'utf8')) as ExportedDocument
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('99diagrams:language', 'en')
    localStorage.setItem('99diagrams:theme', 'light')
  })
})

for (const demo of demos) {
  test(`opens, edits, and exports demo: ${demo.name}`, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

    await clickToolbarMenuItem(page, 'Insert', 'Demos')
    await expect(page.getByRole('dialog', { name: 'Demo gallery' })).toBeVisible()

    await page.getByRole('button', { name: new RegExp(demo.name) }).click()
    await page.getByRole('dialog', { name: 'Confirm action' }).getByRole('button', { name: 'Confirm' }).click()

    await expect(page.locator('.document-title')).toContainText(demo.name)
    await expect(page.locator('.react-flow__node')).toHaveCount(demo.nodes)
    await expect(page.locator('.react-flow__edge')).toHaveCount(demo.edges)
    await expect(page.locator('.react-flow__node').getByText(demo.anchor, { exact: true })).toBeVisible()

    await runCommand(page, 'Add Process')
    await expect(page.locator('.react-flow__node')).toHaveCount(demo.nodes + 1)

    const exported = await exportDocument(page)
    expect(exported.name).toBe(demo.name)
    expect(exported.pages).toHaveLength(1)
    expect(exported.pages[0].name).toBe(demo.name)
    expect(exported.pages[0].nodes).toHaveLength(demo.nodes + 1)
    expect(exported.pages[0].edges).toHaveLength(demo.edges)
    expect(exported.pages[0].nodes.map((node) => node.data.label)).toContain('Process step')
    expect(exported.pages[0].layers.map((layer) => layer.name)).toEqual(demo.layers)
    expect(exported.pages[0].layers.every((layer) => layer.visible && !layer.locked)).toBe(true)
  })
}
