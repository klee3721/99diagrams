import { describe, expect, it } from 'vitest'
import {
  addPage,
  createDocument,
  createDocumentFromSnapshot,
  documentMigrations,
  duplicatePage,
  getActivePage,
  orderedVisibleNodes,
  parseDiagramDocument,
  removePage,
  selectPage,
  serializeDiagramDocument,
  updateActivePage,
  visibleEdges,
  visibleNodes,
} from './document'
import { createEdge, createNode } from './diagram'

describe('versioned documents', () => {
  it('migrates a legacy v1 node/edge snapshot into v2', () => {
    const legacy = { nodes: [createNode('process', { x: 0, y: 0 }, 'A', 'a')], edges: [] }
    const document = parseDiagramDocument(legacy)

    expect(document?.version).toBe(2)
    expect(document?.pages).toHaveLength(1)
    expect(getActivePage(document!).nodes[0].id).toBe('a')
  })

  it('uses an explicit import migration registry', () => {
    const migrationIds = documentMigrations.map((migration) => migration.id)

    expect(migrationIds).toEqual(['v2', 'legacy-v1-snapshot'])
    expect(parseDiagramDocument({ version: 999, pages: [] })).toBeNull()
  })

  it('adds, selects, duplicates and removes pages without losing the active document', () => {
    const original = createDocument('Test', { nodes: [], edges: [] })
    const withSecond = addPage(original, 'Trang 2')
    const duplicate = duplicatePage(withSecond, withSecond.activePageId)
    const selected = selectPage(duplicate, original.activePageId)
    const afterRemoval = removePage(selected, original.activePageId)

    expect(withSecond.pages).toHaveLength(2)
    expect(duplicate.pages).toHaveLength(3)
    expect(afterRemoval.pages).toHaveLength(2)
    expect(afterRemoval.pages.some((page) => page.id === afterRemoval.activePageId)).toBe(true)
  })

  it('hides nodes and edges belonging to an invisible layer', () => {
    const document = createDocument('Layers', { nodes: [], edges: [] })
    const page = getActivePage(document)
    const visible = page.layers[0]
    const hidden = { id: 'hidden', name: 'Ẩn', visible: false, locked: false }
    const withLayers = updateActivePage(document, (current) => ({
      ...current,
      layers: [visible, hidden],
      nodes: [
        { ...createNode('process', { x: 0, y: 0 }, 'Hiện', 'visible-node'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Hiện', layerId: visible.id } },
        { ...createNode('process', { x: 100, y: 0 }, 'Ẩn', 'hidden-node'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Ẩn', layerId: hidden.id } },
      ],
      edges: [createEdge('visible-node', 'hidden-node', 'between')],
    }))
    const active = getActivePage(withLayers)

    expect(visibleNodes(active).map((node) => node.id)).toEqual(['visible-node'])
    expect(visibleEdges(active)).toEqual([])
  })

  it('orders visible nodes by layer order and then z-index', () => {
    const document = createDocument('Layer order', { nodes: [], edges: [] })
    const bottom = { id: 'bottom', name: 'Dưới', visible: true, locked: false }
    const top = { id: 'top', name: 'Trên', visible: true, locked: false }
    const withLayers = updateActivePage(document, (current) => ({
      ...current,
      layers: [bottom, top],
      nodes: [
        { ...createNode('process', { x: 0, y: 0 }, 'Top', 'top-node'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Top', layerId: top.id }, zIndex: -1 },
        { ...createNode('process', { x: 0, y: 0 }, 'Bottom high', 'bottom-high'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Bottom high', layerId: bottom.id }, zIndex: 10 },
        { ...createNode('process', { x: 0, y: 0 }, 'Bottom low', 'bottom-low'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Bottom low', layerId: bottom.id }, zIndex: 0 },
      ],
    }))

    expect(orderedVisibleNodes(getActivePage(withLayers)).map((node) => node.id)).toEqual(['bottom-low', 'bottom-high', 'top-node'])
  })

  it('serializes a deterministic scoped export document that round-trips with layers', () => {
    const layer = { id: 'layer-api', name: 'API', visible: true, locked: false }
    const node = { ...createNode('process', { x: 12, y: 24 }, 'Request', 'node-request'), data: { ...createNode('process', { x: 0, y: 0 }).data, label: 'Request', layerId: layer.id } }
    const exported = createDocumentFromSnapshot('API export', { nodes: [node], edges: [] }, {
      id: 'doc-export',
      pageId: 'page-export',
      pageName: 'API page',
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:00:00.000Z',
      layers: [layer],
    })
    const serialized = serializeDiagramDocument(exported)
    const parsed = parseDiagramDocument(JSON.parse(serialized))

    expect(JSON.parse(serialized)).toMatchObject({
      version: 2,
      id: 'doc-export',
      activePageId: 'page-export',
      pages: [{ id: 'page-export', name: 'API page', layers: [layer] }],
    })
    expect(parsed?.pages[0].nodes[0].data.layerId).toBe('layer-api')
  })
})
