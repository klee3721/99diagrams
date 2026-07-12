import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function runCommand(page: import('@playwright/test').Page, query: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await expect(search).toBeVisible()
  await search.fill(query)
  await page.keyboard.press('Enter')
  await expect(search).toBeHidden()
}

test('creates, connects, persists, reopens, and exports a small diagram', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', 'en')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await runCommand(page, 'Open template gallery')
  await page.getByRole('button', { name: /Blank diagram/ }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)

  await runCommand(page, 'Add Process')
  await runCommand(page, 'Add Decision')
  await runCommand(page, 'Select all')
  await runCommand(page, 'Connect selected shapes')

  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.99draw\.json$/)

  const svgFile = await downloadFromButton(page, 'Export SVG')
  expect(svgFile.name).toMatch(/\.svg$/)
  expect(svgFile.bytes.toString('utf8')).toContain('<svg')
  expect(svgFile.bytes.toString('utf8')).toContain('Process')

  const pngFile = await downloadFromButton(page, 'Export PNG')
  expect(pngFile.name).toMatch(/\.png$/)
  expect([...pngFile.bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const pdfFile = await downloadFromButton(page, 'Export PDF')
  expect(pdfFile.name).toMatch(/\.pdf$/)
  expect(pdfFile.bytes.subarray(0, 4).toString('utf8')).toBe('%PDF')
})

test('deletes grouped nodes without leaving orphaned children or edges', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', 'en')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await runCommand(page, 'Open template gallery')
  await page.getByRole('button', { name: /Blank diagram/ }).click()

  await runCommand(page, 'Add Process')
  await runCommand(page, 'Add Decision')
  await runCommand(page, 'Select all')
  await runCommand(page, 'Connect selected shapes')
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await runCommand(page, 'Group selected shapes')

  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.keyboard.press('Delete')

  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
})

test('opens an editable demo from the demo gallery', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', 'en')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await page.getByRole('button', { name: 'Demos' }).click()
  await expect(page.getByRole('dialog', { name: 'Demo gallery' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Product flow/ }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(9)
  await expect(page.locator('.react-flow__edge')).toHaveCount(10)
  await expect(page.locator('.react-flow__node').getByText('Beta feedback', { exact: true })).toBeVisible()
})

test('uses a read-only canvas on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', 'en')
  })

  await page.goto('/')

  await expect(page.getByRole('status')).toContainText('Small-screen view mode')
  await expect(page.locator('.react-flow__node')).toHaveCount(5)

  const dialogOpened = page.waitForEvent('dialog', { timeout: 500 }).then(() => true).catch(() => false)
  await page.locator('.react-flow__node').first().dblclick({ force: true })
  expect(await dialogOpened).toBe(false)
})

test('shows swimlane lane membership for child nodes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', 'en')
    localStorage.setItem('99draw:document:v1', JSON.stringify({
      version: 1,
      nodes: [
        {
          id: 'lane',
          type: 'diagram',
          position: { x: 80, y: 60 },
          style: { width: 420, height: 260 },
          data: {
            kind: 'swimlane',
            label: 'Fulfillment',
            fill: '#f0fdfa',
            stroke: '#14b8a6',
            textColor: '#134e4a',
            swimlane: { direction: 'horizontal', lanes: ['Sales', 'Ops', 'Finance'] },
          },
        },
        {
          id: 'invoice',
          type: 'diagram',
          parentId: 'lane',
          extent: 'parent',
          position: { x: 80, y: 170 },
          data: {
            kind: 'process',
            label: 'Invoice',
            fill: '#dbeafe',
            stroke: '#3b82f6',
            textColor: '#172554',
          },
        },
      ],
      edges: [],
    }))
  })

  await page.goto('/')
  await expect(page.locator('.react-flow__node').getByText('Invoice', { exact: true })).toBeVisible()
  await page.locator('.react-flow__node').getByText('Invoice', { exact: true }).click()

  await expect(page.getByText('In lane Finance')).toBeVisible()
  await expect(page.getByText('inside Fulfillment')).toBeVisible()
})

async function downloadFromButton(page: import('@playwright/test').Page, name: string) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name }).click()
  const file = await download
  const path = await file.path()
  if (!path) throw new Error(`No download path for ${name}`)
  return {
    name: file.suggestedFilename(),
    bytes: await readFile(path),
  }
}
