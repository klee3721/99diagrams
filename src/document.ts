import type { Edge } from '@xyflow/react'
import {
  cloneSnapshot,
  createStarterDiagram,
  nodeDimensions,
  parseDocument,
  type DiagramNode,
  type DiagramSnapshot,
} from './diagram'

export const documentVersion = 2

export type DiagramLayer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

export type PageBackground = 'paper' | 'white'

export type PageFrame = {
  x: number
  y: number
  width: number
  height: number
  background: PageBackground
}

export type DiagramPage = DiagramSnapshot & {
  id: string
  name: string
  layers: DiagramLayer[]
  frame: PageFrame
}

export type DiagramDocument = {
  version: typeof documentVersion
  id: string
  name: string
  createdAt: string
  updatedAt: string
  activePageId: string
  pages: DiagramPage[]
}

export type DocumentIndexEntry = Pick<DiagramDocument, 'id' | 'name' | 'updatedAt'>

export type DocumentSnapshotOptions = {
  id?: string
  pageId?: string
  pageName?: string
  layerName?: string
  createdAt?: string
  updatedAt?: string
  layers?: DiagramLayer[]
  frame?: PageFrame
}

type DocumentMigration = {
  id: string
  accepts: (value: unknown) => boolean
  migrate: (value: unknown) => DiagramDocument | null
}

export function createDocument(name = 'Untitled diagram', snapshot: DiagramSnapshot = createStarterDiagram(), options: Pick<DocumentSnapshotOptions, 'layerName' | 'pageName'> = {}): DiagramDocument {
  const now = new Date().toISOString()
  const page = createPage(options.pageName ?? 'Page 1', snapshot, options.layerName)

  return {
    version: documentVersion,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    activePageId: page.id,
    pages: [page],
  }
}

export function createPage(name: string, snapshot: DiagramSnapshot = { nodes: [], edges: [] }, layerName = 'Default'): DiagramPage {
  const copy = cloneSnapshot(snapshot)
  return {
    id: crypto.randomUUID(),
    name,
    ...copy,
    layers: [createLayer(layerName)],
    frame: expandFrameToFitNodes(defaultPageFrame(), copy.nodes),
  }
}

export function createLayer(name: string): DiagramLayer {
  return { id: crypto.randomUUID(), name, visible: true, locked: false }
}

export function createDocumentFromSnapshot(name: string, snapshot: DiagramSnapshot, options: DocumentSnapshotOptions = {}): DiagramDocument {
  const now = new Date().toISOString()
  const createdAt = options.createdAt ?? now
  const updatedAt = options.updatedAt ?? createdAt
  const page: DiagramPage = {
    id: options.pageId ?? crypto.randomUUID(),
    name: options.pageName ?? 'Page 1',
    ...cloneSnapshot(snapshot),
    layers: options.layers?.length ? options.layers.map((layer) => ({ ...layer })) : [createLayer(options.layerName ?? 'Default')],
    frame: normalizePageFrame(options.frame, snapshot.nodes),
  }

  return {
    version: documentVersion,
    id: options.id ?? crypto.randomUUID(),
    name,
    createdAt,
    updatedAt,
    activePageId: page.id,
    pages: [page],
  }
}

export function serializeDiagramDocument(document: DiagramDocument) {
  return JSON.stringify(document, null, 2)
}

export function getActivePage(document: DiagramDocument): DiagramPage {
  return document.pages.find((page) => page.id === document.activePageId) ?? document.pages[0]
}

export function updateActivePage(document: DiagramDocument, update: (page: DiagramPage) => DiagramPage): DiagramDocument {
  const pages = document.pages.map((page) => page.id === document.activePageId ? update(page) : page)
  return { ...document, pages, updatedAt: new Date().toISOString() }
}

export function updatePage(document: DiagramDocument, pageId: string, update: (page: DiagramPage) => DiagramPage): DiagramDocument {
  return { ...document, pages: document.pages.map((page) => page.id === pageId ? update(page) : page), updatedAt: new Date().toISOString() }
}

export function selectPage(document: DiagramDocument, pageId: string): DiagramDocument {
  return document.pages.some((page) => page.id === pageId) ? { ...document, activePageId: pageId } : document
}

export function addPage(document: DiagramDocument, name?: string): DiagramDocument {
  const page = createPage(name ?? `Page ${document.pages.length + 1}`)
  return { ...document, pages: [...document.pages, page], activePageId: page.id, updatedAt: new Date().toISOString() }
}

export function duplicatePage(document: DiagramDocument, pageId: string): DiagramDocument {
  const source = document.pages.find((page) => page.id === pageId)
  if (!source) return document
  const page: DiagramPage = {
    ...cloneSnapshot(source),
    id: crypto.randomUUID(),
    name: `${source.name} (copy)`,
    layers: source.layers.map((layer) => ({ ...layer, id: crypto.randomUUID() })),
    frame: { ...source.frame },
  }
  return { ...document, pages: [...document.pages, page], activePageId: page.id, updatedAt: new Date().toISOString() }
}

export function removePage(document: DiagramDocument, pageId: string): DiagramDocument {
  if (document.pages.length <= 1) return document
  const pages = document.pages.filter((page) => page.id !== pageId)
  return {
    ...document,
    pages,
    activePageId: document.activePageId === pageId ? pages[0].id : document.activePageId,
    updatedAt: new Date().toISOString(),
  }
}

export function visibleNodes(page: DiagramPage): DiagramNode[] {
  const hiddenLayerIds = new Set(page.layers.filter((layer) => !layer.visible).map((layer) => layer.id))
  return page.nodes.filter((node) => !hiddenLayerIds.has(String(node.data.layerId ?? page.layers[0]?.id)))
}

export function orderedVisibleNodes(page: DiagramPage): DiagramNode[] {
  const order = new Map(page.layers.map((layer, index) => [layer.id, index]))
  return [...visibleNodes(page)].sort((a, b) => {
    const aLayer = order.get(String(a.data.layerId ?? page.layers[0]?.id)) ?? 0
    const bLayer = order.get(String(b.data.layerId ?? page.layers[0]?.id)) ?? 0
    return aLayer - bLayer || (a.zIndex ?? 0) - (b.zIndex ?? 0)
  })
}

export function visibleEdges(page: DiagramPage, nodes: DiagramNode[] = visibleNodes(page)): Edge[] {
  const ids = new Set(nodes.map((node) => node.id))
  return page.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
}

export function parseDiagramDocument(value: unknown): DiagramDocument | null {
  const migration = documentMigrations.find((item) => item.accepts(value))
  return migration?.migrate(value) ?? null
}

export const documentMigrations: DocumentMigration[] = [
  {
    id: `v${documentVersion}`,
    accepts: (value) => isObject(value) && (value as Partial<DiagramDocument>).version === documentVersion,
    migrate: (value) => parseV2(value as Partial<DiagramDocument>),
  },
  {
    id: 'legacy-v1-snapshot',
    accepts: (value) => isObject(value)
      && Array.isArray((value as Partial<DiagramSnapshot>).nodes)
      && Array.isArray((value as Partial<DiagramSnapshot>).edges),
    migrate: (value) => {
      const legacy = parseDocument(value)
      return legacy ? createDocument('Imported diagram', legacy) : null
    },
  },
]

function parseV2(candidate: Partial<DiagramDocument>): DiagramDocument | null {
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.activePageId !== 'string') return null
  const pages = candidate.pages?.map(parsePage)
  if (!pages?.length || pages.some((page) => page == null)) return null
  const parsedPages = pages as DiagramPage[]
  if (!parsedPages.some((page) => page.id === candidate.activePageId)) return null

  return {
    version: documentVersion,
    id: candidate.id,
    name: candidate.name,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    activePageId: candidate.activePageId,
    pages: parsedPages,
  }
}

function parsePage(value: unknown): DiagramPage | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DiagramPage>
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.layers)) return null
  const snapshot = parseDocument(candidate)
  if (!snapshot) return null
  const layers = candidate.layers.filter(isLayer)
  return layers.length === candidate.layers.length && layers.length > 0 ? { id: candidate.id, name: candidate.name, ...snapshot, layers, frame: normalizePageFrame(candidate.frame, snapshot.nodes) } : null
}

function isLayer(value: unknown): value is DiagramLayer {
  if (!value || typeof value !== 'object') return false
  const layer = value as Partial<DiagramLayer>
  return typeof layer.id === 'string' && typeof layer.name === 'string' && typeof layer.visible === 'boolean' && typeof layer.locked === 'boolean'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

export function defaultPageFrame(): PageFrame {
  return { x: 0, y: 0, width: 1200, height: 800, background: 'paper' }
}

export function normalizePageFrame(value: unknown, nodes: DiagramNode[] = []): PageFrame {
  if (!isObject(value)) return expandFrameToFitNodes(defaultPageFrame(), nodes)
  const background = value.background === 'white' ? 'white' : 'paper'
  const frame: PageFrame = {
    x: safeFrameNumber(value.x, 0),
    y: safeFrameNumber(value.y, 0),
    width: safeFrameNumber(value.width, 1200),
    height: safeFrameNumber(value.height, 800),
    background,
  }
  return expandFrameToFitNodes(frame, nodes)
}

export function expandFrameToFitNodes(frame: PageFrame, nodes: DiagramNode[], padding = 96): PageFrame {
  const topLevelNodes = nodes.filter((node) => !node.parentId)
  if (!topLevelNodes.length) return { ...frame }

  let left = frame.x
  let top = frame.y
  let right = frame.x + frame.width
  let bottom = frame.y + frame.height

  for (const node of topLevelNodes) {
    const size = nodeDimensions(node)
    const nodeLeft = node.position.x
    const nodeTop = node.position.y
    const nodeRight = node.position.x + size.width
    const nodeBottom = node.position.y + size.height

    if (nodeLeft < left) left = nodeLeft - padding
    if (nodeTop < top) top = nodeTop - padding
    if (nodeRight > right) right = nodeRight + padding
    if (nodeBottom > bottom) bottom = nodeBottom + padding
  }

  return {
    ...frame,
    x: Math.floor(left),
    y: Math.floor(top),
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top),
  }
}

function safeFrameNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
