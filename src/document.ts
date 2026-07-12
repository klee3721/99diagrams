import type { Edge } from '@xyflow/react'
import {
  cloneSnapshot,
  createStarterDiagram,
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

export type DiagramPage = DiagramSnapshot & {
  id: string
  name: string
  layers: DiagramLayer[]
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
  return {
    id: crypto.randomUUID(),
    name,
    ...cloneSnapshot(snapshot),
    layers: [createLayer(layerName)],
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
  return layers.length === candidate.layers.length && layers.length > 0 ? { id: candidate.id, name: candidate.name, ...snapshot, layers } : null
}

function isLayer(value: unknown): value is DiagramLayer {
  if (!value || typeof value !== 'object') return false
  const layer = value as Partial<DiagramLayer>
  return typeof layer.id === 'string' && typeof layer.name === 'string' && typeof layer.visible === 'boolean' && typeof layer.locked === 'boolean'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}
