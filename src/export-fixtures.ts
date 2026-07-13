import { createEdge, createNode, type DiagramSnapshot, type NodeKind } from './diagram'
import { createDocumentFromSnapshot, type DiagramLayer } from './document'

export type ExportFixture = {
  id: string
  name: string
  snapshot: DiagramSnapshot
  layers?: DiagramLayer[]
}

const defaultLayers: DiagramLayer[] = [{ id: 'default', name: 'Default', visible: true, locked: false }]
const systemLayers: DiagramLayer[] = [
  { id: 'client', name: 'Client', visible: true, locked: false },
  { id: 'service', name: 'Service', visible: true, locked: false },
  { id: 'data', name: 'Data', visible: true, locked: false },
]

function node(id: string, kind: NodeKind, label: string, x: number, y: number, layerId = 'default') {
  const base = createNode(kind, { x, y }, label, id)
  return { ...base, data: { ...base.data, layerId } }
}

function linear(id: string, labels: string[], kinds: NodeKind[] = []): DiagramSnapshot {
  const nodes = labels.map((label, index) => node(`${id}-node-${index}`, kinds[index] ?? 'process', label, 120, 80 + index * 120))
  return { nodes, edges: nodes.slice(1).map((item, index) => createEdge(nodes[index].id, item.id, `${id}-edge-${index}`)) }
}

function diamondFlow(id: string): DiagramSnapshot {
  const nodes = [
    node(`${id}-start`, 'start', 'Start', 240, 40),
    node(`${id}-decision`, 'decision', 'Ready?', 250, 170),
    node(`${id}-yes`, 'process', 'Ship', 500, 320),
    node(`${id}-no`, 'process', 'Revise', 40, 320),
    node(`${id}-end`, 'start', 'Done', 250, 500),
  ]
  return {
    nodes,
    edges: [
      createEdge(nodes[0].id, nodes[1].id, `${id}-edge-start`),
      { ...createEdge(nodes[1].id, nodes[2].id, `${id}-edge-yes`), label: 'Yes', sourceHandle: 'right', targetHandle: 'top' },
      { ...createEdge(nodes[1].id, nodes[3].id, `${id}-edge-no`), label: 'No', sourceHandle: 'left', targetHandle: 'top' },
      createEdge(nodes[2].id, nodes[4].id, `${id}-edge-done-yes`),
      createEdge(nodes[3].id, nodes[4].id, `${id}-edge-done-no`),
    ],
  }
}

function styledEdges(id: string): DiagramSnapshot {
  const nodes = [
    node(`${id}-a`, 'process', 'A', 80, 120),
    node(`${id}-b`, 'process', 'B', 340, 120),
    node(`${id}-c`, 'process', 'C', 600, 120),
  ]
  return {
    nodes,
    edges: [
      { ...createEdge(nodes[0].id, nodes[1].id, `${id}-straight`), type: 'straight', label: 'straight', style: { stroke: '#0ea5e9', strokeWidth: 3, strokeDasharray: '6 4' }, animated: true },
      { ...createEdge(nodes[1].id, nodes[2].id, `${id}-curved`), type: 'default', label: 'curved', style: { stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '2 3' }, markerEnd: undefined },
    ],
  }
}

function grouped(id: string): DiagramSnapshot {
  const group = { ...node(`${id}-group`, 'group', 'Processing group', 60, 60), style: { width: 520, height: 260 }, zIndex: -1 }
  const a = { ...node(`${id}-a`, 'process', 'Validate', 40, 70), parentId: group.id, extent: 'parent' as const }
  const b = { ...node(`${id}-b`, 'process', 'Transform', 280, 70), parentId: group.id, extent: 'parent' as const }
  return { nodes: [group, a, b], edges: [createEdge(a.id, b.id, `${id}-edge`)] }
}

function swimlane(id: string, direction: 'horizontal' | 'vertical' = 'vertical'): DiagramSnapshot {
  const lane = node(`${id}-lane`, 'swimlane', 'Fulfillment', 40, 60)
  lane.data.swimlane = { direction, lanes: ['Sales', 'Ops', 'Finance'] }
  const request = { ...node(`${id}-request`, 'document', 'Order', 90, 60), parentId: lane.id, extent: 'parent' as const }
  const charge = { ...node(`${id}-charge`, 'process', 'Charge', 260, 60), parentId: lane.id, extent: 'parent' as const }
  const ship = { ...node(`${id}-ship`, 'process', 'Ship', 430, 60), parentId: lane.id, extent: 'parent' as const }
  return { nodes: [lane, request, charge, ship], edges: [createEdge(request.id, charge.id, `${id}-edge-1`), createEdge(charge.id, ship.id, `${id}-edge-2`)] }
}

function architecture(id: string): ExportFixture {
  const nodes = [
    node(`${id}-client`, 'input', 'Client', 80, 120, 'client'),
    node(`${id}-api`, 'process', 'API', 330, 120, 'service'),
    node(`${id}-worker`, 'process', 'Worker', 330, 300, 'service'),
    node(`${id}-db`, 'database', 'Postgres', 610, 210, 'data'),
  ]
  return {
    id,
    name: 'Architecture map',
    layers: systemLayers,
    snapshot: {
      nodes,
      edges: [
        createEdge(nodes[0].id, nodes[1].id, `${id}-edge-client-api`),
        createEdge(nodes[1].id, nodes[2].id, `${id}-edge-api-worker`),
        createEdge(nodes[2].id, nodes[3].id, `${id}-edge-worker-db`),
      ],
    },
  }
}

function imageFixture(id: string): DiagramSnapshot {
  const image = node(`${id}-image`, 'image', 'Embedded logo', 120, 80)
  image.data.imageDataUrl = 'data:image/png;base64,iVBORw0KGgo='
  return { nodes: [image, node(`${id}-note`, 'note', 'Logo is embedded in the .99diagrams file', 380, 100)], edges: [createEdge(image.id, `${id}-note`, `${id}-edge`)] }
}

export const exportFixtures: ExportFixture[] = [
  { id: 'blank', name: 'Blank', snapshot: { nodes: [], edges: [] }, layers: defaultLayers },
  { id: 'basic-flow', name: 'Basic flow', snapshot: linear('fixture-basic', ['Start', 'Process', 'Done'], ['start', 'process', 'start']), layers: defaultLayers },
  { id: 'decision-flow', name: 'Decision flow', snapshot: diamondFlow('fixture-decision'), layers: defaultLayers },
  { id: 'approval', name: 'Approval', snapshot: linear('fixture-approval', ['Submit', 'Review', 'Approved?', 'Notify'], ['start', 'process', 'decision', 'document']), layers: defaultLayers },
  { id: 'incident', name: 'Incident', snapshot: linear('fixture-incident', ['Detect', 'Classify', 'Mitigate', 'Postmortem'], ['start', 'decision', 'process', 'document']), layers: defaultLayers },
  { id: 'order', name: 'Order processing', snapshot: linear('fixture-order', ['Order', 'Paid?', 'Pack', 'Ship'], ['start', 'decision', 'process', 'process']), layers: defaultLayers },
  { id: 'research', name: 'Research', snapshot: linear('fixture-research', ['Hypothesis', 'Dataset', 'Analyze', 'Conclusion'], ['note', 'database', 'process', 'document']), layers: defaultLayers },
  { id: 'cicd', name: 'CI/CD', snapshot: linear('fixture-cicd', ['Push', 'Build', 'Test', 'Deploy'], ['start', 'process', 'decision', 'process']), layers: defaultLayers },
  { id: 'support', name: 'Support', snapshot: linear('fixture-support', ['Ticket', 'Triage', 'Resolve', 'Close'], ['document', 'decision', 'process', 'start']), layers: defaultLayers },
  { id: 'retro', name: 'Retrospective', snapshot: linear('fixture-retro', ['Collect', 'Group', 'Choose', 'Track'], ['note', 'group', 'decision', 'document']), layers: defaultLayers },
  { id: 'styled-edges', name: 'Styled edges', snapshot: styledEdges('fixture-style'), layers: defaultLayers },
  { id: 'grouped', name: 'Grouped nodes', snapshot: grouped('fixture-group'), layers: defaultLayers },
  { id: 'swimlane', name: 'Swimlane process', snapshot: swimlane('fixture-swimlane'), layers: defaultLayers },
  architecture('architecture'),
  { id: 'image', name: 'Image node', snapshot: imageFixture('fixture-image'), layers: defaultLayers },
  { id: 'database-flow', name: 'Database flow', snapshot: linear('fixture-db', ['Input', 'Normalize', 'Store'], ['input', 'process', 'database']), layers: defaultLayers },
  { id: 'document-flow', name: 'Document flow', snapshot: linear('fixture-doc', ['Draft', 'Review', 'Publish'], ['document', 'decision', 'document']), layers: defaultLayers },
  { id: 'notes', name: 'Notes', snapshot: linear('fixture-notes', ['Idea', 'Decision', 'Follow up'], ['note', 'decision', 'note']), layers: defaultLayers },
  { id: 'horizontal-swimlane', name: 'Horizontal swimlane', snapshot: swimlane('fixture-swimlane-horizontal', 'horizontal'), layers: defaultLayers },
  { id: 'wide-architecture', name: 'Wide architecture', snapshot: architecture('fixture-wide').snapshot, layers: systemLayers },
]

export function createFixtureDocument(fixture: ExportFixture) {
  return createDocumentFromSnapshot(fixture.name, fixture.snapshot, {
    id: `fixture-doc-${fixture.id}`,
    pageId: `fixture-page-${fixture.id}`,
    pageName: fixture.name,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    layers: fixture.layers ?? defaultLayers,
  })
}
