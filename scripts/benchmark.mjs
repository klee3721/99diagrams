import { performance } from 'node:perf_hooks'

const sizes = [100, 1000, 5000]

function createNode(index) {
  return {
    id: `node-${index}`,
    type: 'diagram',
    position: { x: (index % 40) * 190, y: Math.floor(index / 40) * 110 },
    data: {
      kind: index % 7 === 0 ? 'decision' : 'process',
      label: `Node ${index}`,
      fill: '#dbeafe',
      stroke: '#3b82f6',
      textColor: '#172554',
      layerId: 'default',
    },
  }
}

function createSnapshot(size) {
  const nodes = Array.from({ length: size }, (_, index) => createNode(index))
  const edges = nodes.slice(1).map((node, index) => ({
    id: `edge-${index}`,
    source: nodes[index].id,
    target: node.id,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#64748b' },
  }))

  return { nodes, edges }
}

function scopeSnapshot(snapshot, rootNodeIds) {
  const ids = new Set(rootNodeIds)
  const edges = snapshot.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
  return { nodes: snapshot.nodes.filter((node) => ids.has(node.id)), edges }
}

function buildLayoutGraph(snapshot) {
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '56',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
    },
    children: snapshot.nodes.map((node) => ({ id: node.id, width: 164, height: 64 })),
    edges: snapshot.edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  }
}

function measure(label, fn) {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  return { label, duration, result }
}

console.log('99 Diagrams model benchmark')
console.log('size,create_ms,serialize_ms,scope_20_ms,layout_graph_ms,json_kb')

for (const size of sizes) {
  const created = measure('create', () => createSnapshot(size))
  const snapshot = created.result
  const serialized = measure('serialize', () => JSON.stringify(snapshot))
  const scoped = measure('scope', () => scopeSnapshot(snapshot, snapshot.nodes.slice(0, 20).map((node) => node.id)))
  const graph = measure('layoutGraph', () => buildLayoutGraph(snapshot))

  console.log([
    size,
    created.duration.toFixed(2),
    serialized.duration.toFixed(2),
    scoped.duration.toFixed(2),
    graph.duration.toFixed(2),
    (serialized.result.length / 1024).toFixed(1),
  ].join(','))
}
