import { expect, test } from '@playwright/test'

async function clickToolbarMenuItem(page: import('@playwright/test').Page, menu: string, item: string) {
  const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: `${menu} ▾` }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(`${escapedItem}$`) }).click()
}

test('switches language and themes and persists them across reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99diagrams:language', localStorage.getItem('99diagrams:language') ?? 'en')
    localStorage.setItem('99diagrams:theme', localStorage.getItem('99diagrams:theme') ?? 'light')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: /Change language: Vietnamese/ }).click()
  await expect(page.getByRole('button', { name: 'Xuất tệp' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')

  await clickToolbarMenuItem(page, 'Hiển thị', 'Sáng')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await clickToolbarMenuItem(page, 'Hiển thị', 'Tối')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast')
  await clickToolbarMenuItem(page, 'Hiển thị', 'Tương phản')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Xuất tệp' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.evaluate(() => localStorage.getItem('99diagrams:language'))).resolves.toBe('vi')
  await expect(page.evaluate(() => localStorage.getItem('99diagrams:theme'))).resolves.toBe('light')
})

test('shows toolbar hints on hover and lets users turn them off', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('99diagrams:hints-test-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('99diagrams:hints-test-seeded', '1')
    }
    localStorage.setItem('99diagrams:language', localStorage.getItem('99diagrams:language') ?? 'en')
    localStorage.setItem('99diagrams:theme', localStorage.getItem('99diagrams:theme') ?? 'light')
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await page.getByRole('button', { name: 'Export ▾' }).hover()
  await expect(page.locator('.toolbar-help.is-visible')).toContainText('Open export')

  await page.getByRole('button', { name: 'Turn toolbar hints off' }).click()
  await page.getByRole('button', { name: 'Export ▾' }).hover()
  await expect(page.locator('.toolbar-help.is-visible')).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Turn toolbar hints on' })).toBeVisible()
  await expect(page.evaluate(() => localStorage.getItem('99diagrams:toolbar-hints'))).resolves.toBe('off')
})
