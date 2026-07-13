import type { Language } from './i18n'
import type { NodeKind } from './diagram'

export const shapeGroups = ['common', 'basic', 'uml', 'advanced'] as const

export type ShapeGroupId = typeof shapeGroups[number]

export type ShapePreview =
  | 'rectangle'
  | 'rounded'
  | 'circle'
  | 'ellipse'
  | 'square'
  | 'rounded-square'
  | 'parallelogram'
  | 'rounded-parallelogram'
  | 'triangle'
  | 'diamond'
  | 'text'

export type ShapeDefinition = {
  id: string
  group: Exclude<ShapeGroupId, 'common'>
  kind: NodeKind
  shapeType?: string
  label: Record<Language, string>
  hint: Record<Language, string>
  preview: ShapePreview
  defaultSize?: { width: number; height: number }
  colors: { fill: string; stroke: string; textColor: string }
  tags: string[]
}

export const shapeGroupLabels: Record<ShapeGroupId, Record<Language, string>> = {
  common: { vi: 'Chung', en: 'Common' },
  basic: { vi: 'Cơ bản', en: 'Basic' },
  uml: { vi: 'UML', en: 'UML' },
  advanced: { vi: 'Nâng cao', en: 'Advanced' },
}

const blue = { fill: '#dbeafe', stroke: '#3b82f6', textColor: '#172554' }
const green = { fill: '#d1fae5', stroke: '#10b981', textColor: '#064e3b' }
const amber = { fill: '#fef3c7', stroke: '#f59e0b', textColor: '#78350f' }
const violet = { fill: '#ede9fe', stroke: '#7c3aed', textColor: '#4c1d95' }
const rose = { fill: '#ffe4e6', stroke: '#e11d48', textColor: '#881337' }
const textOnly = { fill: '#ffffff', stroke: '#94a3b8', textColor: '#0f172a' }

function shape(
  id: string,
  preview: ShapePreview,
  vi: string,
  en: string,
  options: {
    group?: Exclude<ShapeGroupId, 'common'>
    kind?: NodeKind
    shapeType?: string
    defaultSize?: { width: number; height: number }
    colors: { fill: string; stroke: string; textColor: string }
    tags?: string[]
  },
): ShapeDefinition {
  const shapeType = options.shapeType ?? id
  return {
    id,
    group: options.group ?? 'basic',
    kind: options.kind ?? 'process',
    shapeType,
    label: { vi, en },
    hint: { vi, en },
    preview,
    defaultSize: options.defaultSize,
    colors: options.colors,
    tags: [id, options.group ?? 'basic', preview, vi, en, ...(options.tags ?? [])].map((item) => item.toLowerCase()),
  }
}

export const shapeLibrary: ShapeDefinition[] = [
  shape('rectangle', 'rectangle', 'Hình chữ nhật', 'Rectangle', { colors: blue, defaultSize: { width: 164, height: 76 } }),
  shape('rounded-rectangle', 'rounded', 'Hình chữ nhật bo góc', 'Rounded rectangle', { colors: blue, defaultSize: { width: 164, height: 76 } }),
  shape('circle', 'circle', 'Hình tròn', 'Circle', { kind: 'start', colors: green, defaultSize: { width: 112, height: 112 } }),
  shape('ellipse', 'ellipse', 'Hình elipse', 'Ellipse', { kind: 'start', colors: green, defaultSize: { width: 164, height: 86 } }),
  shape('square', 'square', 'Hình vuông', 'Square', { colors: amber, defaultSize: { width: 112, height: 112 } }),
  shape('rounded-square', 'rounded-square', 'Hình vuông bo góc', 'Rounded square', { colors: amber, defaultSize: { width: 112, height: 112 } }),
  shape('parallelogram', 'parallelogram', 'Hình bình hành', 'Parallelogram', { kind: 'input', colors: violet, defaultSize: { width: 164, height: 76 } }),
  shape('rounded-parallelogram', 'rounded-parallelogram', 'Hình bình hành bo góc', 'Rounded parallelogram', { kind: 'input', colors: violet, defaultSize: { width: 164, height: 76 } }),
  shape('triangle', 'triangle', 'Hình tam giác', 'Triangle', { colors: rose, defaultSize: { width: 128, height: 112 } }),
  shape('diamond', 'diamond', 'Hình thoi', 'Diamond', { kind: 'decision', colors: rose, defaultSize: { width: 132, height: 112 } }),
  shape('text', 'text', 'Text', 'Text', { kind: 'note', colors: textOnly, defaultSize: { width: 160, height: 42 }, tags: ['text', 'label', 'văn bản', 'transparent'] }),
]

export function shapeById(id: string) {
  return shapeLibrary.find((shape) => shape.id === id)
}

export function shapesByGroup(group: ShapeGroupId) {
  if (group === 'common') return shapeLibrary
  return shapeLibrary.filter((shape) => shape.group === group)
}
