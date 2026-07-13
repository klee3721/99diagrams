import { describe, expect, it } from 'vitest'
import { getActivePage, parseDiagramDocument, serializeDiagramDocument, createDocumentFromSnapshot } from './document'
import { demoGallery, demoText } from './demoGallery'

describe('demo gallery', () => {
  it('ships editable demos with localized copy', () => {
    expect(demoGallery).toHaveLength(4)
    expect(new Set(demoGallery.map((demo) => demo.id)).size).toBe(demoGallery.length)

    const product = demoGallery.find((demo) => demo.id === 'product-flow')!
    expect(demoText(product, 'vi').name).toBe('Luồng sản phẩm')
    expect(demoText(product, 'en').name).toBe('Product flow')
    expect(product.snapshot('en').nodes[0].data.label).toBe('Idea')
  })

  it('round-trips every demo through the v2 document parser', () => {
    for (const demo of demoGallery) {
      const copy = demoText(demo, 'en')
      const snapshot = demo.snapshot('en')
      const document = createDocumentFromSnapshot(copy.name, snapshot, {
        id: `demo-doc-${demo.id}`,
        pageId: `demo-page-${demo.id}`,
        pageName: copy.name,
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:00.000Z',
        layers: demo.layers?.('en'),
      })
      const serialized = serializeDiagramDocument(document)
      const parsed = parseDiagramDocument(JSON.parse(serialized))

      expect(parsed?.id, demo.id).toBe(`demo-doc-${demo.id}`)
      expect(getActivePage(parsed!).nodes.length, demo.id).toBe(snapshot.nodes.length)
      expect(getActivePage(parsed!).edges.length, demo.id).toBe(snapshot.edges.length)
      expect(serialized, demo.id).not.toContain('"selected"')
      expect(serialized, demo.id).not.toContain('"dragging"')
    }
  })
})
