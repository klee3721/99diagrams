import { expect, test } from '@playwright/test'

test('does not make external network requests on default load', async ({ page }) => {
  const requests: string[] = []

  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('http://') || url.startsWith('https://')) {
      requests.push(url)
    }
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: /Xuất tệp|Export file/ })).toBeVisible()
  await page.waitForTimeout(500)

  const appOrigin = new URL(page.url()).origin
  const externalRequests = requests.filter((url) => new URL(url).origin !== appOrigin)

  expect(externalRequests).toEqual([])
})
