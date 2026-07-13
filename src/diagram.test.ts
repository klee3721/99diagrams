import { describe, expect, it } from 'vitest'
import { cleanNodes, containerChildCount, createEdge, createNode, createStarterDiagram, deleteNodes, getSwimlaneMembership, nodeKinds, parseDocument, reconcileContainerMembership, scopeSnapshot } from './diagram'

describe('diagram model', () => {
  it('creates a valid starter flow with connected edges', () => {
    const document = createStarterDiagram()
    const ids = new Set(document.nodes.map((node) => node.id))

    expect(document.nodes).toHaveLength(5)
    expect(document.edges).toHaveLength(4)
    expect(document.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
    expect(document.nodes.map((node) => node.data.label)).toContain('Start')
  })

  it('localizes the starter flow when requested', () => {
    const document = createStarterDiagram('vi')

    expect(document.nodes.map((node) => node.data.label)).toContain('Bắt đầu')
    expect(document.edges.map((edge) => edge.label)).toContain('Có')
  })

  it('strips transient React Flow state before persisting', () => {
    const node = { ...createNode('process', { x: 12, y: 18 }, 'X'), selected: true, dragging: true, measured: { width: 120, height: 50 } }
    const cleaned = cleanNodes([node])

    expect(cleaned[0]).not.toHaveProperty('selected')
    expect(cleaned[0]).not.toHaveProperty('dragging')
    expect(cleaned[0]).not.toHaveProperty('measured')
  })

  it('rejects malformed nodes and removes dangling edges', () => {
    const node = createNode('process', { x: 0, y: 0 }, 'Đúng', 'node-1')
    const valid = parseDocument({ nodes: [node], edges: [createEdge('node-1', 'missing', 'edge-1')] })
    const invalid = parseDocument({ nodes: [{ id: 'bad', type: 'diagram' }], edges: [] })

    expect(valid).toEqual({ nodes: [node], edges: [] })
    expect(invalid).toBeNull()
  })

  it('rejects unsafe style values in imported node data', () => {
    const node = createNode('process', { x: 0, y: 0 }, 'X', 'node-1')
    node.data.fill = 'url(javascript:alert(1))'

    expect(parseDocument({ nodes: [node], edges: [] })).toBeNull()
  })

  it('keeps safe embedded image data and rejects external image URLs', () => {
    const safe = createNode('image', { x: 0, y: 0 }, 'Logo', 'image-1')
    safe.data.imageDataUrl = 'data:image/png;base64,iVBORw0KGgo='
    const unsafe = createNode('image', { x: 0, y: 0 }, 'Remote', 'image-2')
    unsafe.data.imageDataUrl = 'https://example.com/logo.png'

    expect(parseDocument({ nodes: [safe], edges: [] })?.nodes[0].data.imageDataUrl).toBe(safe.data.imageDataUrl)
    expect(parseDocument({ nodes: [unsafe], edges: [] })).toBeNull()
  })

  it('round-trips every node kind fixture', () => {
    const nodes = nodeKinds.map((kind, index) => {
      const node = createNode(kind, { x: index * 20, y: index * 16 }, `${kind} fixture`, `node-${kind}`)
      if (kind === 'image') node.data.imageDataUrl = 'data:image/webp;base64,UklGRg=='
      if (kind === 'swimlane') node.data.swimlane = { direction: 'vertical', lanes: ['API', 'Worker', 'DB'] }
      return node
    })

    const parsed = parseDocument({ nodes, edges: [] })

    expect(parsed?.nodes.map((node) => node.data.kind)).toEqual(nodeKinds)
    expect(parsed?.nodes.find((node) => node.data.kind === 'swimlane')?.data.swimlane).toEqual({ direction: 'vertical', lanes: ['API', 'Worker', 'DB'] })
  })

  it('round-trips common edge style fixtures', () => {
    const source = createNode('process', { x: 0, y: 0 }, 'A', 'a')
    const target = createNode('process', { x: 140, y: 0 }, 'B', 'b')
    const edges = [
      { ...createEdge('a', 'b', 'edge-straight'), type: 'straight', label: 'Có', style: { stroke: '#0ea5e9', strokeWidth: 3, strokeDasharray: '6 4' }, animated: true },
      { ...createEdge('a', 'b', 'edge-curved'), type: 'default', markerEnd: undefined, style: { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '2 3' } },
      createEdge('a', 'missing', 'edge-dangling'),
    ]

    const parsed = parseDocument({ nodes: [source, target], edges })

    expect(parsed?.edges).toHaveLength(2)
    expect(parsed?.edges[0]).toMatchObject({ id: 'edge-straight', type: 'straight', label: 'Có', animated: true })
    expect(parsed?.edges[0].markerStart).toBeUndefined()
    expect(parsed?.edges[0].markerEnd).toMatchObject({ type: 'arrowclosed', color: '#64748b' })
    expect(parsed?.edges[1]).toMatchObject({ id: 'edge-curved', type: 'default' })
  })

  it('validates group and swimlane parent semantics', () => {
    const group = createNode('group', { x: 0, y: 0 }, 'Group', 'group')
    const child = { ...createNode('process', { x: 20, y: 24 }, 'Child', 'child'), parentId: 'group', extent: 'parent' as const }
    const orphan = { ...createNode('process', { x: 0, y: 0 }, 'Orphan', 'orphan'), parentId: 'missing' }
    const nonContainerParent = createNode('process', { x: 0, y: 0 }, 'Not container', 'plain')
    const badChild = { ...createNode('process', { x: 10, y: 10 }, 'Bad child', 'bad-child'), parentId: 'plain' }

    const parsed = parseDocument({ nodes: [group, child], edges: [] })

    expect(parsed?.nodes).toHaveLength(2)
    expect(containerChildCount('group', parsed!.nodes)).toBe(1)
    expect(parseDocument({ nodes: [orphan], edges: [] })).toBeNull()
    expect(parseDocument({ nodes: [nonContainerParent, badChild], edges: [] })).toBeNull()
  })

  it('scopes selected containers with descendants and selected children with ancestors', () => {
    const group = createNode('group', { x: 0, y: 0 }, 'Group', 'group')
    const child = { ...createNode('process', { x: 20, y: 20 }, 'Child', 'child'), parentId: 'group', extent: 'parent' as const }
    const sibling = { ...createNode('process', { x: 40, y: 80 }, 'Sibling', 'sibling'), parentId: 'group', extent: 'parent' as const }
    const outside = createNode('process', { x: 260, y: 80 }, 'Outside', 'outside')
    const snapshot = { nodes: [group, child, sibling, outside], edges: [createEdge('child', 'sibling', 'inside'), createEdge('child', 'outside', 'cross')] }

    const groupScope = scopeSnapshot(snapshot, ['group'])
    const childScope = scopeSnapshot(snapshot, ['child'])

    expect(groupScope.nodes.map((node) => node.id)).toEqual(['group', 'child', 'sibling'])
    expect(groupScope.edges.map((edge) => edge.id)).toEqual(['inside'])
    expect(childScope.nodes.map((node) => node.id)).toEqual(['group', 'child'])
    expect(childScope.nodes.find((node) => node.id === 'child')?.parentId).toBe('group')
    expect(childScope.edges).toEqual([])
  })

  it('deletes containers with all descendants and connected edges', () => {
    const swimlane = createNode('swimlane', { x: 0, y: 0 }, 'Lane', 'swimlane')
    const group = { ...createNode('group', { x: 20, y: 20 }, 'Group', 'group'), parentId: 'swimlane', extent: 'parent' as const }
    const child = { ...createNode('process', { x: 12, y: 16 }, 'Child', 'child'), parentId: 'group', extent: 'parent' as const }
    const outside = createNode('process', { x: 320, y: 120 }, 'Outside', 'outside')

    const next = deleteNodes({
      nodes: [swimlane, group, child, outside],
      edges: [
        createEdge('child', 'outside', 'cross'),
        createEdge('outside', 'child', 'back'),
      ],
    }, ['swimlane'])

    expect(next.nodes.map((node) => node.id)).toEqual(['outside'])
    expect(next.edges).toEqual([])
    expect(parseDocument(next)?.nodes.map((node) => node.id)).toEqual(['outside'])
  })

  it('derives swimlane membership from child geometry', () => {
    const horizontal = { ...createNode('swimlane', { x: 0, y: 0 }, 'Workflow', 'horizontal'), style: { width: 360, height: 240 } }
    horizontal.data.swimlane = { direction: 'horizontal', lanes: ['Sales', 'Ops', 'Finance'] }
    const sales = { ...createNode('process', { x: 40, y: 42 }, 'Lead', 'sales'), parentId: horizontal.id, extent: 'parent' as const }
    const finance = { ...createNode('process', { x: 40, y: 170 }, 'Invoice', 'finance'), parentId: horizontal.id, extent: 'parent' as const }

    const vertical = { ...createNode('swimlane', { x: 0, y: 0 }, 'Delivery', 'vertical'), style: { width: 420, height: 180 } }
    vertical.data.swimlane = { direction: 'vertical', lanes: ['Design', 'Build', 'Run'] }
    const group = { ...createNode('group', { x: 150, y: 20 }, 'Nested', 'nested-group'), parentId: vertical.id, extent: 'parent' as const }
    const nested = { ...createNode('process', { x: 20, y: 24 }, 'Worker', 'nested-child'), parentId: group.id, extent: 'parent' as const }

    expect(getSwimlaneMembership('sales', [horizontal, sales, finance])).toMatchObject({ swimlaneId: 'horizontal', laneIndex: 0, laneLabel: 'Sales' })
    expect(getSwimlaneMembership('finance', [horizontal, sales, finance])).toMatchObject({ swimlaneId: 'horizontal', laneIndex: 2, laneLabel: 'Finance' })
    expect(getSwimlaneMembership('nested-child', [vertical, group, nested])).toMatchObject({ swimlaneId: 'vertical', laneIndex: 1, laneLabel: 'Build' })
    expect(getSwimlaneMembership('vertical', [vertical, group, nested])).toBeNull()
  })

  it('reparents nodes into the smallest containing group or swimlane by geometry', () => {
    const swimlane = { ...createNode('swimlane', { x: 20, y: 20 }, 'Workflow', 'swimlane'), style: { width: 460, height: 260 } }
    const group = { ...createNode('group', { x: 120, y: 70 }, 'Nested group', 'group'), parentId: 'swimlane', extent: 'parent' as const, style: { width: 220, height: 140 } }
    const loose = createNode('process', { x: 180, y: 120 }, 'Loose', 'loose')

    const next = reconcileContainerMembership({ nodes: [swimlane, group, loose], edges: [createEdge('loose', 'group', 'edge')] })
    const reparented = next.nodes.find((node) => node.id === 'loose')

    expect(reparented).toMatchObject({
      parentId: 'group',
      extent: 'parent',
      position: { x: 40, y: 30 },
    })
    expect(next.edges.map((edge) => edge.id)).toEqual(['edge'])
    expect(parseDocument(next)?.nodes.find((node) => node.id === 'loose')?.parentId).toBe('group')
  })

  it('detaches child nodes that are moved outside their container while preserving absolute position', () => {
    const group = { ...createNode('group', { x: 100, y: 80 }, 'Group', 'group'), style: { width: 180, height: 120 } }
    const child = { ...createNode('process', { x: 260, y: 20 }, 'Child', 'child'), parentId: 'group', extent: 'parent' as const }

    const next = reconcileContainerMembership({ nodes: [group, child], edges: [] })
    const detached = next.nodes.find((node) => node.id === 'child')

    expect(detached?.parentId).toBeUndefined()
    expect(detached?.extent).toBeUndefined()
    expect(detached?.position).toEqual({ x: 360, y: 100 })
    expect(parseDocument(next)?.nodes.find((node) => node.id === 'child')?.parentId).toBeUndefined()
  })

  it('reparents child nodes between sibling containers while preserving absolute position', () => {
    const first = { ...createNode('group', { x: 40, y: 40 }, 'First', 'first'), style: { width: 180, height: 130 } }
    const second = { ...createNode('group', { x: 300, y: 40 }, 'Second', 'second'), style: { width: 220, height: 150 } }
    const child = { ...createNode('process', { x: 300, y: 30 }, 'Child', 'child'), parentId: 'first', extent: 'parent' as const }

    const next = reconcileContainerMembership({ nodes: [first, second, child], edges: [createEdge('child', 'second', 'edge')] })
    const reparented = next.nodes.find((node) => node.id === 'child')

    expect(reparented).toMatchObject({
      parentId: 'second',
      extent: 'parent',
      position: { x: 40, y: 30 },
    })
    expect(next.edges.map((edge) => edge.id)).toEqual(['edge'])
    expect(parseDocument(next)?.nodes.find((node) => node.id === 'child')?.parentId).toBe('second')
  })

  it('moves child nodes from a nested group back to its parent swimlane', () => {
    const swimlane = { ...createNode('swimlane', { x: 20, y: 20 }, 'Workflow', 'swimlane'), style: { width: 520, height: 260 } }
    const group = { ...createNode('group', { x: 80, y: 60 }, 'Nested', 'group'), parentId: 'swimlane', extent: 'parent' as const, style: { width: 180, height: 120 } }
    const child = { ...createNode('process', { x: 260, y: 40 }, 'Child', 'child'), parentId: 'group', extent: 'parent' as const }

    const next = reconcileContainerMembership({ nodes: [swimlane, group, child], edges: [] })
    const reparented = next.nodes.find((node) => node.id === 'child')

    expect(reparented).toMatchObject({
      parentId: 'swimlane',
      extent: 'parent',
      position: { x: 340, y: 100 },
    })
    expect(parseDocument(next)?.nodes.find((node) => node.id === 'child')?.parentId).toBe('swimlane')
  })

  it('does not auto-parent container nodes while reconciling membership', () => {
    const swimlane = { ...createNode('swimlane', { x: 0, y: 0 }, 'Workflow', 'swimlane'), style: { width: 420, height: 260 } }
    const group = { ...createNode('group', { x: 80, y: 80 }, 'Group', 'group'), style: { width: 180, height: 120 } }

    const next = reconcileContainerMembership({ nodes: [swimlane, group], edges: [] })

    expect(next.nodes.find((node) => node.id === 'group')?.parentId).toBeUndefined()
    expect(parseDocument(next)?.nodes.map((node) => node.id)).toEqual(['swimlane', 'group'])
  })
})
