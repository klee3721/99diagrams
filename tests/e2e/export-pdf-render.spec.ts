import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { jsPDF } from 'jspdf'
import { exportFixtures } from '../../src/export-fixtures'
import { exportSnapshotToSvg } from '../../src/svg'

const hasPoppler = commandExists('pdfinfo') && commandExists('pdftoppm')

test.describe('PDF export renderer verification', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'PDF render checks are pinned to Chromium for stable raster input.')
  test.skip(!hasPoppler, 'PDF render checks require Poppler tools: pdfinfo and pdftoppm.')

  for (const fixture of exportFixtures) {
    test(`${fixture.id} exports a renderable one-page PDF`, async ({ page }) => {
      const svg = exportSnapshotToSvg(fixture.snapshot, { title: fixture.name })
      const svgSize = readSvgSize(svg)

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

      const pngBuffer = await page.locator('svg').screenshot({
        animations: 'disabled',
        scale: 'css',
      })
      const pdfBuffer = createPdfFromPng(pngBuffer, svgSize)
      const render = renderPdfToPng(pdfBuffer)
      const rendered = await inspectPng(page, render.png)

      expect(render.info, fixture.id).toContain('Pages:           1')
      expect(rendered.width, fixture.id).toBeGreaterThan(100)
      expect(rendered.height, fixture.id).toBeGreaterThan(100)
      expect(rendered.width / rendered.height, fixture.id).toBeCloseTo(svgSize.width / svgSize.height, 1)

      if (fixture.snapshot.nodes.length > 0 || fixture.snapshot.edges.length > 0) {
        expect(rendered.nonWhitePixelCount, fixture.id).toBeGreaterThan(500)
      }
    })
  }
})

function commandExists(command: string) {
  try {
    execFileSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function readSvgSize(svg: string) {
  const width = Number(svg.match(/\swidth="([\d.]+)"/)?.[1])
  const height = Number(svg.match(/\sheight="([\d.]+)"/)?.[1])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('SVG export is missing a valid width/height')
  }
  return { width, height }
}

function createPdfFromPng(pngBuffer: Buffer, size: { width: number; height: number }) {
  const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
  const orientation = size.width > size.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [size.width, size.height] })
  pdf.addImage(dataUrl, 'PNG', 0, 0, size.width, size.height)
  return Buffer.from(pdf.output('arraybuffer'))
}

function renderPdfToPng(pdfBuffer: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), '99diagrams-pdf-render-'))
  const pdfPath = join(dir, 'fixture.pdf')
  const outputPrefix = join(dir, 'rendered')

  try {
    writeFileSync(pdfPath, pdfBuffer)
    const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' })
    execFileSync('pdftoppm', ['-png', '-r', '96', '-singlefile', pdfPath, outputPrefix])
    return {
      info,
      png: readFileSync(`${outputPrefix}.png`),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function inspectPng(page: Page, png: Buffer) {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

  return page.evaluate(async (dataUrl) => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable')
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let nonWhitePixelCount = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3]
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      if (alpha > 0 && (red < 248 || green < 248 || blue < 248)) {
        nonWhitePixelCount += 1
      }
    }

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      nonWhitePixelCount,
    }
  }, `data:image/png;base64,${png.toString('base64')}`)
}
