import { describe, expect, it } from 'vitest'
import { parseCsvDiagram } from './csv'

describe('CSV import', () => {
  it('imports nodes, kinds, positions and next edges from a header row', () => {
    const diagram = parseCsvDiagram(`id,label,kind,next,x,y
start,Start,start,review,100,80
review,Review request,decision,ship;revise,320,80
ship,Ship it,process,,560,40
revise,Revise,document,,560,160`)

    expect(diagram?.nodes).toHaveLength(4)
    expect(diagram?.edges).toHaveLength(3)
    expect(diagram?.nodes.find((node) => node.id === 'review')?.data.kind).toBe('decision')
    expect(diagram?.nodes.find((node) => node.id === 'revise')?.data.kind).toBe('document')
    expect(diagram?.nodes.find((node) => node.id === 'ship')?.position).toEqual({ x: 560, y: 40 })
    expect(diagram?.edges.map((edge) => `${edge.source}->${edge.target}`).sort()).toEqual([
      'review->revise',
      'review->ship',
      'start->review',
    ])
  })

  it('supports quoted labels and ignores unknown targets', () => {
    const diagram = parseCsvDiagram(`id,label,type,next
a,"Collect, validate",input,b;missing
b,Done,end,`)

    expect(diagram?.nodes.map((node) => node.data.label)).toEqual(['Collect, validate', 'Done'])
    expect(diagram?.nodes[0].data.kind).toBe('input')
    expect(diagram?.nodes[1].data.kind).toBe('start')
    expect(diagram?.edges).toHaveLength(1)
  })

  it('rejects missing headers and duplicate ids', () => {
    expect(parseCsvDiagram('label,next\nStart,end')).toBeNull()
    expect(parseCsvDiagram('id,label\na,A\na,B')).toBeNull()
  })
})
