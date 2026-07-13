import type { Edge } from '@xyflow/react'
import type { DiagramNode, DiagramSnapshot, NodeKind } from './diagram'

const blockedElementPattern = /<\/?(?:script|iframe|object|embed|link|meta)\b[^>]*>/gi
const eventAttributePattern = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const externalReferencePattern = /\s+(?:href|src|xlink:href)\s*=\s*(["'])(?!(?:#|data:image\/(?:png|jpe?g|webp|gif);base64,|data:font\/|data:application\/font-woff))[^"']*\1/gi
const unsafeStyleUrlPattern = /\s+style\s*=\s*(["'])(?=[^"']*(?:expression\s*\(|url\s*\(\s*(?!(?:["']?#|["']?data:image\/))))[^"']*\1/gi

export type SvgExportOptions = {
  title?: string
  padding?: number
  background?: string
}

type Box = { x: number; y: number; width: number; height: number }

type AnchoredNode = DiagramNode & { absolutePosition: { x: number; y: number }; box: Box }

const endpointMarkerGap = 7

const defaultNodeSize: Record<NodeKind, { width: number; height: number }> = {
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

export function exportSnapshotToSvg(snapshot: DiagramSnapshot, options: SvgExportOptions = {}) {
  const padding = options.padding ?? 40
  const nodes = resolveNodes(snapshot.nodes)
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const graphBox = measureGraph(nodes, snapshot.edges, nodeMap)
  const width = Math.max(320, Math.ceil(graphBox.width + padding * 2))
  const height = Math.max(200, Math.ceil(graphBox.height + padding * 2))
  const offsetX = padding - graphBox.x
  const offsetY = padding - graphBox.y
  const title = options.title ? `<title>${escapeXml(options.title)}</title>` : ''
  const background = options.background ?? '#ffffff'

  const body = [
    renderDefs(snapshot.edges),
    `<rect width="100%" height="100%" fill="${escapeXml(background)}"/>`,
    `<g transform="translate(${round(offsetX)} ${round(offsetY)})">`,
    '<g class="edges">',
    ...snapshot.edges.map((edge) => renderEdge(edge, nodeMap)),
    '</g>',
    '<g class="nodes">',
    ...nodes.map(renderNode),
    '</g>',
    '</g>',
  ].join('')

  return sanitizeSvgText(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">${title}${body}</svg>`)
}

export async function rasterizeSvgToPngDataUrl(svg: string, pixelRatio = 2) {
  const size = readSvgSize(svg)
  const image = await loadSvgImage(svg)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(size.width * pixelRatio))
  canvas.height = Math.max(1, Math.ceil(size.height * pixelRatio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unsupported')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function sanitizeSvgDataUrl(dataUrl: string) {
  const svg = decodeSvgDataUrl(dataUrl)
  const sanitized = sanitizeSvgText(svg)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`
}

export function sanitizeSvgText(svg: string) {
  if (!/<svg[\s>]/i.test(svg)) throw new Error('invalid svg')

  if (typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    return sanitizeSvgWithDom(svg)
  }

  return sanitizeSvgWithRegex(svg)
}

function decodeSvgDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/is)
  if (!match) throw new Error('invalid svg data url')
  if (match[1]) return globalThis.atob(match[2])
  return decodeURIComponent(match[2])
}

function readSvgSize(svg: string) {
  const width = readNumericAttribute(svg, 'width')
  const height = readNumericAttribute(svg, 'height')
  if (width && height) return { width, height }

  const viewBox = svg.match(/\sviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) }
  return { width: 320, height: 200 }
}

function readNumericAttribute(svg: string, attribute: string) {
  const match = svg.match(new RegExp(`\\s${attribute}=["']([\\d.]+)`, 'i'))
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('invalid svg image'))
    }
    image.src = url
  })
}

function sanitizeSvgWithDom(svg: string) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror')) throw new Error('invalid svg')

  document.querySelectorAll('script, iframe, object, embed, link, meta').forEach((node) => node.remove())
  document.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || hasUnsafeReference(name, value) || hasUnsafeStyle(name, value)) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}

function sanitizeSvgWithRegex(svg: string) {
  return svg
    .replace(blockedElementPattern, '')
    .replace(eventAttributePattern, '')
    .replace(externalReferencePattern, '')
    .replace(unsafeStyleUrlPattern, '')
}

function hasUnsafeReference(name: string, value: string) {
  if (name !== 'href' && name !== 'src' && name !== 'xlink:href') return false
  return !/^(?:#|data:image\/(?:png|jpe?g|webp|gif);base64,|data:font\/|data:application\/font-woff)/i.test(value)
}

function hasUnsafeStyle(name: string, value: string) {
  if (name !== 'style') return false
  return /expression\s*\(|url\s*\(\s*(?!(?:["']?#|["']?data:image\/))/i.test(value)
}

function resolveNodes(nodes: DiagramNode[]): AnchoredNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const absoluteCache = new Map<string, { x: number; y: number }>()

  const absolutePosition = (node: DiagramNode): { x: number; y: number } => {
    const cached = absoluteCache.get(node.id)
    if (cached) return cached

    const parent = node.parentId ? byId.get(node.parentId) : undefined
    const parentPosition = parent ? absolutePosition(parent) : { x: 0, y: 0 }
    const value = {
      x: parentPosition.x + node.position.x,
      y: parentPosition.y + node.position.y,
    }
    absoluteCache.set(node.id, value)
    return value
  }

  return nodes
    .map((node) => {
      const position = absolutePosition(node)
      const size = nodeSize(node)
      return {
        ...node,
        absolutePosition: position,
        box: { x: position.x, y: position.y, width: size.width, height: size.height },
      }
    })
    .sort((a, b) => Number(a.zIndex ?? 0) - Number(b.zIndex ?? 0) || nodeDepth(a, byId) - nodeDepth(b, byId) || a.id.localeCompare(b.id))
}

function nodeDepth(node: DiagramNode, nodes: Map<string, DiagramNode>) {
  let depth = 0
  let current = node
  const seen = new Set<string>([node.id])

  while (current.parentId) {
    const parent = nodes.get(current.parentId)
    if (!parent || seen.has(parent.id)) return depth
    depth += 1
    seen.add(parent.id)
    current = parent
  }

  return depth
}

function nodeSize(node: DiagramNode) {
  const style = node.style as Partial<Record<'width' | 'height', string | number>> | undefined
  const fallback = defaultNodeSize[node.data.kind]
  return {
    width: toNumber(style?.width) ?? fallback.width,
    height: toNumber(style?.height) ?? fallback.height,
  }
}

function toNumber(value: string | number | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function measureGraph(nodes: AnchoredNode[], edges: Edge[], nodeMap: Map<string, AnchoredNode>): Box {
  if (nodes.length === 0) return { x: 0, y: 0, width: 240, height: 120 }

  const boxes = nodes.map((node) => node.box)
  for (const edge of edges) {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue
    const a = edge.markerStart ? offsetAnchorPoint(anchorPoint(source, edge.sourceHandle, 'source'), edge.sourceHandle, 'source', endpointMarkerGap) : anchorPoint(source, edge.sourceHandle, 'source')
    const b = edge.markerEnd ? offsetAnchorPoint(anchorPoint(target, edge.targetHandle, 'target'), edge.targetHandle, 'target', endpointMarkerGap) : anchorPoint(target, edge.targetHandle, 'target')
    boxes.push({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) })
  }

  const minX = Math.min(...boxes.map((box) => box.x))
  const minY = Math.min(...boxes.map((box) => box.y))
  const maxX = Math.max(...boxes.map((box) => box.x + box.width))
  const maxY = Math.max(...boxes.map((box) => box.y + box.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function renderDefs(edges: Edge[]) {
  const markers = new Map<string, string>()

  for (const edge of edges) {
    const start = markerId(edge.markerStart, edgeStyle(edge).stroke, 'start')
    const end = markerId(edge.markerEnd, edgeStyle(edge).stroke, 'end')
    if (start) markers.set(start, markerSvg(start, markerColor(edge.markerStart, edgeStyle(edge).stroke), false))
    if (end) markers.set(end, markerSvg(end, markerColor(edge.markerEnd, edgeStyle(edge).stroke), true))
  }

  return `<defs><style>${cssText()}</style>${[...markers.values()].join('')}</defs>`
}

function markerSvg(id: string, color: string, pointsForward: boolean) {
  const points = pointsForward ? '0 0 10 5 0 10 2.5 5' : '10 0 0 5 10 10 7.5 5'
  const refX = pointsForward ? 9.2 : 0.8
  return `<marker id="${id}" viewBox="0 0 10 10" refX="${refX}" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M ${points}" fill="${escapeXml(color)}"/></marker>`
}

function cssText() {
  return [
    '.node-label{font:700 13px Inter,Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}',
    '.node-caption{font:750 11px Inter,Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}',
    '.container-label{font:700 11px Inter,Arial,sans-serif}',
    '.lane-label{font:700 10px Inter,Arial,sans-serif}',
    '.edge-label{font:700 11px Inter,Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}',
  ].join('')
}

function renderEdge(edge: Edge, nodeMap: Map<string, AnchoredNode>) {
  const source = nodeMap.get(edge.source)
  const target = nodeMap.get(edge.target)
  if (!source || !target) return ''

  const rawStart = anchorPoint(source, edge.sourceHandle, 'source')
  const rawEnd = anchorPoint(target, edge.targetHandle, 'target')
  const start = edge.markerStart ? offsetAnchorPoint(rawStart, edge.sourceHandle, 'source', endpointMarkerGap) : rawStart
  const end = edge.markerEnd ? offsetAnchorPoint(rawEnd, edge.targetHandle, 'target', endpointMarkerGap) : rawEnd
  const style = edgeStyle(edge)
  const path = edge.type === 'straight' ? straightPath(start, end) : smoothStepPath(start, end)
  const dash = style.strokeDasharray ? ` stroke-dasharray="${escapeXml(String(style.strokeDasharray))}"` : ''
  const animated = edge.animated ? ' data-animated="true"' : ''
  const markerStart = markerId(edge.markerStart, style.stroke, 'start')
  const markerEnd = markerId(edge.markerEnd, style.stroke, 'end')
  const markerAttributes = [
    markerStart ? ` marker-start="url(#${markerStart})"` : '',
    markerEnd ? ` marker-end="url(#${markerEnd})"` : '',
  ].join('')
  const label = typeof edge.label === 'string' && edge.label.trim()
    ? renderEdgeLabel(edge.label, (start.x + end.x) / 2, (start.y + end.y) / 2)
    : ''

  return `<g id="${escapeXml(edge.id)}" class="edge"${animated}><path d="${path}" fill="none" stroke="${escapeXml(style.stroke)}" stroke-width="${round(style.strokeWidth)}"${dash}${markerAttributes}/>${label}</g>`
}

function renderEdgeLabel(label: string, x: number, y: number) {
  const text = escapeXml(label)
  const width = Math.max(28, label.length * 7 + 14)
  return `<g transform="translate(${round(x)} ${round(y)})"><rect x="${round(-width / 2)}" y="-11" width="${round(width)}" height="22" rx="5" fill="#ffffff" opacity=".92"/><text class="edge-label" fill="#475569">${text}</text></g>`
}

function renderNode(node: AnchoredNode) {
  const { x, y, width, height } = node.box
  const fill = safeColor(node.data.fill)
  const stroke = safeColor(node.data.stroke)
  const textColor = safeColor(node.data.textColor)
  const strokeWidth = 2
  const content = renderNodeShape(node, fill, stroke, textColor, node.data.label)
  return `<g id="${escapeXml(node.id)}" class="node node-${node.data.kind}" transform="translate(${round(x)} ${round(y)})" data-kind="${node.data.kind}" data-layer="${escapeXml(String(node.data.layerId ?? 'default'))}">${content}<rect x="0" y="0" width="${round(width)}" height="${round(height)}" fill="none" stroke="transparent" stroke-width="${strokeWidth}"/></g>`
}

function renderNodeShape(node: AnchoredNode, fill: string, stroke: string, textColor: string, label: string) {
  const { width, height } = node.box
  switch (node.data.kind) {
    case 'start':
      return `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" rx="${round(height / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${centerLabel(label, width, height, textColor)}`
    case 'decision':
      return `<polygon points="${round(width / 2)},0 ${round(width)},${round(height / 2)} ${round(width / 2)},${round(height)} 0,${round(height / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${centerLabel(label, width, height, textColor)}`
    case 'input':
      return `<polygon points="14,0 ${round(width)},0 ${round(width - 14)},${round(height)} 0,${round(height)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${centerLabel(label, width, height, textColor)}`
    case 'document':
      return `<path d="M 0 0 H ${round(width)} V ${round(height - 14)} Q ${round(width * .75)} ${round(height + 6)} ${round(width * .52)} ${round(height - 2)} Q ${round(width * .26)} ${round(height - 12)} 0 ${round(height)} Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${centerLabel(label, width, height - 4, textColor)}`
    case 'database':
      return databaseShape(width, height, fill, stroke) + centerLabel(label, width, height, textColor)
    case 'note':
      return `<path d="M 0 0 H ${round(width)} V ${round(height)} H 0 Z M 0 ${round(height)} L 18 ${round(height - 18)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${wrappedText(label, 12, 22, width - 24, textColor, 'start')}`
    case 'group':
      return renderGroupNode(node, fill, stroke, textColor, label)
    case 'swimlane':
      return renderSwimlaneNode(node, fill, stroke, textColor, label)
    case 'image':
      return renderImageNode(node, fill, stroke, textColor, label)
    default:
      return `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${centerLabel(label, width, height, textColor)}`
  }
}

function databaseShape(width: number, height: number, fill: string, stroke: string) {
  const radius = 14
  return `<path d="M 0 ${radius} C 0 5 ${round(width * .18)} 0 ${round(width / 2)} 0 C ${round(width * .82)} 0 ${round(width)} 5 ${round(width)} ${radius} V ${round(height - radius)} C ${round(width)} ${round(height - 5)} ${round(width * .82)} ${round(height)} ${round(width / 2)} ${round(height)} C ${round(width * .18)} ${round(height)} 0 ${round(height - 5)} 0 ${round(height - radius)} Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><ellipse cx="${round(width / 2)}" cy="${radius}" rx="${round(width / 2)}" ry="${radius}" fill="none" stroke="${stroke}" stroke-width="2"/>`
}

function renderGroupNode(node: AnchoredNode, fill: string, stroke: string, textColor: string, label: string) {
  const { width, height } = node.box
  return `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" rx="8" fill="${fill}" fill-opacity=".7" stroke="${stroke}" stroke-width="2" stroke-dasharray="8 5"/><rect x="0" y="0" width="${round(width)}" height="34" rx="8" fill="${fill}" stroke="none"/><line x1="0" y1="34" x2="${round(width)}" y2="34" stroke="${stroke}" stroke-width="1" stroke-dasharray="5 4" opacity=".6"/><text x="10" y="21" class="container-label" fill="${textColor}">${escapeXml(label)}</text>`
}

function renderSwimlaneNode(node: AnchoredNode, fill: string, stroke: string, textColor: string, label: string) {
  const { width, height } = node.box
  const swimlane = node.data.swimlane ?? { direction: 'horizontal', lanes: ['1'] }
  const lanes = swimlane.lanes.length ? swimlane.lanes : ['1']
  const base = `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  return swimlane.direction === 'vertical'
    ? base + renderVerticalLanes(label, lanes, width, height, fill, stroke, textColor)
    : base + renderHorizontalLanes(label, lanes, width, height, fill, stroke, textColor)
}

function renderHorizontalLanes(label: string, lanes: string[], width: number, height: number, fill: string, stroke: string, textColor: string) {
  const headerHeight = 32
  const laneHeight = (height - headerHeight) / lanes.length
  const rows = lanes.map((lane, index) => {
    const y = headerHeight + laneHeight * index
    return `<line x1="0" y1="${round(y)}" x2="${round(width)}" y2="${round(y)}" stroke="${stroke}" stroke-width="1" opacity=".35"/><text x="9" y="${round(y + 20)}" class="lane-label" fill="${textColor}" opacity=".84">${escapeXml(lane)}</text>`
  }).join('')
  return `<rect x="0" y="0" width="${round(width)}" height="${headerHeight}" rx="8" fill="${fill}" opacity=".76"/><text x="10" y="21" class="container-label" fill="${textColor}">${escapeXml(label)}</text>${rows}`
}

function renderVerticalLanes(label: string, lanes: string[], width: number, height: number, fill: string, stroke: string, textColor: string) {
  const headerWidth = 34
  const laneWidth = (width - headerWidth) / lanes.length
  const columns = lanes.map((lane, index) => {
    const x = headerWidth + laneWidth * index
    return `<line x1="${round(x)}" y1="0" x2="${round(x)}" y2="${round(height)}" stroke="${stroke}" stroke-width="1" opacity=".35"/><text x="${round(x + 9)}" y="20" class="lane-label" fill="${textColor}" opacity=".84">${escapeXml(lane)}</text>`
  }).join('')
  return `<rect x="0" y="0" width="${headerWidth}" height="${round(height)}" rx="8" fill="${fill}" opacity=".76"/><text transform="translate(21 ${round(height / 2)}) rotate(-90)" class="container-label" fill="${textColor}" text-anchor="middle">${escapeXml(label)}</text>${columns}`
}

function renderImageNode(node: AnchoredNode, fill: string, stroke: string, textColor: string, label: string) {
  const { width, height } = node.box
  const imageHeight = Math.max(78, height - 34)
  const image = node.data.imageDataUrl
    ? `<image href="${escapeXml(node.data.imageDataUrl)}" x="8" y="8" width="${round(width - 16)}" height="${round(imageHeight)}" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="8" y="8" width="${round(width - 16)}" height="${round(imageHeight)}" rx="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="5 4"/><text x="${round(width / 2)}" y="${round(8 + imageHeight / 2)}" class="node-caption" fill="#94a3b8">${escapeXml(label)}</text>`
  return `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${image}<text x="${round(width / 2)}" y="${round(height - 13)}" class="node-caption" fill="${textColor}">${escapeXml(label)}</text>`
}

function centerLabel(label: string, width: number, height: number, fill: string) {
  return wrappedText(label, width / 2, height / 2, Math.max(64, width - 28), fill, 'middle')
}

function wrappedText(label: string, x: number, y: number, maxWidth: number, fill: string, anchor: 'middle' | 'start') {
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length * 7 <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length === 0) lines.push('')

  const lineHeight = 16
  const startY = y - ((lines.length - 1) * lineHeight) / 2
  return lines
    .slice(0, 4)
    .map((line, index) => `<text x="${round(x)}" y="${round(startY + index * lineHeight)}" class="node-label" text-anchor="${anchor}" fill="${fill}">${escapeXml(line)}</text>`)
    .join('')
}

function anchorPoint(node: AnchoredNode, handle: string | null | undefined, direction: 'source' | 'target') {
  const { x, y, width, height } = node.box
  const resolved = handle ?? (direction === 'source' ? 'bottom' : 'top')
  if (resolved === 'left') return { x, y: y + height / 2 }
  if (resolved === 'right') return { x: x + width, y: y + height / 2 }
  if (resolved === 'bottom') return { x: x + width / 2, y: y + height }
  return { x: x + width / 2, y }
}

function offsetAnchorPoint(point: { x: number; y: number }, handle: string | null | undefined, direction: 'source' | 'target', gap: number) {
  const resolved = handle ?? (direction === 'source' ? 'bottom' : 'top')
  if (resolved === 'left') return { x: point.x - gap, y: point.y }
  if (resolved === 'right') return { x: point.x + gap, y: point.y }
  if (resolved === 'bottom') return { x: point.x, y: point.y + gap }
  return { x: point.x, y: point.y - gap }
}

function straightPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  return `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`
}

function smoothStepPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const midY = (start.y + end.y) / 2
  if (Math.abs(start.x - end.x) < 8 || start.y <= end.y) {
    return `M ${round(start.x)} ${round(start.y)} C ${round(start.x)} ${round(midY)} ${round(end.x)} ${round(midY)} ${round(end.x)} ${round(end.y)}`
  }

  const midX = (start.x + end.x) / 2
  return `M ${round(start.x)} ${round(start.y)} L ${round(midX)} ${round(start.y)} L ${round(midX)} ${round(end.y)} L ${round(end.x)} ${round(end.y)}`
}

function edgeStyle(edge: Edge) {
  const style = edge.style as Partial<Record<'stroke' | 'strokeWidth' | 'strokeDasharray', string | number>> | undefined
  return {
    stroke: typeof style?.stroke === 'string' ? style.stroke : '#64748b',
    strokeWidth: toNumber(style?.strokeWidth) ?? 2,
    strokeDasharray: style?.strokeDasharray,
  }
}

function markerId(marker: Edge['markerStart'] | Edge['markerEnd'], fallbackColor: string, position: 'start' | 'end') {
  if (!marker || marker === 'none') return ''
  const type = typeof marker === 'string' ? marker : marker.type
  return `${position}-${String(type).replace(/[^a-z0-9_-]/gi, '')}-${markerColor(marker, fallbackColor).replace(/[^a-z0-9]/gi, '')}`
}

function markerColor(marker: Edge['markerStart'] | Edge['markerEnd'], fallbackColor: string) {
  return typeof marker === 'object' && marker && typeof marker.color === 'string' ? marker.color : fallbackColor
}

function safeColor(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value) || value === 'transparent' ? value : '#64748b'
}

function round(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
