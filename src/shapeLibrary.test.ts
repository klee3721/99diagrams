import { describe, expect, it } from 'vitest'
import { shapeGroups, shapeLibrary, shapesByGroup } from './shapeLibrary'

describe('shapeLibrary', () => {
  it('defines the requested rebuilt groups and basic shapes', () => {
    expect(shapeGroups).toEqual(['common', 'basic', 'uml', 'advanced'])
    expect(shapeLibrary.map((shape) => shape.id)).toEqual([
      'rectangle',
      'rounded-rectangle',
      'circle',
      'ellipse',
      'square',
      'rounded-square',
      'parallelogram',
      'rounded-parallelogram',
      'triangle',
      'diamond',
      'text',
    ])
    expect(shapeLibrary.map((shape) => shape.label.vi)).toEqual([
      'Hình chữ nhật',
      'Hình chữ nhật bo góc',
      'Hình tròn',
      'Hình elipse',
      'Hình vuông',
      'Hình vuông bo góc',
      'Hình bình hành',
      'Hình bình hành bo góc',
      'Hình tam giác',
      'Hình thoi',
      'Text',
    ])
  })

  it('keeps Common as all shapes and Basic as the visible drawing primitives', () => {
    expect(shapesByGroup('common').map((shape) => shape.id)).toEqual(shapeLibrary.map((shape) => shape.id))
    expect(shapesByGroup('basic').map((shape) => shape.id)).toEqual([
      'rectangle',
      'rounded-rectangle',
      'circle',
      'ellipse',
      'square',
      'rounded-square',
      'parallelogram',
      'rounded-parallelogram',
      'triangle',
      'diamond',
      'text',
    ])
    expect(shapesByGroup('uml')).toEqual([])
    expect(shapesByGroup('advanced')).toEqual([])
  })

  it('uses matching colors for rounded variants of the same shape family', () => {
    const byId = new Map(shapeLibrary.map((shape) => [shape.id, shape]))

    expect(byId.get('rounded-rectangle')?.colors).toEqual(byId.get('rectangle')?.colors)
    expect(byId.get('rounded-square')?.colors).toEqual(byId.get('square')?.colors)
    expect(byId.get('rounded-parallelogram')?.colors).toEqual(byId.get('parallelogram')?.colors)
  })
})
