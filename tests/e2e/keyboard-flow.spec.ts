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

test('creates a 20-node flowchart with keyboard commands and preserves it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99diagrams:language', 'en')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await runCommand(page, 'Open template gallery')
  await page.getByRole('button', { name: /Blank diagram/ }).click()
  await page.getByRole('dialog', { name: 'Confirm action' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)

  for (let index = 0; index < 20; index += 1) {
    await runCommand(page, 'Add Process')
  }
  await runCommand(page, 'Select all')
  await runCommand(page, 'Connect selected shapes')

  await expect(page.locator('.react-flow__node')).toHaveCount(20)
  await expect(page.locator('.react-flow__edge')).toHaveCount(19)

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.locator('.react-flow__node')).toHaveCount(20)
  await expect(page.locator('.react-flow__edge')).toHaveCount(19)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  const path = await file.path()
  if (!path) throw new Error('No exported document path')

  const document = JSON.parse((await readFile(path)).toString('utf8'))
  expect(document.pages[0].nodes).toHaveLength(20)
  expect(document.pages[0].edges).toHaveLength(19)
})
