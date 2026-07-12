import type { Edge } from '@xyflow/react'
import type { DiagramNode } from './diagram'

export type LayoutDirection = 'DOWN' | 'RIGHT'

export type LayoutGraph = {
  id: 'root'
  layoutOptions: Record<string, string>
  children: Array<{ id: string; width: number; height: number }>
  edges: Array<{ id: string; sources: string[]; targets: string[] }>
}

export type LayoutPosition = { id: string; x: number; y: number }

export function buildElkGraph(nodes: DiagramNode[], edges: Edge[], direction: LayoutDirection): LayoutGraph {
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '56',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? node.width ?? 164,
      height: node.measured?.height ?? node.height ?? 64,
    })),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  }
}

export function extractLayoutPositions(layout: { children?: Array<{ id?: string; x?: number; y?: number }> }): LayoutPosition[] {
  return layout.children?.flatMap((node) => typeof node.id === 'string'
    ? [{ id: node.id, x: node.x ?? 0, y: node.y ?? 0 }]
    : []) ?? []
}

export function applyLayoutPositions(nodes: DiagramNode[], positions: LayoutPosition[]): DiagramNode[] {
  const byId = new Map(positions.map((position) => [position.id, position]))
  return nodes.map((node) => {
    const position = byId.get(node.id)
    return position ? { ...node, position: { x: position.x, y: position.y } } : node
  })
}

export function runLayoutWorker(nodes: DiagramNode[], edges: Edge[], direction: LayoutDirection, timeoutMs = 120_000): Promise<LayoutPosition[]> {
  const graph = buildElkGraph(nodes, edges, direction)

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('layout timeout'))
    }, timeoutMs)

    runElkLayout(graph)
      .then((positions) => {
        window.clearTimeout(timeout)
        resolve(positions)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeout)
        if (nodes.length >= 2000) {
          console.warn('ELK layout failed for a large graph; using grid fallback.', error)
          resolve(buildGridFallbackLayout(nodes, direction))
        } else {
          reject(error)
        }
      })
  })
}

export function buildGridFallbackLayout(nodes: DiagramNode[], direction: LayoutDirection): LayoutPosition[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const nodeWidth = 220
  const nodeHeight = 140

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    return direction === 'RIGHT'
      ? { id: node.id, x: row * nodeWidth, y: column * nodeHeight }
      : { id: node.id, x: column * nodeWidth, y: row * nodeHeight }
  })
}

async function runElkLayout(graph: LayoutGraph): Promise<LayoutPosition[]> {
  const [apiModule] = await Promise.all([
    import('elkjs/lib/elk-api.js'),
    import('elkjs/lib/elk-worker.min.js?url'),
  ])
  const ELK = apiModule.default
  const workerUrl = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href
  const elk = new ELK({ workerUrl })

  try {
    return extractLayoutPositions(await elk.layout(graph))
  } finally {
    elk.terminateWorker()
  }
}
