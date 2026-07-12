import { expect, test } from '@playwright/test'
import { exportFixtures } from '../../src/export-fixtures'
import { exportSnapshotToSvg } from '../../src/svg'

test.describe('export visual goldens', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual goldens are pinned to Chromium for stable raster output.')

  for (const fixture of exportFixtures) {
    test(`${fixture.id} renders stable export artwork`, async ({ page }) => {
      const svg = exportSnapshotToSvg(fixture.snapshot, { title: fixture.name })

      await page.setContent(`
        <!doctype html>
        <html>
          <head>
            <style>
              html, body { margin: 0; padding: 0; background: #ffffff; }
              body { width: max-content; height: max-content; }
              svg { display: block; }
            </style>
          </head>
          <body>${svg}</body>
        </html>
      `)

      await expect(page.locator('svg')).toHaveScreenshot(`${fixture.id}.png`, {
        animations: 'disabled',
      })
    })
  }
})
