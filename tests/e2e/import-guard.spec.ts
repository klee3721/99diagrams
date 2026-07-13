import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const defaultLayer = { id: 'default', name: 'Default', visible: true, locked: false }

function importedDocument() {
  return {
    version: 2,
    id: 'import-guard-doc',
    name: 'Imported guard',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activePageId: 'page-1',
    pages: [{
      id: 'page-1',
      name: 'Imported page',
      layers: [defaultLayer],
      nodes: [
        {
          id: 'import-start',
          type: 'diagram',
          position: { x: 120, y: 120 },
          data: {
            kind: 'start',
            label: 'Imported start',
            fill: '#d1fae5',
            stroke: '#10b981',
            textColor: '#064e3b',
            layerId: 'default',
          },
        },
        {
          id: 'import-process',
          type: 'diagram',
          position: { x: 120, y: 260 },
          data: {
            kind: 'process',
            label: 'Imported process',
            fill: '#dbeafe',
            stroke: '#3b82f6',
            textColor: '#172554',
            layerId: 'default',
          },
        },
      ],
      edges: [{
        id: 'import-edge',
        source: 'import-start',
        target: 'import-process',
        type: 'smoothstep',
        animated: false,
        reconnectable: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
      }],
    }],
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99diagrams:language', 'en')
  })
})

test('imports a valid .99diagrams.json file through the open control', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await page.locator('input[accept*=".99diagrams"]').setInputFiles({
    name: 'imported.99diagrams.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(importedDocument())),
  })

  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await expect(page.locator('.react-flow__node').getByText('Imported start', { exact: true })).toBeVisible()
  await expect(page.locator('.react-flow__node').getByText('Imported process', { exact: true })).toBeVisible()
})

test('rejects malformed .99diagrams.json without replacing the current document', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.react-flow__node')).toHaveCount(5)

  await page.locator('input[accept*=".99diagrams"]').setInputFiles({
    name: 'malformed.99diagrams.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":2,"pages":[]}'),
  })
  const dialog = page.getByRole('dialog', { name: 'Notice' })
  await expect(dialog).toContainText('Could not read the file')
  await dialog.getByRole('button', { name: 'OK' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(5)
  await expect(page.getByText('Imported start')).toHaveCount(0)
})

test('rejects files larger than 5 MB without replacing the current document', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('.react-flow__node')).toHaveCount(5)

  const filePath = testInfo.outputPath('too-large.99diagrams.json')
  await writeFile(filePath, Buffer.alloc((5 * 1024 * 1024) + 1, 'x'))

  await page.locator('input[accept*=".99diagrams"]').setInputFiles(filePath)
  const dialog = page.getByRole('dialog', { name: 'Notice' })
  await expect(dialog).toContainText('File is too large')
  await dialog.getByRole('button', { name: 'OK' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(5)
  await expect(page.getByText('Imported start')).toHaveCount(0)
})
