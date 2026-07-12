import type { Edge, Node } from '@xyflow/react'

export const nodeKinds = ['start', 'process', 'decision', 'input', 'document', 'database', 'note', 'group', 'swimlane', 'image'] as const

export type NodeKind = typeof nodeKinds[number]

export type SwimlaneData = {
  direction: 'horizontal' | 'vertical'
  lanes: string[]
}

export type DiagramNodeData = {
  label: string
  kind: NodeKind
  fill: string
  stroke: string
  textColor: string
  layerId?: string
  locked?: boolean
  imageDataUrl?: string
  swimlane?: SwimlaneData
}

export type DiagramNode = Node<DiagramNodeData, 'diagram'>
export type DiagramSnapshot = { nodes: DiagramNode[]; edges: Edge[] }
export type SwimlaneMembership = {
  swimlaneId: string
  swimlaneLabel: string
  laneIndex: number
  laneLabel: string
}

export const storageKey = '99draw:document:v1'
export const maxDocumentBytes = 5 * 1024 * 1024
export const maxEmbeddedImageBytes = 2 * 1024 * 1024

export const kindDefaults: Record<NodeKind, Omit<DiagramNodeData, 'label' | 'kind'>> = {
  start: { fill: '#d1fae5', stroke: '#10b981', textColor: '#064e3b' },
  process: { fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' },
  decision: { fill: '#fef3c7', stroke: '#f59e0b', textColor: '#78350f' },
  input: { fill: '#e0f2fe', stroke: '#0ea5e9', textColor: '#0c4a6e' },
  document: { fill: '#fef9c3', stroke: '#ca8a04', textColor: '#713f12' },
  database: { fill: '#ede9fe', stroke: '#7c3aed', textColor: '#4c1d95' },
  note: { fill: '#f3e8ff', stroke: '#a855f7', textColor: '#581c87' },
  group: { fill: '#f8fafc', stroke: '#64748b', textColor: '#334155' },
  swimlane: { fill: '#f0fdfa', stroke: '#14b8a6', textColor: '#134e4a' },
  image: { fill: '#ffffff', stroke: '#94a3b8', textColor: '#334155' },
}

const defaultLabels: Record<NodeKind, string> = {
  start: 'Bắt đầu',
  process: 'Bước xử lý',
  decision: 'Điều kiện?',
  input: 'Dữ liệu vào/ra',
  document: 'Tài liệu',
  database: 'Dữ liệu',
  note: 'Ghi chú',
  group: 'Nhóm',
  swimlane: 'Vai trò',
  image: 'Ảnh',
}

export function createNode(kind: NodeKind, position: { x: number; y: number }, label?: string, id: string = crypto.randomUUID()): DiagramNode {
  return {
    id,
    type: 'diagram',
    position,
    data: { kind, label: label ?? defaultLabels[kind], ...kindDefaults[kind], ...(kind === 'swimlane' ? { swimlane: createDefaultSwimlane() } : {}) },
  }
}

export function createEdge(source: string, target: string, id: string = crypto.randomUUID()): Edge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    animated: false,
    reconnectable: true,
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#64748b' },
    labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
  }
}

export function createStarterDiagram(): DiagramSnapshot {
  const nodes: DiagramNode[] = [
    createNode('start', { x: 310, y: 60 }, 'Bắt đầu', 'start'),
    createNode('process', { x: 300, y: 190 }, 'Nhận yêu cầu', 'process'),
    createNode('decision', { x: 310, y: 335 }, 'Hợp lệ?', 'decision'),
    createNode('process', { x: 80, y: 495 }, 'Yêu cầu bổ sung', 'process-1'),
    createNode('process', { x: 530, y: 495 }, 'Hoàn tất', 'process-2'),
  ]

  return {
    nodes,
    edges: [
      createEdge('start', 'process', 'e-start-process'),
      createEdge('process', 'decision', 'e-process-decision'),
      { ...createEdge('decision', 'process-1', 'e-decision-process-1'), label: 'Không', sourceHandle: 'left', targetHandle: 'top' },
      { ...createEdge('decision', 'process-2', 'e-decision-process-2'), label: 'Có', sourceHandle: 'right', targetHandle: 'top' },
    ],
  }
}

export function cleanNodes(source: DiagramNode[]): DiagramNode[] {
  return source.map(({ selected: _selected, dragging: _dragging, measured: _measured, ...node }) => node)
}

export function cloneSnapshot(snapshot: DiagramSnapshot): DiagramSnapshot {
  return JSON.parse(JSON.stringify({ nodes: cleanNodes(snapshot.nodes), edges: snapshot.edges })) as DiagramSnapshot
}

export function parseDocument(value: unknown): DiagramSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DiagramSnapshot>
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return null

  const nodes = candidate.nodes.filter(isDiagramNode).map((node) => ({
    ...node,
    data: { ...kindDefaults[node.data.kind], ...(node.data.kind === 'swimlane' ? { swimlane: node.data.swimlane ?? createDefaultSwimlane() } : {}), ...node.data },
  }))
  const nodeIds = new Set(nodes.map((node) => node.id))
  if (nodes.some((node) => !hasValidParent(node, nodes, nodeIds))) return null
  const edges = candidate.edges.filter((edge): edge is Edge => isEdge(edge) && nodeIds.has(edge.source) && nodeIds.has(edge.target))

  return nodes.length === candidate.nodes.length ? { nodes, edges } : null
}

export function containerChildCount(containerId: string, nodes: DiagramNode[]) {
  return nodes.filter((node) => node.parentId === containerId).length
}

export function deleteNodes(snapshot: DiagramSnapshot, nodeIds: Iterable<string>): DiagramSnapshot {
  const deleted = collectNodeTreeIds(snapshot.nodes, nodeIds)
  return cloneSnapshot({
    nodes: snapshot.nodes.filter((node) => !deleted.has(node.id)),
    edges: snapshot.edges.filter((edge) => !deleted.has(edge.source) && !deleted.has(edge.target)),
  })
}

export function getSwimlaneMembership(nodeId: string, nodes: DiagramNode[]): SwimlaneMembership | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const node = byId.get(nodeId)
  if (!node) return null

  const swimlane = findAncestorSwimlane(node, byId)
  if (!swimlane) return null

  const swimlaneData = swimlane.data.swimlane ?? createDefaultSwimlane()
  const lanes = swimlaneData.lanes.length ? swimlaneData.lanes : createDefaultSwimlane().lanes
  const swimlanePosition = absoluteNodePosition(swimlane, byId)
  const nodePosition = absoluteNodePosition(node, byId)
  const nodeSize = nodeDimensions(node)
  const swimlaneSize = nodeDimensions(swimlane)
  const center = {
    x: nodePosition.x + nodeSize.width / 2 - swimlanePosition.x,
    y: nodePosition.y + nodeSize.height / 2 - swimlanePosition.y,
  }

  const header = swimlaneData.direction === 'vertical' ? 34 : 32
  const span = swimlaneData.direction === 'vertical'
    ? Math.max(1, swimlaneSize.width - header)
    : Math.max(1, swimlaneSize.height - header)
  const offset = swimlaneData.direction === 'vertical'
    ? center.x - header
    : center.y - header
  const laneIndex = clamp(Math.floor((offset / span) * lanes.length), 0, lanes.length - 1)

  return {
    swimlaneId: swimlane.id,
    swimlaneLabel: swimlane.data.label,
    laneIndex,
    laneLabel: lanes[laneIndex],
  }
}

export function reconcileContainerMembership(snapshot: DiagramSnapshot): DiagramSnapshot {
  let nodes = snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  }))

  for (const node of nodes) {
    if (node.data.kind === 'group' || node.data.kind === 'swimlane') continue

    const byId = new Map(nodes.map((item) => [item.id, item]))
    const absolutePosition = absoluteNodePosition(node, byId)
    const size = nodeDimensions(node)
    const center = {
      x: absolutePosition.x + size.width / 2,
      y: absolutePosition.y + size.height / 2,
    }
    const container = findContainingContainer(node.id, center, nodes)

    if (container?.id === node.parentId) continue
    if (!container && !node.parentId) continue

    const containerPosition = container ? absoluteNodePosition(container, new Map(nodes.map((item) => [item.id, item]))) : { x: 0, y: 0 }
    nodes = nodes.map((item) => {
      if (item.id !== node.id) return item
      if (!container) {
        const { parentId: _parentId, extent: _extent, ...detached } = item
        return { ...detached, position: absolutePosition }
      }
      return {
        ...item,
        parentId: container.id,
        extent: 'parent' as const,
        position: {
          x: absolutePosition.x - containerPosition.x,
          y: absolutePosition.y - containerPosition.y,
        },
      }
    })
  }

  return { nodes, edges: [...snapshot.edges] }
}

export function scopeSnapshot(snapshot: DiagramSnapshot, rootNodeIds: string[]): DiagramSnapshot {
  const ids = new Set<string>()
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]))

  const includeAncestors = (node: DiagramNode) => {
    let current = node
    while (current.parentId) {
      const parent = byId.get(current.parentId)
      if (!parent || ids.has(parent.id)) return
      ids.add(parent.id)
      current = parent
    }
  }

  const includeDescendants = (containerId: string) => {
    snapshot.nodes.forEach((node) => {
      if (node.parentId === containerId && !ids.has(node.id)) {
        ids.add(node.id)
        includeDescendants(node.id)
      }
    })
  }

  rootNodeIds.forEach((id) => {
    const node = byId.get(id)
    if (!node) return
    ids.add(node.id)
    includeAncestors(node)
    if (node.data.kind === 'group' || node.data.kind === 'swimlane') includeDescendants(node.id)
  })

  const nodes = snapshot.nodes.filter((node) => ids.has(node.id)).map((node) => {
    if (!node.parentId || ids.has(node.parentId)) return node
    const { parentId: _parentId, extent: _extent, ...detached } = node
    return detached
  })
  const edges = snapshot.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
  return cloneSnapshot({ nodes, edges })
}

function collectNodeTreeIds(nodes: DiagramNode[], nodeIds: Iterable<string>) {
  const deleted = new Set(nodeIds)
  let changed = true

  while (changed) {
    changed = false
    for (const node of nodes) {
      if (node.parentId && deleted.has(node.parentId) && !deleted.has(node.id)) {
        deleted.add(node.id)
        changed = true
      }
    }
  }

  return deleted
}

function findContainingContainer(nodeId: string, point: { x: number; y: number }, nodes: DiagramNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const containers = nodes
    .filter((node) => node.id !== nodeId && (node.data.kind === 'group' || node.data.kind === 'swimlane'))
    .map((node) => {
      const position = absoluteNodePosition(node, byId)
      const size = nodeDimensions(node)
      return { node, position, size, area: size.width * size.height }
    })
    .filter(({ position, size }) => (
      point.x >= position.x
      && point.x <= position.x + size.width
      && point.y >= position.y
      && point.y <= position.y + size.height
    ))
    .sort((a, b) => {
      if (a.area !== b.area) return a.area - b.area
      return (b.node.zIndex ?? 0) - (a.node.zIndex ?? 0)
    })

  return containers[0]?.node ?? null
}

function findAncestorSwimlane(node: DiagramNode, nodes: Map<string, DiagramNode>) {
  let current = node
  const seen = new Set<string>([node.id])

  while (current.parentId) {
    const parent = nodes.get(current.parentId)
    if (!parent || seen.has(parent.id)) return null
    if (parent.data.kind === 'swimlane') return parent
    seen.add(parent.id)
    current = parent
  }

  return null
}

function absoluteNodePosition(node: DiagramNode, nodes: Map<string, DiagramNode>) {
  let x = node.position.x
  let y = node.position.y
  let current = node
  const seen = new Set<string>([node.id])

  while (current.parentId) {
    const parent = nodes.get(current.parentId)
    if (!parent || seen.has(parent.id)) break
    x += parent.position.x
    y += parent.position.y
    seen.add(parent.id)
    current = parent
  }

  return { x, y }
}

function nodeDimensions(node: DiagramNode) {
  const style = node.style as Partial<Record<'width' | 'height', number | string>> | undefined
  const measured = node.measured as Partial<Record<'width' | 'height', number>> | undefined
  return {
    width: toSafeNumber(style?.width) ?? toSafeNumber(measured?.width) ?? defaultNodeDimensions[node.data.kind].width,
    height: toSafeNumber(style?.height) ?? toSafeNumber(measured?.height) ?? defaultNodeDimensions[node.data.kind].height,
  }
}

function toSafeNumber(value: number | string | undefined) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createDefaultSwimlane(): SwimlaneData {
  return { direction: 'horizontal', lanes: ['Lane 1', 'Lane 2', 'Lane 3'] }
}

const defaultNodeDimensions: Record<NodeKind, { width: number; height: number }> = {
  start: { width: 164, height: 64 },
  process: { width: 164, height: 64 },
  decision: { width: 138, height: 92 },
  input: { width: 164, height: 64 },
  document: { width: 164, height: 64 },
  database: { width: 164, height: 64 },
  note: { width: 174, height: 78 },
  group: { width: 210, height: 120 },
  swimlane: { width: 260, height: 150 },
  image: { width: 190, height: 136 },
}

function isDiagramNode(value: unknown): value is DiagramNode {
  if (!value || typeof value !== 'object') return false
  const node = value as Partial<DiagramNode>
  const data = node.data as Partial<DiagramNodeData> | undefined
  return typeof node.id === 'string'
    && node.type === 'diagram'
    && !!node.position
    && Number.isFinite(node.position.x)
    && Number.isFinite(node.position.y)
    && !!data
    && typeof data.label === 'string' && data.label.length <= 5000
    && isNodeKind(data.kind)
    && isSafeColor(data.fill)
    && isSafeColor(data.stroke)
    && isSafeColor(data.textColor)
    && (data.imageDataUrl === undefined || isSafeImageDataUrl(data.imageDataUrl))
    && (data.swimlane === undefined || isSafeSwimlaneData(data.swimlane))
}

function isEdge(value: unknown): value is Edge {
  if (!value || typeof value !== 'object') return false
  const edge = value as Partial<Edge>
  return typeof edge.id === 'string' && typeof edge.source === 'string' && typeof edge.target === 'string'
}

function isNodeKind(value: unknown): value is NodeKind {
  return nodeKinds.includes(value as NodeKind)
}

function isSafeColor(value: unknown): value is string {
  return typeof value === 'string' && (/^#[0-9a-f]{3,8}$/i.test(value) || value === 'transparent')
}

function isSafeImageDataUrl(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= Math.ceil(maxEmbeddedImageBytes * 1.38) + 80
    && /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/]+={0,2}$/i.test(value)
}

function hasValidParent(node: DiagramNode, nodes: DiagramNode[], nodeIds: Set<string>) {
  if (!node.parentId) return true
  if (node.parentId === node.id || !nodeIds.has(node.parentId)) return false
  const parent = nodes.find((item) => item.id === node.parentId)
  if (!parent || (parent.data.kind !== 'group' && parent.data.kind !== 'swimlane')) return false

  const seen = new Set<string>([node.id])
  let current = parent
  while (current.parentId) {
    if (seen.has(current.parentId)) return false
    seen.add(current.id)
    const next = nodes.find((item) => item.id === current.parentId)
    if (!next) return false
    current = next
  }
  return true
}

function isSafeSwimlaneData(value: unknown): value is SwimlaneData {
  if (!value || typeof value !== 'object') return false
  const swimlane = value as Partial<SwimlaneData>
  return (swimlane.direction === 'horizontal' || swimlane.direction === 'vertical')
    && Array.isArray(swimlane.lanes)
    && swimlane.lanes.length >= 1
    && swimlane.lanes.length <= 12
    && swimlane.lanes.every((lane) => typeof lane === 'string' && lane.length > 0 && lane.length <= 80)
}
