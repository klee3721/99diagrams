import { createEdge, createNode, type DiagramSnapshot, type NodeKind } from './diagram'
import type { DiagramLayer } from './document'
import type { Language } from './i18n'

type DemoCopy = {
  name: string
  description: string
}

export type DemoDiagram = {
  id: string
  copy: Record<Language, DemoCopy>
  layers?: DiagramLayer[]
  snapshot: (language?: Language) => DiagramSnapshot
}

const defaultLayers: DiagramLayer[] = [{ id: 'default', name: 'Default', visible: true, locked: false }]
const systemLayers: DiagramLayer[] = [
  { id: 'client', name: 'Client', visible: true, locked: false },
  { id: 'service', name: 'Service', visible: true, locked: false },
  { id: 'data', name: 'Data', visible: true, locked: false },
]

function text(language: Language, vi: string, en: string) {
  return language === 'en' ? en : vi
}

function node(id: string, kind: NodeKind, label: string, x: number, y: number, layerId = 'default') {
  const base = createNode(kind, { x, y }, label, id)
  return { ...base, data: { ...base.data, layerId } }
}

function edge(source: string, target: string, id: string, label?: string) {
  return { ...createEdge(source, target, id), ...(label ? { label } : {}) }
}

function productFlow(language: Language): DiagramSnapshot {
  const nodes = [
    node('demo-product-start', 'start', text(language, 'Ý tưởng', 'Idea'), 80, 60),
    node('demo-product-research', 'note', text(language, 'Nghiên cứu người dùng', 'User research'), 300, 40),
    node('demo-product-design', 'process', text(language, 'Thiết kế giải pháp', 'Design solution'), 530, 60),
    node('demo-product-ready', 'decision', text(language, 'Sẵn sàng build?', 'Ready to build?'), 760, 44),
    node('demo-product-build', 'process', text(language, 'Build MVP', 'Build MVP'), 1010, 60),
    node('demo-product-test', 'process', text(language, 'Beta feedback', 'Beta feedback'), 1010, 210),
    node('demo-product-iterate', 'process', text(language, 'Cải tiến', 'Iterate'), 760, 245),
    node('demo-product-launch', 'start', text(language, 'Phát hành', 'Launch'), 530, 260),
    node('demo-product-metrics', 'database', text(language, 'Metrics', 'Metrics'), 300, 260),
  ]

  return {
    nodes,
    edges: [
      edge(nodes[0].id, nodes[1].id, 'demo-product-e1'),
      edge(nodes[1].id, nodes[2].id, 'demo-product-e2'),
      edge(nodes[2].id, nodes[3].id, 'demo-product-e3'),
      edge(nodes[3].id, nodes[4].id, 'demo-product-e4', text(language, 'Có', 'Yes')),
      edge(nodes[3].id, nodes[6].id, 'demo-product-e5', text(language, 'Chưa', 'No')),
      edge(nodes[4].id, nodes[5].id, 'demo-product-e6'),
      edge(nodes[5].id, nodes[6].id, 'demo-product-e7'),
      edge(nodes[6].id, nodes[2].id, 'demo-product-e8'),
      edge(nodes[5].id, nodes[7].id, 'demo-product-e9', text(language, 'Ổn định', 'Stable')),
      edge(nodes[7].id, nodes[8].id, 'demo-product-e10'),
    ],
  }
}

function releaseChecklist(language: Language): DiagramSnapshot {
  const group = {
    ...node('demo-release-group', 'group', text(language, 'Release gate', 'Release gate'), 54, 36),
    style: { width: 780, height: 310 },
    zIndex: -1,
  }
  const freeze = { ...node('demo-release-freeze', 'process', text(language, 'Feature freeze', 'Feature freeze'), 48, 68), parentId: group.id, extent: 'parent' as const }
  const tests = { ...node('demo-release-tests', 'process', text(language, 'Full gate', 'Full gate'), 270, 68), parentId: group.id, extent: 'parent' as const }
  const ship = { ...node('demo-release-ship', 'decision', text(language, 'Có blocker?', 'Any blocker?'), 500, 54), parentId: group.id, extent: 'parent' as const }
  const changelog = { ...node('demo-release-changelog', 'document', text(language, 'Changelog + SBOM', 'Changelog + SBOM'), 268, 204), parentId: group.id, extent: 'parent' as const }
  const rollback = { ...node('demo-release-rollback', 'note', text(language, 'Rollback path rõ ràng', 'Clear rollback path'), 506, 208), parentId: group.id, extent: 'parent' as const }
  const done = node('demo-release-done', 'start', text(language, 'Tag v1.0.0', 'Tag v1.0.0'), 925, 150)

  return {
    nodes: [group, freeze, tests, ship, changelog, rollback, done],
    edges: [
      edge(freeze.id, tests.id, 'demo-release-e1'),
      edge(tests.id, ship.id, 'demo-release-e2'),
      edge(ship.id, changelog.id, 'demo-release-e3', text(language, 'Không', 'No')),
      edge(changelog.id, rollback.id, 'demo-release-e4'),
      edge(rollback.id, done.id, 'demo-release-e5'),
      { ...edge(ship.id, freeze.id, 'demo-release-e6', text(language, 'Có', 'Yes')), style: { stroke: '#be123c', strokeWidth: 2, strokeDasharray: '6 4' }, markerEnd: { type: 'arrowclosed', color: '#be123c' } },
    ],
  }
}

function architectureMap(language: Language): DiagramSnapshot {
  const client = node('demo-arch-client', 'input', text(language, 'Trình duyệt', 'Browser'), 80, 110, 'client')
  const pwa = node('demo-arch-pwa', 'process', 'PWA shell', 320, 110, 'client')
  const model = node('demo-arch-model', 'process', text(language, 'Document model', 'Document model'), 560, 110, 'service')
  const worker = node('demo-arch-worker', 'process', 'ELK worker', 560, 270, 'service')
  const exportNode = node('demo-arch-export', 'document', text(language, 'SVG/PNG/PDF export', 'SVG/PNG/PDF export'), 800, 110, 'service')
  const storage = node('demo-arch-storage', 'database', 'IndexedDB', 1040, 110, 'data')
  const file = node('demo-arch-file', 'document', '.99draw.json', 1040, 270, 'data')

  return {
    nodes: [client, pwa, model, worker, exportNode, storage, file],
    edges: [
      edge(client.id, pwa.id, 'demo-arch-e1'),
      edge(pwa.id, model.id, 'demo-arch-e2'),
      edge(model.id, worker.id, 'demo-arch-e3', 'layout'),
      edge(model.id, exportNode.id, 'demo-arch-e4'),
      edge(model.id, storage.id, 'demo-arch-e5', 'autosave'),
      edge(exportNode.id, file.id, 'demo-arch-e6', 'export'),
      edge(file.id, model.id, 'demo-arch-e7', 'import'),
    ],
  }
}

function swimlaneProcess(language: Language): DiagramSnapshot {
  const lane = node('demo-lane', 'swimlane', text(language, 'Bug triage', 'Bug triage'), 80, 70)
  lane.data.swimlane = {
    direction: 'vertical',
    lanes: [
      text(language, 'Người dùng', 'User'),
      text(language, 'Maintainer', 'Maintainer'),
      text(language, 'Contributor', 'Contributor'),
      'CI',
    ],
  }
  lane.style = { width: 920, height: 360 }

  const report = { ...node('demo-lane-report', 'document', text(language, 'Báo lỗi', 'Report bug'), 64, 80), parentId: lane.id, extent: 'parent' as const }
  const reproduce = { ...node('demo-lane-repro', 'process', text(language, 'Reproduce', 'Reproduce'), 276, 80), parentId: lane.id, extent: 'parent' as const }
  const assign = { ...node('demo-lane-assign', 'decision', text(language, 'Rõ phạm vi?', 'Scoped?'), 486, 64), parentId: lane.id, extent: 'parent' as const }
  const patch = { ...node('demo-lane-patch', 'process', text(language, 'Mở PR nhỏ', 'Open focused PR'), 686, 80), parentId: lane.id, extent: 'parent' as const }
  const gate = { ...node('demo-lane-gate', 'process', text(language, 'Test + build', 'Test + build'), 686, 224), parentId: lane.id, extent: 'parent' as const }
  const release = node('demo-lane-release', 'start', text(language, 'Merge', 'Merge'), 1060, 194)

  return {
    nodes: [lane, report, reproduce, assign, patch, gate, release],
    edges: [
      edge(report.id, reproduce.id, 'demo-lane-e1'),
      edge(reproduce.id, assign.id, 'demo-lane-e2'),
      edge(assign.id, patch.id, 'demo-lane-e3', text(language, 'Có', 'Yes')),
      edge(assign.id, report.id, 'demo-lane-e4', text(language, 'Cần thêm info', 'Need info')),
      edge(patch.id, gate.id, 'demo-lane-e5'),
      edge(gate.id, release.id, 'demo-lane-e6'),
    ],
  }
}

export function demoText(demo: DemoDiagram, language: Language) {
  return demo.copy[language]
}

export const demoGallery: DemoDiagram[] = [
  {
    id: 'product-flow',
    layers: defaultLayers,
    copy: {
      vi: { name: 'Luồng sản phẩm', description: 'Từ ý tưởng đến beta feedback và release.' },
      en: { name: 'Product flow', description: 'From idea to beta feedback and release.' },
    },
    snapshot: (language = 'vi') => productFlow(language),
  },
  {
    id: 'release-checklist',
    layers: defaultLayers,
    copy: {
      vi: { name: 'Checklist release', description: 'Feature freeze, full gate, changelog, SBOM và rollback.' },
      en: { name: 'Release checklist', description: 'Feature freeze, full gate, changelog, SBOM, and rollback.' },
    },
    snapshot: (language = 'vi') => releaseChecklist(language),
  },
  {
    id: 'architecture-map',
    layers: systemLayers,
    copy: {
      vi: { name: 'Architecture map', description: 'PWA, document model, worker, storage và export pipeline.' },
      en: { name: 'Architecture map', description: 'PWA, document model, worker, storage, and export pipeline.' },
    },
    snapshot: (language = 'vi') => architectureMap(language),
  },
  {
    id: 'swimlane-process',
    layers: defaultLayers,
    copy: {
      vi: { name: 'Swimlane triage bug', description: 'Một quy trình cộng đồng qua user, maintainer, contributor và CI.' },
      en: { name: 'Bug triage swimlane', description: 'A community workflow across user, maintainer, contributor, and CI.' },
    },
    snapshot: (language = 'vi') => swimlaneProcess(language),
  },
]
