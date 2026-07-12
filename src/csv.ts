import { createEdge, createNode, nodeKinds, type DiagramSnapshot, type NodeKind } from './diagram'

const kindAliases: Record<string, NodeKind> = {
  end: 'start',
  io: 'input',
  inputoutput: 'input',
  data: 'database',
  db: 'database',
}

type CsvRecord = {
  id: string
  label: string
  kind: NodeKind
  next: string[]
  x?: number
  y?: number
}

export function parseCsvDiagram(source: string): DiagramSnapshot | null {
  const rows = parseCsvRows(source)
  if (rows.length < 2) return null
  const headers = rows[0].map(normalizeHeader)
  const idIndex = headers.indexOf('id')
  const labelIndex = headers.indexOf('label')
  const kindIndex = firstHeaderIndex(headers, ['kind', 'type', 'shape'])
  const nextIndex = firstHeaderIndex(headers, ['next', 'to', 'target', 'targets'])
  const xIndex = headers.indexOf('x')
  const yIndex = headers.indexOf('y')
  if (idIndex < 0 || labelIndex < 0) return null

  const records: CsvRecord[] = []
  const seenIds = new Set<string>()
  for (const row of rows.slice(1)) {
    const id = cell(row, idIndex)
    const label = cell(row, labelIndex)
    if (!id || !label || seenIds.has(id)) return null
    seenIds.add(id)
    records.push({
      id,
      label,
      kind: normalizeKind(cell(row, kindIndex)),
      next: splitTargets(cell(row, nextIndex)),
      x: parseCoordinate(cell(row, xIndex)),
      y: parseCoordinate(cell(row, yIndex)),
    })
  }
  if (!records.length) return null

  const nodes = records.map((record, index) => createNode(record.kind, {
    x: record.x ?? 120 + (index % 4) * 220,
    y: record.y ?? 90 + Math.floor(index / 4) * 130,
  }, record.label, record.id))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edgeKeys = new Set<string>()
  const edges = records.flatMap((record) => record.next.flatMap((target) => {
    if (!nodeIds.has(target)) return []
    const key = `${record.id}->${target}`
    if (edgeKeys.has(key)) return []
    edgeKeys.add(key)
    return [createEdge(record.id, target, `csv-${record.id}-${target}-${edgeKeys.size}`)]
  }))

  return { nodes, edges }
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        value += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(value.trim())
      value = ''
    } else if (char === '\n') {
      row.push(value.trim())
      rows.push(row)
      row = []
      value = ''
    } else if (char !== '\r') {
      value += char
    }
  }
  row.push(value.trim())
  rows.push(row)

  return rows.filter((cells) => cells.some(Boolean))
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function firstHeaderIndex(headers: string[], names: string[]) {
  for (const name of names) {
    const index = headers.indexOf(name)
    if (index >= 0) return index
  }
  return -1
}

function cell(row: string[], index: number) {
  return index >= 0 ? row[index]?.trim() ?? '' : ''
}

function normalizeKind(value: string): NodeKind {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '')
  if (nodeKinds.includes(normalized as NodeKind)) return normalized as NodeKind
  return kindAliases[normalized] ?? 'process'
}

function splitTargets(value: string) {
  return value.split(/[;|]/).map((target) => target.trim()).filter(Boolean)
}

function parseCoordinate(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
