import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function runCommand(page: Page, query: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByRole('textbox', { name: 'Search commands…' })
  await search.fill(query)
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette.getByRole('button', { name: new RegExp(query) })).toBeVisible()
  await page.keyboard.press('Enter')
}

async function openBlankDiagram(page: Page) {
  await runCommand(page, 'Open template gallery')
  await page.getByRole('button', { name: /Blank diagram/ }).click()
  await page.getByRole('dialog', { name: 'Confirm action' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
}

async function clickToolbarMenuItem(page: Page, menu: string, item: string) {
  const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: `${menu} ▾` }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: new RegExp(`${escapedItem}$`) }).click()
}

async function readLegacySnapshot(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('99diagrams:document:v1') ?? '{"nodes":[],"edges":[]}') as {
    nodes: Array<{ id: string; position: { x: number; y: number }; zIndex?: number; parentId?: string; style?: { width?: number; height?: number } }>
    edges: unknown[]
  })
}

async function renameCurrentDocument(page: Page, name: string) {
  await page.locator('.document-title').click()
  const dialog = page.getByRole('dialog', { name: 'Diagram name' })
  await dialog.getByRole('textbox').fill(name)
  await dialog.getByRole('button', { name: 'OK' }).click()
  await expect(page.locator('.document-title')).toContainText(name)
}

async function downloadDocument(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  return JSON.parse(await readFile(await file.path() ?? '', 'utf8')) as {
    activePageId: string
    pages: Array<{
      id: string
      name: string
      layers: Array<{ id: string; name: string; visible: boolean; locked: boolean }>
      nodes: Array<{ id: string; data: { label: string; layerId?: string } }>
      edges: unknown[]
    }>
  }
}

async function downloadDocumentFromCommand(page: Page, query: string) {
  const download = page.waitForEvent('download')
  await runCommand(page, query)
  const file = await download
  const path = await file.path()
  if (!path) throw new Error(`No download path for ${query}`)
  return JSON.parse(await readFile(path, 'utf8')) as Awaited<ReturnType<typeof downloadDocument>>
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('99diagrams:workflow-regression-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('99diagrams:workflow-regression-seeded', '1')
    }
    localStorage.setItem('99diagrams:language', localStorage.getItem('99diagrams:language') ?? 'en')
    localStorage.setItem('99diagrams:theme', localStorage.getItem('99diagrams:theme') ?? 'light')
  })
})

test('uses localized default document, page and layer names', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await expect(page.locator('.document-title')).toContainText('Untitled diagram')
  await expect(page.getByRole('button', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Default' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Common/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'More shapes' })).toBeVisible()
  await expect(page.getByText('Layers')).toBeVisible()
  await expect.poll(async () => page.evaluate(() => {
    const panel = document.querySelector('.palette-panel')?.getBoundingClientRect()
    const layers = document.querySelector('.layers-panel')?.getBoundingClientRect()
    return !!panel && !!layers && layers.top >= panel.top && layers.bottom <= panel.bottom
  })).toBe(true)
})

test('opens a previously autosaved diagram from recent documents', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  await renameCurrentDocument(page, 'Recent Alpha')
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
  await page.waitForTimeout(1_000)

  await page.getByRole('button', { name: 'New' }).click()
  await page.getByRole('dialog', { name: 'Confirm action' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(5)
  await renameCurrentDocument(page, 'Recent Beta')
  await page.waitForTimeout(1_000)

  await page.getByRole('button', { name: 'Recent', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Recent diagrams' })).toBeVisible()
  await page.getByRole('button', { name: /Recent Alpha/ }).click()

  await expect(page.locator('.document-title')).toContainText('Recent Alpha')
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
})

test('adds shapes from the grouped shape library dialog', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await page.getByRole('button', { name: 'More shapes' }).click()
  const dialog = page.getByRole('dialog', { name: 'Shape library' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox').fill('diamond')
  await dialog.getByRole('button', { name: 'Diamond' }).first().click()

  await expect(dialog).toBeHidden()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await expect(page.locator('.react-flow__node .shape-diamond')).toBeVisible()
})

test('removes the arrow shape category from the shape library', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await expect(page.getByRole('button', { name: 'Straight arrow' })).toHaveCount(0)

  await page.getByRole('button', { name: 'More shapes' }).click()
  const dialog = page.getByRole('dialog', { name: 'Shape library' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Arrows' })).toHaveCount(0)
  await dialog.getByRole('textbox').fill('arrow')
  await expect(dialog.getByText('No matching shapes found.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /arrow/i })).toHaveCount(0)
})

test('keeps Text transparent and removes the redundant Textbox shape', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await page.getByRole('button', { name: 'Text', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Textbox', exact: true })).toHaveCount(0)

  const textNode = page.locator('.react-flow__node .shape-text').first()

  await expect(textNode).toContainText('Text')

  const styles = await page.evaluate(() => {
    const text = document.querySelector('.shape-text')
    if (!text) return null
    const textStyle = getComputedStyle(text)
    return {
      text: {
        background: textStyle.backgroundColor,
        borderStyle: textStyle.borderTopStyle,
        borderColor: textStyle.borderTopColor,
        boxShadow: textStyle.boxShadow,
      },
    }
  })

  expect(styles).toEqual({
    text: {
      background: 'rgba(0, 0, 0, 0)',
      borderStyle: 'solid',
      borderColor: 'rgba(0, 0, 0, 0)',
      boxShadow: 'none',
    },
  })
})

test('basic shapes expose resize corners, connection handles, and black-white mode', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await page.getByRole('button', { name: 'Rectangle' }).first().click()
  await page.locator('.react-flow__node').getByText('Rectangle', { exact: true }).click()
  const node = page.locator('.react-flow__node.selected .diagram-node')
  await expect(node).toContainText('Rectangle')

  await expect(page.locator('.react-flow__node.selected .resize-handle')).toHaveCount(4)
  await expect(page.locator('.react-flow__node.selected .node-handle')).toHaveCount(4)
  await expect.poll(async () => node.evaluate((element) => {
    return [...element.querySelectorAll('.node-handle')].every((handle) => {
      const computed = getComputedStyle(handle)
      const before = getComputedStyle(handle, '::before')
      return Number(computed.opacity) > 0.9 && Number(before.opacity) > 0.2 && computed.pointerEvents === 'all'
    })
  })).toBe(true)
  await expect.poll(async () => node.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const byPosition = new Map([...element.querySelectorAll('.node-handle')].map((handle) => {
      const handleRect = handle.getBoundingClientRect()
      return [handle.getAttribute('data-handlepos'), {
        left: handleRect.left,
        right: handleRect.right,
        top: handleRect.top,
        bottom: handleRect.bottom,
      }]
    }))
    const close = (a: number | undefined, b: number) => typeof a === 'number' && Math.abs(a - b) <= 16

    return Boolean(
      close(byPosition.get('top')?.top, rect.top)
      && close(byPosition.get('bottom')?.bottom, rect.bottom)
      && close(byPosition.get('left')?.left, rect.left)
      && close(byPosition.get('right')?.right, rect.right)
    )
  })).toBe(true)
  const rightHandle = page.locator('.react-flow__node.selected .react-flow__handle-right.node-handle')
  const rightHandleBox = await rightHandle.boundingBox()
  if (!rightHandleBox) throw new Error('Right connector handle is unavailable')
  await page.mouse.move(rightHandleBox.x + rightHandleBox.width + 18, rightHandleBox.y + rightHandleBox.height / 2)
  await expect.poll(async () => rightHandle.evaluate((handle) => Number(getComputedStyle(handle, '::before').opacity))).toBeGreaterThan(0.75)

  const colorState = await node.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderRadius: style.borderRadius,
      fill: style.backgroundColor,
      border: style.borderColor,
    }
  })

  expect(colorState.borderRadius).toBe('0px')
  expect(colorState.fill).toBe('rgb(219, 234, 254)')
  expect(colorState.border).toBe('rgb(59, 130, 246)')

  await page.locator('.size-field').first().getByRole('spinbutton').fill('240')
  await page.locator('.size-field').nth(1).getByRole('spinbutton').fill('120')

  await expect.poll(async () => page.locator('.react-flow__node.selected').evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: style.width, height: style.height }
  })).toEqual({ width: '240px', height: '120px' })

  await page.locator('.color-mode-button').click()
  await expect(page.locator('.color-mode-button')).toContainText('Black & white')

  const monoState = await node.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      fill: style.backgroundColor,
      border: style.borderColor,
      color: style.color,
    }
  })

  expect(monoState).toEqual({
    fill: 'rgb(255, 255, 255)',
    border: 'rgb(17, 24, 39)',
    color: 'rgb(17, 24, 39)',
  })
})

test('connectors keep the arrow tip just outside the target shape border', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99diagrams:document:v1', JSON.stringify({
      version: 1,
      nodes: [
        {
          id: 'a',
          type: 'diagram',
          position: { x: 100, y: 120 },
          style: { width: 164, height: 76 },
          data: { kind: 'process', label: 'A', shapeType: 'rectangle', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
        },
        {
          id: 'b',
          type: 'diagram',
          position: { x: 420, y: 120 },
          style: { width: 164, height: 76 },
          data: { kind: 'process', label: 'B', shapeType: 'rectangle', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
        },
      ],
      edges: [{
        id: 'a-b',
        source: 'a',
        target: 'b',
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'smoothstep',
        reconnectable: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#64748b' },
      }],
    }))
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await expect.poll(async () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.react-flow__node')].map((node) => {
      const box = node.getBoundingClientRect()
      return { label: node.textContent?.trim(), left: box.left, right: box.right }
    })
    const source = nodes.find((node) => node.label === 'A')
    const target = nodes.find((node) => node.label === 'B')
    const path = document.querySelector('.react-flow__edge-path')
    const pathBox = path?.getBoundingClientRect()
    if (!source || !target || !pathBox) return false

    const sourceGap = Math.abs(pathBox.left - source.right)
    const targetGap = Math.abs(target.left - pathBox.right)
    return sourceGap <= 20 && targetGap >= -2 && targetGap <= 20 && path?.hasAttribute('marker-end')
  })).toBe(true)
})

test('connectors snap to a nearby shape without dropping exactly on a handle', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('99diagrams:document:v1', JSON.stringify({
      version: 1,
      nodes: [
        {
          id: 'a',
          type: 'diagram',
          position: { x: 120, y: 160 },
          style: { width: 164, height: 76 },
          data: { kind: 'process', label: 'A', shapeType: 'rectangle', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
        },
        {
          id: 'b',
          type: 'diagram',
          position: { x: 460, y: 160 },
          style: { width: 164, height: 76 },
          data: { kind: 'process', label: 'B', shapeType: 'rectangle', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
        },
      ],
      edges: [],
    }))
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()

  const source = page.locator('.react-flow__node').filter({ hasText: /^A$/ })
  const target = page.locator('.react-flow__node').filter({ hasText: /^B$/ })
  await source.click()

  const rightHandle = source.locator('.react-flow__handle-right.node-handle')
  const rightHandleBox = await rightHandle.boundingBox()
  const targetBox = await target.boundingBox()
  if (!rightHandleBox || !targetBox) throw new Error('Unable to locate connector test shapes')

  await page.mouse.move(rightHandleBox.x + rightHandleBox.width / 2, rightHandleBox.y + rightHandleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 })
  await page.mouse.up()

  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await expect.poll(async () => page.evaluate(() => {
    const sourceNode = [...document.querySelectorAll('.react-flow__node')].find((node) => node.textContent?.trim() === 'A')
    const targetNode = [...document.querySelectorAll('.react-flow__node')].find((node) => node.textContent?.trim() === 'B')
    const path = document.querySelector('.react-flow__edge-path')
    if (!sourceNode || !targetNode || !path) return false

    const sourceRect = sourceNode.getBoundingClientRect()
    const targetRect = targetNode.getBoundingClientRect()
    const pathRect = path.getBoundingClientRect()
    return Math.abs(pathRect.left - sourceRect.right) <= 8
      && pathRect.right >= targetRect.left - 8
      && pathRect.right <= targetRect.right + 8
  })).toBe(true)
})

test('triangle keeps its fill, border, label, and editable size aligned', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await page.getByRole('button', { name: 'Triangle' }).first().click()
  await page.locator('.react-flow__node').getByText('Triangle', { exact: true }).click()

  await page.locator('.size-field').first().getByRole('spinbutton').fill('260')
  await page.locator('.size-field').nth(1).getByRole('spinbutton').fill('150')

  const triangle = page.locator('.react-flow__node.selected .shape-triangle')
  await expect(triangle).toContainText('Triangle')
  await expect(page.locator('.react-flow__node.selected .resize-handle')).toHaveCount(4)

  await expect.poll(async () => triangle.evaluate((element) => {
    const wrapper = element.closest('.react-flow__node')
    if (!wrapper) return null
    const wrapperStyle = getComputedStyle(wrapper)
    const shapeStyle = getComputedStyle(element)
    const before = getComputedStyle(element, '::before')
    const after = getComputedStyle(element, '::after')
    const label = element.querySelector('span')
    const labelRect = label?.getBoundingClientRect()
    const shapeRect = element.getBoundingClientRect()

    return {
      wrapper: { width: wrapperStyle.width, height: wrapperStyle.height },
      shape: { width: shapeStyle.width, height: shapeStyle.height, background: shapeStyle.backgroundColor, border: shapeStyle.borderTopWidth },
      pseudo: { stroke: before.backgroundColor, fill: after.backgroundColor },
      labelInside: labelRect ? labelRect.top > shapeRect.top && labelRect.bottom < shapeRect.bottom && labelRect.left > shapeRect.left && labelRect.right < shapeRect.right : false,
    }
  })).toEqual({
    wrapper: { width: '260px', height: '150px' },
    shape: { width: '260px', height: '150px', background: 'rgba(0, 0, 0, 0)', border: '0px' },
    pseudo: { stroke: 'rgb(225, 29, 72)', fill: 'rgb(255, 228, 230)' },
    labelInside: true,
  })
})

test('edits labels in a centered 99 Diagrams dialog instead of a browser prompt', async ({ page }) => {
  const nativeDialogs: string[] = []
  page.on('dialog', async (dialog) => {
    nativeDialogs.push(dialog.type())
    await dialog.dismiss().catch(() => undefined)
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)
  await runCommand(page, 'Add Process')

  await page.locator('.react-flow__node').first().dblclick()

  const dialog = page.getByRole('dialog', { name: 'Shape label' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.app-dialog-mark')).toContainText('99')
  await expect.poll(async () => nativeDialogs).toEqual([])

  const box = await dialog.boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('Dialog box or viewport is unavailable')

  expect(Math.abs((box.x + box.width / 2) - viewport.width / 2)).toBeLessThan(28)
  expect(Math.abs((box.y + box.height / 2) - viewport.height / 2)).toBeLessThan(28)

  const input = dialog.getByRole('textbox')
  await input.pressSequentially('Custom label')
  await expect(input).toHaveValue('Custom label')
  await dialog.getByRole('button', { name: 'OK' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.locator('.react-flow__node').getByText('Custom label')).toBeVisible()
})

test('persists pages, hidden and locked layers, and layer membership across reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await page.getByRole('button', { name: 'Add layer' }).click()
  const layerDialog = page.getByRole('dialog', { name: 'Layer name' })
  await layerDialog.getByRole('textbox').fill('QA Layer')
  await layerDialog.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByRole('button', { name: 'QA Layer' })).toBeVisible()

  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const qaLayer = page.locator('.layer-row').filter({ hasText: 'QA Layer' })
  await qaLayer.getByRole('button', { name: 'Hide layer' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await qaLayer.getByRole('button', { name: 'Lock layer' }).click()

  await runCommand(page, 'Add page')
  await expect(page.getByRole('button', { name: 'Page 2' })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const exported = await downloadDocument(page)
  expect(exported.pages).toHaveLength(2)
  const firstPage = exported.pages[0]
  const secondPage = exported.pages[1]
  const persistedLayer = firstPage.layers.find((layer) => layer.name === 'QA Layer')
  expect(persistedLayer).toMatchObject({ visible: false, locked: true })
  expect(firstPage.nodes).toHaveLength(1)
  expect(firstPage.nodes[0].data.layerId).toBe(persistedLayer?.id)
  expect(secondPage.nodes).toHaveLength(1)

  await page.getByRole('button', { name: 'Page 1' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  const persistedQaLayer = page.locator('.layer-row').filter({ hasText: 'QA Layer' })
  await persistedQaLayer.getByRole('button', { name: 'Show layer' }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
})

test('navigates shapes and connectors from the outline panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await expect(page.getByText('This page has no shapes yet.')).toBeVisible()

  await runCommand(page, 'Add Process')
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Process step Process/ })).toBeVisible()

  await page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Process step Process/ }).click()
  await expect(page.getByLabel('Label')).toHaveValue('Process step')

  await runCommand(page, 'Add Decision')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await runCommand(page, 'Connect selected shapes')

  const connector = page.getByRole('list', { name: 'Connectors' }).getByRole('button', { name: /Connector: Process step to Condition/ })
  await expect(connector).toBeVisible()
  await connector.click()
  await expect(page.getByLabel('Connector label')).toBeVisible()
})

test('arranges selected shapes from the toolbar arrange menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('99diagrams:language', 'en')
    localStorage.setItem('99diagrams:theme', 'light')
    localStorage.setItem('99diagrams:document:v1', JSON.stringify({
      version: 1,
      nodes: [
        { id: 'a', type: 'diagram', position: { x: 420, y: 90 }, style: { width: 120, height: 60 }, data: { kind: 'process', label: 'A', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' } },
        { id: 'b', type: 'diagram', position: { x: 100, y: 320 }, style: { width: 220, height: 60 }, data: { kind: 'process', label: 'B', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' } },
        { id: 'c', type: 'diagram', position: { x: 760, y: 430 }, style: { width: 160, height: 60 }, data: { kind: 'process', label: 'C', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' } },
      ],
      edges: [],
    }))
  })

  await page.goto('/')
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')

  await clickToolbarMenuItem(page, 'Arrange', 'Distribute horizontally')
  await expect.poll(async () => {
    const snapshot = await readLegacySnapshot(page)
    return Math.round(snapshot.nodes.find((node) => node.id === 'a')?.position.x ?? 0)
  }).toBe(480)

  await clickToolbarMenuItem(page, 'Arrange', 'Align selected shapes top')
  await expect.poll(async () => {
    const snapshot = await readLegacySnapshot(page)
    return snapshot.nodes.map((node) => Math.round(node.position.y)).sort((a, b) => a - b)
  }).toEqual([90, 90, 90])

  await clickToolbarMenuItem(page, 'Arrange', 'Bring to front')
  await expect.poll(async () => {
    const snapshot = await readLegacySnapshot(page)
    return snapshot.nodes.map((node) => node.zIndex)
  }).toEqual([1, 2, 3])

  await clickToolbarMenuItem(page, 'Arrange', 'Group selected shapes')
  await expect.poll(async () => {
    const snapshot = await readLegacySnapshot(page)
    const group = snapshot.nodes.find((node) => !node.parentId && node.id !== 'a' && node.id !== 'b' && node.id !== 'c')
    return {
      groupWidth: Math.round(group?.style?.width ?? 0),
      children: snapshot.nodes.filter((node) => node.parentId === group?.id).length,
    }
  }).toEqual({ groupWidth: 884, children: 3 })
})

test('keeps the diagram inside a page frame that expands toward placed shapes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('99diagrams:language', 'en')
    localStorage.setItem('99diagrams:theme', 'light')
    localStorage.setItem('99diagrams:document:v1', JSON.stringify({
      version: 1,
      nodes: [
        { id: 'left', type: 'diagram', position: { x: -180, y: 120 }, data: { kind: 'process', label: 'Left item', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' } },
        { id: 'right', type: 'diagram', position: { x: 1310, y: 180 }, data: { kind: 'process', label: 'Right item', fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' } },
        { id: 'top', type: 'diagram', position: { x: 340, y: -120 }, data: { kind: 'decision', label: 'Top item', fill: '#fef3c7', stroke: '#f59e0b', textColor: '#78350f' } },
      ],
      edges: [],
    }))
  })

  await page.goto('/')
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await expect(page.locator('.drawing-page-frame')).toHaveClass(/drawing-page-paper/)
  await expect(page.locator('.drawing-page-frame')).toHaveCSS('width', '1846px')
  await expect(page.locator('.drawing-page-frame')).toHaveCSS('height', '1016px')

  await page.getByLabel('Page background').selectOption('white')
  await expect(page.locator('.drawing-page-frame')).toHaveClass(/drawing-page-white/)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export file' }).click()
  const file = await download
  const path = await file.path()
  if (!path) throw new Error('No download path for framed export')
  const exported = JSON.parse(await readFile(path, 'utf8')) as {
    pages: Array<{ frame: { x: number; y: number; width: number; height: number; background: string } }>
  }

  expect(exported.pages[0].frame).toMatchObject({ x: -276, y: -216, width: 1846, height: 1016, background: 'white' })
})

test('imports an editable diagram from CSV', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Import CSV diagram')
  const importDialog = page.getByRole('dialog', { name: 'Import CSV' })
  await expect(importDialog).toBeVisible()
  await importDialog.getByRole('textbox', { name: 'Source' }).fill(`id,label,kind,next,x,y
start,Start,start,review,120,80
review,Review request,decision,ship;revise,340,80
ship,Ship it,process,,580,40
revise,Revise,document,,580,170`)
  await importDialog.getByRole('button', { name: 'Import' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__edge')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Review request Decision/ })).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label).sort()).toEqual(['Review request', 'Revise', 'Ship it', 'Start'])
  expect(exported.pages[0].edges).toHaveLength(3)
})

test('imports an editable diagram from Mermaid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Import Mermaid flowchart')
  const importDialog = page.getByRole('dialog', { name: 'Import Mermaid' })
  await expect(importDialog).toBeVisible()
  await importDialog.getByRole('textbox', { name: 'Source' }).fill(`flowchart TD
A(Start) --> B{Ready?}
B -->|Yes| C[Ship]
B -->|No| D[Revise]`)
  await importDialog.getByRole('button', { name: 'Import' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__edge')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Shapes' }).getByRole('button', { name: /Ready\? Decision/ })).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label).sort()).toEqual(['Ready?', 'Revise', 'Ship', 'Start'])
  expect(exported.pages[0].edges).toHaveLength(3)
})

test('exports only the selected shapes or the active page from command palette', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Add Process')
  await runCommand(page, 'Add Decision')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  const selectionExport = await downloadDocumentFromCommand(page, 'Export selection')
  expect(selectionExport.pages).toHaveLength(1)
  expect(selectionExport.pages[0].nodes.map((node) => node.data.label)).toEqual(['Condition?'])
  expect(selectionExport.pages[0].edges).toHaveLength(0)

  await runCommand(page, 'Add page')
  await expect(page.getByRole('button', { name: 'Page 2' })).toBeVisible()
  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  const pageExport = await downloadDocumentFromCommand(page, 'Export current page')
  expect(pageExport.pages).toHaveLength(1)
  expect(pageExport.pages[0].name).toBe('Page 2')
  expect(pageExport.pages[0].nodes.map((node) => node.data.label)).toEqual(['Process step'])
})

test('finds, replaces, reloads, and exports updated labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await openBlankDiagram(page)

  await runCommand(page, 'Add Process')
  await expect(page.locator('.react-flow__node').getByText('Process step')).toBeVisible()

  await clickToolbarMenuItem(page, 'View', 'Find')
  const findDialog = page.getByRole('dialog', { name: 'Find and replace' })
  await expect(findDialog).toBeVisible()
  await findDialog.getByRole('textbox', { name: 'Find' }).fill('Process step')
  await findDialog.getByRole('textbox', { name: 'Replace with' }).fill('Reviewed step')
  await page.getByRole('button', { name: 'Replace all' }).click()
  await expect(page.locator('.react-flow__node').getByText('Reviewed step')).toBeVisible()

  await page.waitForTimeout(1_000)
  await page.reload()
  await expect(page.locator('.react-flow__node').getByText('Reviewed step')).toBeVisible()

  const exported = await downloadDocument(page)
  expect(exported.pages[0].nodes.map((node) => node.data.label)).toContain('Reviewed step')
})
