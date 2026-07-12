import { describe, expect, it } from 'vitest'
import { createNode, parseDocument } from './diagram'

describe('malformed diagram corpus', () => {
  it('rejects overlong labels before rendering', () => {
    const node = createNode('process', { x: 0, y: 0 }, 'x'.repeat(5001), 'too-long')

    expect(parseDocument({ nodes: [node], edges: [] })).toBeNull()
  })

  it('rejects invalid swimlane schema', () => {
    const node = createNode('swimlane', { x: 0, y: 0 }, 'Swimlane', 'swimlane')
    node.data.swimlane = { direction: 'horizontal', lanes: [] }

    expect(parseDocument({ nodes: [node], edges: [] })).toBeNull()
  })

  it('rejects cyclic parent chains', () => {
    const groupA = { ...createNode('group', { x: 0, y: 0 }, 'A', 'a'), parentId: 'b' }
    const groupB = { ...createNode('group', { x: 20, y: 20 }, 'B', 'b'), parentId: 'a' }

    expect(parseDocument({ nodes: [groupA, groupB], edges: [] })).toBeNull()
  })
})
