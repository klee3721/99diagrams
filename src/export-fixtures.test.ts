import { describe, expect, it } from 'vitest'
import { nodeKinds } from './diagram'
import { getActivePage, parseDiagramDocument, serializeDiagramDocument } from './document'
import { createFixtureDocument, exportFixtures } from './export-fixtures'

describe('export fixtures', () => {
  it('provides at least 20 deterministic export fixtures', () => {
    expect(exportFixtures).toHaveLength(20)
    expect(new Set(exportFixtures.map((fixture) => fixture.id)).size).toBe(exportFixtures.length)
  })

  it('round-trips every export fixture through the v2 document parser', () => {
    for (const fixture of exportFixtures) {
      const document = createFixtureDocument(fixture)
      const serialized = serializeDiagramDocument(document)
      const parsed = parseDiagramDocument(JSON.parse(serialized))

      expect(parsed?.id, fixture.id).toBe(`fixture-doc-${fixture.id}`)
      expect(parsed?.activePageId, fixture.id).toBe(`fixture-page-${fixture.id}`)
      expect(getActivePage(parsed!).nodes.length, fixture.id).toBe(fixture.snapshot.nodes.length)
      expect(getActivePage(parsed!).edges.length, fixture.id).toBe(fixture.snapshot.edges.length)
      expect(serialized, fixture.id).not.toContain('"selected"')
      expect(serialized, fixture.id).not.toContain('"dragging"')
      expect(serializeDiagramDocument(createFixtureDocument(fixture))).toBe(serialized)
    }
  })

  it('covers every node kind and common edge variants', () => {
    const kinds = new Set(exportFixtures.flatMap((fixture) => fixture.snapshot.nodes.map((node) => node.data.kind)))
    const edgeTypes = new Set(exportFixtures.flatMap((fixture) => fixture.snapshot.edges.map((edge) => String(edge.type ?? 'default'))))
    const hasDashedEdge = exportFixtures.some((fixture) => fixture.snapshot.edges.some((edge) => edge.style?.strokeDasharray))
    const hasAnimatedEdge = exportFixtures.some((fixture) => fixture.snapshot.edges.some((edge) => edge.animated))

    expect([...kinds].sort()).toEqual([...nodeKinds].sort())
    expect(edgeTypes).toEqual(new Set(['smoothstep', 'straight', 'default']))
    expect(hasDashedEdge).toBe(true)
    expect(hasAnimatedEdge).toBe(true)
  })
})
