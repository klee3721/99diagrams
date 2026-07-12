import { describe, expect, it } from 'vitest'
import { createEdge, createNode } from './diagram'
import { applyLayoutPositions, buildElkGraph, buildGridFallbackLayout, extractLayoutPositions } from './layout'

describe('layout helpers', () => {
  it('builds an ELK graph from diagram nodes and edges', () => {
    const source = { ...createNode('process', { x: 0, y: 0 }, 'A', 'a'), measured: { width: 180, height: 70 } }
    const target = createNode('decision', { x: 0, y: 0 }, 'B', 'b')
    const graph = buildElkGraph([source, target], [createEdge('a', 'b', 'edge')], 'RIGHT')

    expect(graph.layoutOptions['elk.direction']).toBe('RIGHT')
    expect(graph.children).toEqual([
      { id: 'a', width: 180, height: 70 },
      { id: 'b', width: 164, height: 64 },
    ])
    expect(graph.edges).toEqual([{ id: 'edge', sources: ['a'], targets: ['b'] }])
  })

  it('extracts and applies layout positions without dropping unmatched nodes', () => {
    const nodes = [createNode('process', { x: 0, y: 0 }, 'A', 'a'), createNode('process', { x: 10, y: 20 }, 'B', 'b')]
    const positions = extractLayoutPositions({ children: [{ id: 'a', x: 120, y: 240 }, { id: undefined, x: 0, y: 0 }] })
    const laidOut = applyLayoutPositions(nodes, positions)

    expect(positions).toEqual([{ id: 'a', x: 120, y: 240 }])
    expect(laidOut[0].position).toEqual({ x: 120, y: 240 })
    expect(laidOut[1].position).toEqual({ x: 10, y: 20 })
  })

  it('builds a deterministic grid fallback for large graphs', () => {
    const nodes = [
      createNode('process', { x: 0, y: 0 }, 'A', 'a'),
      createNode('process', { x: 0, y: 0 }, 'B', 'b'),
      createNode('process', { x: 0, y: 0 }, 'C', 'c'),
      createNode('process', { x: 0, y: 0 }, 'D', 'd'),
    ]

    expect(buildGridFallbackLayout(nodes, 'DOWN')).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 220, y: 0 },
      { id: 'c', x: 0, y: 140 },
      { id: 'd', x: 220, y: 140 },
    ])
    expect(buildGridFallbackLayout(nodes, 'RIGHT')[1]).toEqual({ id: 'b', x: 0, y: 140 })
  })
})
