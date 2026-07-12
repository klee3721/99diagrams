import { expect, test } from '@playwright/test'

test('switches language and themes and persists them across reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99draw:language', localStorage.getItem('99draw:language') ?? 'en')
    localStorage.setItem('99draw:theme', localStorage.getItem('99draw:theme') ?? 'light')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: /Change language: VI/ }).click()
  await expect(page.getByRole('button', { name: 'Xuất file' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')

  await page.getByRole('button', { name: 'Sáng' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Tối' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast')
  await page.getByRole('button', { name: 'Tương phản' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Xuất file' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.evaluate(() => localStorage.getItem('99draw:language'))).resolves.toBe('vi')
  await expect(page.evaluate(() => localStorage.getItem('99draw:theme'))).resolves.toBe('light')
})
