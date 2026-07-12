import { createEdge, createNode, type DiagramSnapshot, type NodeKind } from './diagram'

const declaration = /^(?<from>[\w-]+)(?<fromShape>[\[\{\(].*?[\]\}\)])?\s*-->(?:\|(?<label>[^|]+)\|)?\s*(?<to>[\w-]+)(?<toShape>[\[\{\(].*?[\]\}\)])?$/

export function parseMermaidFlowchart(source: string): DiagramSnapshot | null {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.some((line) => /^flowchart\s+(TD|TB|LR|RL)/i.test(line))) return null
  const nodes = new Map<string, ReturnType<typeof createNode>>()
  const edges: ReturnType<typeof createEdge>[] = []

  for (const line of lines.filter((line) => !/^flowchart\s+/i.test(line) && !line.startsWith('%%'))) {
    const match = line.match(declaration)
    if (!match?.groups) continue
    const from = makeNode(match.groups.from, match.groups.fromShape, nodes.size)
    if (!nodes.has(from.id)) nodes.set(from.id, from)
    const to = makeNode(match.groups.to, match.groups.toShape, nodes.size)
    if (!nodes.has(to.id)) nodes.set(to.id, to)
    edges.push({ ...createEdge(from.id, to.id), label: match.groups.label?.trim() })
  }

  return nodes.size ? { nodes: [...nodes.values()], edges } : null
}

function makeNode(id: string, shape: string | undefined, index: number) {
  const label = shape?.slice(1, -1) || id
  const kind: NodeKind = shape?.startsWith('{') ? 'decision' : shape?.startsWith('(') ? 'start' : 'process'
  return createNode(kind, { x: 120 + (index % 4) * 220, y: 90 + Math.floor(index / 4) * 130 }, label, id)
}
