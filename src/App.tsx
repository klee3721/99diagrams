import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  Handle,
  MiniMap,
  NodeChange,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  NodeResizer,
  MarkerType,
  reconnectEdge,
  useReactFlow,
} from '@xyflow/react'
import {
  CircleDot,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Database,
  Diamond,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  GitFork,
  GitBranch,
  Image,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  PanelsTopLeft,
  Redo2,
  Save,
  Square,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
  Lock,
  Unlock,
} from 'lucide-react'
import {
  cloneSnapshot,
  containerChildCount,
  createEdge,
  createNode,
  createStarterDiagram,
  deleteNodes,
  getSwimlaneMembership,
  maxDocumentBytes,
  maxEmbeddedImageBytes,
  parseDocument,
  reconcileContainerMembership,
  scopeSnapshot,
  storageKey,
  type DiagramNode,
  type DiagramNodeData,
  type DiagramSnapshot,
  type NodeKind,
  type SwimlaneData,
} from './diagram'
import {
  addPage,
  createDocumentFromSnapshot,
  createLayer,
  getActivePage,
  parseDiagramDocument,
  orderedVisibleNodes,
  removePage,
  selectPage,
  serializeDiagramDocument,
  updateActivePage,
  updatePage,
  visibleEdges,
  type DiagramDocument,
} from './document'
import { listDiagramDocuments, loadDiagramDocument, saveDiagramDocument } from './persistence'
import type { DocumentIndexEntry } from './document'
import { isLanguage, nextLanguage, translate, type Language, type TranslationKey, type TranslationValues } from './i18n'
import { applyLayoutPositions, runLayoutWorker, type LayoutDirection } from './layout'
import { parseMermaidFlowchart } from './mermaid'
import { parseCsvDiagram } from './csv'
import { exportSnapshotToSvg, rasterizeSvgToPngDataUrl } from './svg'
import { templateText, templates } from './templates'
import { demoGallery, demoText } from './demoGallery'

const palette: Array<{ kind: NodeKind; labelKey: TranslationKey; hintKey: TranslationKey; icon: typeof Square }> = [
  { kind: 'start', labelKey: 'palette.start.label', hintKey: 'palette.start.hint', icon: CircleDot },
  { kind: 'process', labelKey: 'palette.process.label', hintKey: 'palette.process.hint', icon: Square },
  { kind: 'decision', labelKey: 'palette.decision.label', hintKey: 'palette.decision.hint', icon: Diamond },
  { kind: 'input', labelKey: 'palette.input.label', hintKey: 'palette.input.hint', icon: PanelsTopLeft },
  { kind: 'document', labelKey: 'palette.document.label', hintKey: 'palette.document.hint', icon: FileText },
  { kind: 'database', labelKey: 'palette.database.label', hintKey: 'palette.database.hint', icon: Database },
  { kind: 'note', labelKey: 'palette.note.label', hintKey: 'palette.note.hint', icon: StickyNote },
  { kind: 'group', labelKey: 'palette.group.label', hintKey: 'palette.group.hint', icon: Square },
  { kind: 'swimlane', labelKey: 'palette.swimlane.label', hintKey: 'palette.swimlane.hint', icon: PanelsTopLeft },
  { kind: 'image', labelKey: 'palette.image.label', hintKey: 'palette.image.hint', icon: Image },
]

const nodeDefaultLabelKeys: Record<NodeKind, TranslationKey> = {
  start: 'node.default.start',
  process: 'node.default.process',
  decision: 'node.default.decision',
  input: 'node.default.input',
  document: 'node.default.document',
  database: 'node.default.database',
  note: 'node.default.note',
  group: 'node.default.group',
  swimlane: 'node.default.swimlane',
  image: 'node.default.image',
}

function DiagramNodeView({ data, selected }: NodeProps<DiagramNode>) {
  return (
    <div
      className={`diagram-node node-${data.kind} ${selected ? 'is-selected' : ''}`}
      style={{ '--node-fill': data.fill, '--node-stroke': data.stroke, '--node-text': data.textColor } as CSSProperties}
    >
      <NodeResizer minWidth={110} minHeight={50} isVisible={selected} lineClassName="resize-line" handleClassName="resize-handle" />
      <Handle type="target" position={Position.Top} id="top" className="node-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="node-handle" />
      <Handle type="target" position={Position.Left} id="left" className="node-handle" />
      <Handle type="source" position={Position.Right} id="right" className="node-handle" />
      {data.kind === 'image' ? (
        <figure className="image-node-content">
          {data.imageDataUrl ? <img src={data.imageDataUrl} alt={data.label} draggable={false} /> : <span><Image size={21} />{data.label}</span>}
          <figcaption>{data.label}</figcaption>
        </figure>
      ) : data.kind === 'group' ? (
        <div className="container-node-content">
          <strong>{data.label}</strong>
        </div>
      ) : data.kind === 'swimlane' ? (
        <div className={`swimlane-content swimlane-${data.swimlane?.direction ?? 'horizontal'}`}>
          <strong>{data.label}</strong>
          <div>
            {(data.swimlane?.lanes.length ? data.swimlane.lanes : ['Lane 1']).map((lane) => <span key={lane}>{lane}</span>)}
          </div>
        </div>
      ) : <span>{data.label}</span>}
    </div>
  )
}

const nodeTypes = { diagram: DiagramNodeView }

type ContextMenuTarget = { type: 'node' | 'edge'; id: string }

type ContextMenuState = ContextMenuTarget & { x: number; y: number }

function markerValue(marker: Edge['markerStart'] | Edge['markerEnd']) {
  if (!marker) return 'none'
  return typeof marker === 'string' ? marker : marker.type
}

function markerFromValue(value: string, color: string) {
  if (value === 'none') return undefined
  return { type: value === 'arrow' ? MarkerType.Arrow : MarkerType.ArrowClosed, color }
}

function getStoredLanguage(): Language {
  const saved = localStorage.getItem('99draw:language')
  return isLanguage(saved) ? saved : 'vi'
}

function createLocalizedDocument(language: Language, snapshot: DiagramSnapshot = createStarterDiagram(), name = translate(language, 'document.defaultName')) {
  return createDocumentFromSnapshot(name, snapshot, {
    pageName: translate(language, 'document.defaultPageName'),
    layers: [createLayer(translate(language, 'document.defaultLayerName'))],
  })
}

function Editor() {
  const [document, setDocument] = useState<DiagramDocument>(() => createLocalizedDocument(getStoredLanguage()))
  const [hydrated, setHydrated] = useState(false)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [demoGalleryOpen, setDemoGalleryOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [textImport, setTextImport] = useState<{ kind: 'mermaid' | 'csv'; value: string } | null>(null)
  const [findValue, setFindValue] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [recentOpen, setRecentOpen] = useState(false)
  const [recentDocuments, setRecentDocuments] = useState<DocumentIndexEntry[]>([])
  const [language, setLanguage] = useState(getStoredLanguage)
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>(() => (localStorage.getItem('99draw:theme') as 'light' | 'dark' | 'contrast') || 'light')
  const [compactReadOnly, setCompactReadOnly] = useState(() => window.matchMedia('(max-width: 959px)').matches)
  const [selection, setSelection] = useState<{ type: 'node' | 'edge'; id: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [status, setStatus] = useState(() => translate(getStoredLanguage(), 'status.saved'))
  const [history, setHistory] = useState<DiagramSnapshot[]>([])
  const [future, setFuture] = useState<DiagramSnapshot[]>([])
  const historyTimer = useRef<number | undefined>(undefined)
  const clipboard = useRef<DiagramSnapshot | null>(null)
  const activePage = getActivePage(document)
  const pageNodes = activePage.nodes
  const pageEdges = activePage.edges
  const nodes = orderedVisibleNodes(activePage)
  const edges = visibleEdges(activePage, nodes)
  const lockedLayerIds = new Set(activePage.layers.filter((layer) => layer.locked).map((layer) => layer.id))
  const renderNodes = nodes.map((node) => {
    const locked = lockedLayerIds.has(String(node.data.layerId ?? activePage.layers[0]?.id))
    return locked ? { ...node, draggable: false, connectable: false, deletable: false } : node
  })
  const previousSnapshot = useRef<DiagramSnapshot>(cloneSnapshot({ nodes: pageNodes, edges: pageEdges }))
  const restoringHistory = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const commandInput = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const { fitBounds, fitView, getNodesBounds, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow<DiagramNode, Edge>()
  const t = useCallback((key: TranslationKey, values?: TranslationValues) => translate(language, key, values), [language])

  const selectedNode = selection?.type === 'node' ? pageNodes.find((node) => node.id === selection.id) ?? null : null
  const selectedEdge = selection?.type === 'edge' ? pageEdges.find((edge) => edge.id === selection.id) ?? null : null

  const updateSnapshot = useCallback((update: (snapshot: DiagramSnapshot) => DiagramSnapshot) => {
    setDocument((current) => updateActivePage(current, (page) => ({ ...page, ...update({ nodes: page.nodes, edges: page.edges }) })))
  }, [])

  const refreshRecentDocuments = useCallback(async () => {
    setRecentDocuments(await listDiagramDocuments())
  }, [])

  useEffect(() => {
    const restore = async () => {
      const savedId = localStorage.getItem('99draw:active-document')
      const persisted = savedId ? await loadDiagramDocument(savedId) : null
      if (persisted) {
        setDocument(persisted)
      } else {
        const legacy = loadLegacySnapshot()
        const language = getStoredLanguage()
        if (legacy) setDocument(createLocalizedDocument(language, legacy, translate(language, 'document.recoveredName')))
      }
      setHydrated(true)
      void refreshRecentDocuments()
    }
    void restore()
  }, [refreshRecentDocuments])

  useEffect(() => {
    if (!activePage.layers.some((layer) => layer.id === activeLayerId && layer.visible && !layer.locked)) {
      setActiveLayerId(activePage.layers.find((layer) => layer.visible && !layer.locked)?.id ?? activePage.layers[0]?.id ?? null)
    }
  }, [activeLayerId, activePage.layers])

  useEffect(() => {
    if (commandPaletteOpen) commandInput.current?.focus()
  }, [commandPaletteOpen])

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme
    localStorage.setItem('99draw:theme', theme)
  }, [theme])

  useEffect(() => {
    globalThis.document.documentElement.lang = language
    localStorage.setItem('99draw:language', language)
  }, [language])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 959px)')
    const update = () => setCompactReadOnly(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const checkpoint = useCallback(() => {
    if (restoringHistory.current) return
    const next = cloneSnapshot({ nodes: pageNodes, edges: pageEdges })
    const previous = previousSnapshot.current

    if (JSON.stringify(next) === JSON.stringify(previous)) return

    setHistory((items) => [...items.slice(-49), previous])
    setFuture([])
    previousSnapshot.current = next
  }, [pageEdges, pageNodes])

  useEffect(() => {
    window.clearTimeout(historyTimer.current)
    historyTimer.current = window.setTimeout(checkpoint, 350)
    return () => window.clearTimeout(historyTimer.current)
  }, [checkpoint])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('99draw:active-document', document.id)
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...cloneSnapshot(activePage) }))
    void saveDiagramDocument(document).then(() => {
      setStatus(t('status.saved'))
      void refreshRecentDocuments()
    })
  }, [activePage, document, hydrated, refreshRecentDocuments, t])

  const onNodesChange = useCallback((changes: NodeChange<DiagramNode>[]) => {
    const removedIds = changes.filter((change) => change.type === 'remove').map((change) => change.id)
    const otherChanges = changes.filter((change) => change.type !== 'remove')
    updateSnapshot((current) => {
      const next = removedIds.length ? deleteNodes(current, removedIds) : current
      return otherChanges.length ? reconcileContainerMembership({ ...next, nodes: applyNodeChanges(otherChanges, next.nodes) }) : next
    })
  }, [updateSnapshot])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    updateSnapshot((current) => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))
  }, [updateSnapshot])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    updateSnapshot((current) => ({ ...current, edges: addEdge({ ...createEdge(connection.source, connection.target), ...connection }, current.edges) }))
  }, [updateSnapshot])

  const onReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    if (!connection.source || !connection.target) return
    updateSnapshot((current) => ({ ...current, edges: reconnectEdge(oldEdge, connection, current.edges) }))
    setSelection({ type: 'edge', id: oldEdge.id })
    setStatus(t('status.reconnected'))
  }, [t, updateSnapshot])

  const openDiagramFile = useCallback((file: File) => {
    if (file.size > maxDocumentBytes) {
      window.alert(t('alert.fileTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const value = parseDiagramDocument(JSON.parse(String(reader.result)))
        if (!value) throw new Error('invalid')
        restoringHistory.current = true
        setDocument(value)
        setSelection(null)
        setHistory([])
        setFuture([])
        previousSnapshot.current = cloneSnapshot(getActivePage(value))
        setStatus(t('status.openedFile', { name: file.name }))
        queueMicrotask(() => { restoringHistory.current = false })
      } catch {
        window.alert(t('alert.fileInvalid'))
      }
    }
    reader.onerror = () => window.alert(t('alert.fileReadFailed'))
    reader.readAsText(file)
  }, [t])

  const addNode = useCallback((kind: NodeKind, position = { x: 380, y: 250 }) => {
    const baseNode = createNode(kind, position)
    const node = {
      ...baseNode,
      data: {
        ...baseNode.data,
        label: t(nodeDefaultLabelKeys[kind]),
        layerId: activeLayerId ?? activePage.layers[0]?.id,
      },
    }
    updateSnapshot((current) => ({ ...current, nodes: [...current.nodes, node] }))
    setSelection({ type: 'node', id: node.id })
  }, [activeLayerId, activePage.layers, t, updateSnapshot])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      openDiagramFile(file)
      return
    }
    const kind = event.dataTransfer.getData('application/99draw-node') as NodeKind
    if (!kind) return
    addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }, [addNode, openDiagramFile, screenToFlowPosition])

  const onDragStart = (event: DragEvent<HTMLButtonElement>, kind: NodeKind) => {
    event.dataTransfer.setData('application/99draw-node', kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  const updateSelected = (patch: Partial<DiagramNodeData>) => {
    if (!selectedNode) return
    updateSnapshot((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === selectedNode.id
      ? { ...node, data: { ...node.data, ...patch } }
      : node) }))
  }

  const updateSelectedEdge = (patch: Partial<Edge>) => {
    if (!selectedEdge) return
    updateSnapshot((current) => ({ ...current, edges: current.edges.map((edge) => edge.id === selectedEdge.id ? { ...edge, ...patch } : edge) }))
  }

  const updateSelectedSwimlane = (update: (swimlane: SwimlaneData) => SwimlaneData) => {
    if (!selectedNode || selectedNode.data.kind !== 'swimlane') return
    const current = selectedNode.data.swimlane ?? { direction: 'horizontal' as const, lanes: ['Lane 1', 'Lane 2', 'Lane 3'] }
    updateSelected({ swimlane: update(current) })
  }

  const buildScopedSnapshot = useCallback((rootNodes: DiagramNode[]): DiagramSnapshot => {
    return scopeSnapshot({ nodes: pageNodes, edges: pageEdges }, rootNodes.map((node) => node.id))
  }, [pageEdges, pageNodes])

  const deleteSelection = useCallback(() => {
    if (selectedNode) {
      updateSnapshot((current) => deleteNodes(current, [selectedNode.id]))
    } else if (selectedEdge) {
      updateSnapshot((current) => ({ ...current, edges: current.edges.filter((edge) => edge.id !== selectedEdge.id) }))
    } else {
      return
    }
    setSelection(null)
    setContextMenu(null)
  }, [selectedEdge, selectedNode, updateSnapshot])

  const deleteTarget = (target: ContextMenuTarget) => {
    if (target.type === 'node') {
      updateSnapshot((current) => deleteNodes(current, [target.id]))
    } else {
      updateSnapshot((current) => ({ ...current, edges: current.edges.filter((edge) => edge.id !== target.id) }))
    }
    setSelection(null)
    setContextMenu(null)
  }

  const duplicateTargetNode = (id: string) => {
    const node = pageNodes.find((item) => item.id === id)
    if (node) duplicateNode(node)
    setContextMenu(null)
  }

  const renameTargetNode = (id: string) => {
    const node = pageNodes.find((item) => item.id === id)
    if (!node) return
    const label = window.prompt(t('prompt.nodeLabel'), node.data.label)
    if (label !== null) updateSnapshot((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === id ? { ...item, data: { ...item.data, label } } : item) }))
    setContextMenu(null)
  }

  const bringTargetToFront = (target: ContextMenuTarget) => {
    if (target.type !== 'node') return
    updateSnapshot((current) => {
      const zIndex = Math.max(0, ...current.nodes.map((node) => node.zIndex ?? 0)) + 1
      return { ...current, nodes: current.nodes.map((node) => node.id === target.id ? { ...node, zIndex } : node) }
    })
    setContextMenu(null)
  }

  const setTargetEdgeType = (target: ContextMenuTarget, type: Edge['type']) => {
    if (target.type !== 'edge') return
    updateSnapshot((current) => ({ ...current, edges: current.edges.map((edge) => edge.id === target.id ? { ...edge, type } : edge) }))
    setContextMenu(null)
  }

  const openContextMenu = (event: ReactMouseEvent, target: ContextMenuTarget) => {
    event.preventDefault()
    setSelection(target)
    setContextMenu({ ...target, x: event.clientX, y: event.clientY })
  }

  const duplicateNode = (node: DiagramNode) => {
    if (node.data.kind !== 'group' && node.data.kind !== 'swimlane') {
      const duplicate = {
        ...cloneSnapshot({ nodes: [node], edges: [] }).nodes[0],
        id: crypto.randomUUID(),
        position: { x: node.position.x + 42, y: node.position.y + 42 },
        selected: true,
        data: { ...node.data, label: t('node.copyLabel', { label: node.data.label }) },
      }
      updateSnapshot((current) => ({ ...current, nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), duplicate] }))
      setSelection({ type: 'node', id: duplicate.id })
      return
    }

    const source = buildScopedSnapshot([node])
    const idMap = new Map<string, string>()
    source.nodes.forEach((item) => idMap.set(item.id, crypto.randomUUID()))
    const duplicateNodes = source.nodes.map((item) => {
      const parentId = item.parentId ? idMap.get(item.parentId) : undefined
      return {
        ...item,
        id: idMap.get(item.id)!,
        parentId,
        extent: parentId ? item.extent : undefined,
        position: parentId ? item.position : { x: item.position.x + 42, y: item.position.y + 42 },
        selected: item.id === node.id,
        data: { ...item.data, label: item.id === node.id ? t('node.copyLabel', { label: item.data.label }) : item.data.label },
      }
    })
    const duplicateEdges = source.edges.map((edge) => ({ ...edge, id: crypto.randomUUID(), source: idMap.get(edge.source)!, target: idMap.get(edge.target)! }))
    updateSnapshot((current) => ({ nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), ...duplicateNodes], edges: [...current.edges, ...duplicateEdges] }))
    setSelection({ type: 'node', id: idMap.get(node.id)! })
  }

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected || node.id === selectedNode?.id)
    if (!selectedNodes.length) return
    const snapshot = buildScopedSnapshot(selectedNodes)
    clipboard.current = snapshot
    setStatus(t('status.copiedShapes', { count: snapshot.nodes.length }))
  }, [buildScopedSnapshot, nodes, selectedNode?.id, t])

  const pasteClipboard = useCallback(() => {
    if (!clipboard.current) return
    const idMap = new Map<string, string>()
    clipboard.current.nodes.forEach((node) => idMap.set(node.id, crypto.randomUUID()))
    const pastedNodes = clipboard.current.nodes.map((node) => {
      const parentId = node.parentId ? idMap.get(node.parentId) : undefined
      return {
        ...node,
        id: idMap.get(node.id)!,
        parentId,
        extent: parentId ? node.extent : undefined,
        position: parentId ? node.position : { x: node.position.x + 36, y: node.position.y + 36 },
        selected: !parentId,
      }
    })
    const pastedEdges = clipboard.current.edges.map((edge) => ({ ...edge, id: crypto.randomUUID(), source: idMap.get(edge.source)!, target: idMap.get(edge.target)! }))
    updateSnapshot((current) => ({
      nodes: [...current.nodes.map((node) => ({ ...node, selected: false })), ...pastedNodes],
      edges: [...current.edges.map((edge) => ({ ...edge, selected: false })), ...pastedEdges],
    }))
    if (pastedNodes[0]) setSelection({ type: 'node', id: pastedNodes[0].id })
    setStatus(t('status.pastedShapes', { count: pastedNodes.length }))
  }, [t, updateSnapshot])

  const selectAll = useCallback(() => {
    updateSnapshot((current) => ({
      nodes: current.nodes.map((node) => ({ ...node, selected: true })),
      edges: current.edges.map((edge) => ({ ...edge, selected: true })),
    }))
  }, [updateSnapshot])

  const connectSelectedNodes = useCallback(() => {
    const selected = pageNodes
      .filter((node) => node.selected || node.id === selectedNode?.id)
      .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x))
    if (selected.length < 2) return

    const existing = new Set(pageEdges.map((edge) => `${edge.source}->${edge.target}`))
    const edgesToAdd: Edge[] = []
    for (let index = 0; index < selected.length - 1; index += 1) {
      const source = selected[index].id
      const target = selected[index + 1].id
      if (source === target || existing.has(`${source}->${target}`)) continue
      const edge = createEdge(source, target)
      edgesToAdd.push(edge)
      existing.add(`${source}->${target}`)
    }
    if (!edgesToAdd.length) return

    updateSnapshot((current) => ({ ...current, edges: [...current.edges, ...edgesToAdd] }))
    setSelection({ type: 'edge', id: edgesToAdd.at(-1)!.id })
    setStatus(t('status.connectedShapes', { count: edgesToAdd.length }))
  }, [pageEdges, pageNodes, selectedNode?.id, t, updateSnapshot])

  const arrangeSelected = (action: 'align-x' | 'align-y' | 'distribute-x' | 'distribute-y' | 'front' | 'back') => {
    const selected = pageNodes.filter((node) => node.selected || node.id === selectedNode?.id)
    if (selected.length < (action.startsWith('distribute') ? 3 : 1)) return
    const updates = new Map<string, Partial<DiagramNode>>()

    if (action === 'align-x') {
      const x = Math.min(...selected.map((node) => node.position.x))
      selected.forEach((node) => updates.set(node.id, { position: { ...node.position, x } }))
    } else if (action === 'align-y') {
      const y = Math.min(...selected.map((node) => node.position.y))
      selected.forEach((node) => updates.set(node.id, { position: { ...node.position, y } }))
    } else if (action === 'distribute-x' || action === 'distribute-y') {
      const axis = action === 'distribute-x' ? 'x' : 'y'
      const ordered = [...selected].sort((a, b) => a.position[axis] - b.position[axis])
      const start = ordered[0].position[axis]
      const end = ordered.at(-1)!.position[axis]
      const gap = (end - start) / (ordered.length - 1)
      ordered.forEach((node, index) => updates.set(node.id, { position: { ...node.position, [axis]: start + gap * index } }))
    } else {
      const zIndex = action === 'front' ? Math.max(0, ...pageNodes.map((node) => node.zIndex ?? 0)) + 1 : Math.min(0, ...pageNodes.map((node) => node.zIndex ?? 0)) - 1
      selected.forEach((node) => updates.set(node.id, { zIndex }))
    }

    updateSnapshot((current) => ({ ...current, nodes: current.nodes.map((node) => updates.has(node.id) ? { ...node, ...updates.get(node.id)! } : node) }))
  }

  const fitSelection = useCallback(() => {
    const selectedIds = new Set(pageNodes.filter((node) => node.selected || node.id === selectedNode?.id).map((node) => node.id))
    if (selectedEdge) {
      selectedIds.add(selectedEdge.source)
      selectedIds.add(selectedEdge.target)
    }
    const selected = pageNodes.filter((node) => selectedIds.has(node.id))
    if (!selected.length) {
      void fitView({ padding: 0.28, duration: 250 })
      return
    }
    void fitBounds(getNodesBounds(selected), { padding: 0.25, duration: 250 })
  }, [fitBounds, fitView, getNodesBounds, pageNodes, selectedEdge, selectedNode?.id])

  const groupSelection = () => {
    const selected = pageNodes.filter((node) => (node.selected || node.id === selectedNode?.id) && !node.parentId)
    if (selected.length < 2) return
    const left = Math.min(...selected.map((node) => node.position.x)) - 32
    const top = Math.min(...selected.map((node) => node.position.y)) - 42
    const right = Math.max(...selected.map((node) => node.position.x + (node.measured?.width ?? 164))) + 32
    const bottom = Math.max(...selected.map((node) => node.position.y + (node.measured?.height ?? 64))) + 32
    const group = {
      ...createNode('group', { x: left, y: top }, t('node.groupDefault')),
      style: { width: right - left, height: bottom - top },
      zIndex: Math.min(...selected.map((node) => node.zIndex ?? 0)) - 1,
    }
    const childIds = new Set(selected.map((node) => node.id))
    updateSnapshot((current) => ({
      ...current,
      nodes: [
        group,
        ...current.nodes.map((node) => childIds.has(node.id)
          ? { ...node, parentId: group.id, extent: 'parent' as const, position: { x: node.position.x - left, y: node.position.y - top }, selected: false }
          : node),
      ],
    }))
    setSelection({ type: 'node', id: group.id })
  }

  const ungroupSelection = () => {
    const groupId = selectedNode?.data.kind === 'group'
      ? selectedNode.id
      : pageNodes.find((node) => node.id === selectedNode?.parentId)?.id
    const group = pageNodes.find((node) => node.id === groupId && node.data.kind === 'group')
    if (!group) return
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== group.id).map((node) => node.parentId === group.id
        ? { ...node, parentId: undefined, extent: undefined, position: { x: node.position.x + group.position.x, y: node.position.y + group.position.y } }
        : node),
    }))
    setSelection(null)
  }

  const switchPage = (pageId: string) => {
    setDocument((current) => {
      const next = selectPage(current, pageId)
      previousSnapshot.current = cloneSnapshot(getActivePage(next))
      return next
    })
    setSelection(null)
    setHistory([])
    setFuture([])
  }

  const appendPage = () => {
    setDocument((current) => {
      const next = addPage(current, t('document.pageName', { index: current.pages.length + 1 }))
      previousSnapshot.current = cloneSnapshot(getActivePage(next))
      return next
    })
    setSelection(null)
    setHistory([])
    setFuture([])
  }

  const renamePage = (pageId: string) => {
    const page = document.pages.find((item) => item.id === pageId)
    const name = page ? window.prompt(t('prompt.pageName'), page.name) : null
    if (!name?.trim()) return
    setDocument((current) => updatePage(current, pageId, (currentPage) => ({ ...currentPage, name: name.trim() })))
  }

  const deleteActivePage = () => {
    if (document.pages.length === 1 || !window.confirm(t('prompt.deletePageConfirm', { name: activePage.name }))) return
    setDocument((current) => {
      const next = removePage(current, current.activePageId)
      previousSnapshot.current = cloneSnapshot(getActivePage(next))
      return next
    })
    setSelection(null)
    setHistory([])
    setFuture([])
  }

  const renameDocument = () => {
    const name = window.prompt(t('prompt.documentName'), document.name)
    if (name?.trim()) setDocument((current) => ({ ...current, name: name.trim(), updatedAt: new Date().toISOString() }))
  }

  const addLayer = () => {
    const name = window.prompt(t('prompt.layerName'), t('prompt.defaultLayerName', { index: activePage.layers.length + 1 }))
    if (!name?.trim()) return
    const layer = createLayer(name.trim())
    setDocument((current) => updateActivePage(current, (page) => ({ ...page, layers: [...page.layers, layer] })))
    setActiveLayerId(layer.id)
  }

  const toggleLayer = (layerId: string, property: 'visible' | 'locked') => {
    setDocument((current) => updateActivePage(current, (page) => ({
      ...page,
      layers: page.layers.map((layer) => layer.id === layerId ? { ...layer, [property]: !layer[property] } : layer),
    })))
  }

  const renameLayer = (layerId: string) => {
    const layer = activePage.layers.find((item) => item.id === layerId)
    const name = layer ? window.prompt(t('prompt.layerName'), layer.name) : null
    if (!name?.trim()) return
    setDocument((current) => updateActivePage(current, (page) => ({
      ...page,
      layers: page.layers.map((item) => item.id === layerId ? { ...item, name: name.trim() } : item),
    })))
  }

  const moveLayer = (layerId: string, direction: -1 | 1) => {
    setDocument((current) => updateActivePage(current, (page) => {
      const index = page.layers.findIndex((layer) => layer.id === layerId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= page.layers.length) return page
      const layers = [...page.layers]
      const [layer] = layers.splice(index, 1)
      layers.splice(nextIndex, 0, layer)
      return { ...page, layers }
    }))
  }

  const undo = useCallback(() => {
    setHistory((items) => {
      const target = items.at(-1)
      if (!target) return items
      restoringHistory.current = true
      const current = cloneSnapshot({ nodes: pageNodes, edges: pageEdges })
      setFuture((next) => [current, ...next])
      updateSnapshot(() => target)
      previousSnapshot.current = target
      queueMicrotask(() => { restoringHistory.current = false })
      return items.slice(0, -1)
    })
  }, [pageEdges, pageNodes, updateSnapshot])

  const redo = useCallback(() => {
    setFuture((items) => {
      const target = items[0]
      if (!target) return items
      restoringHistory.current = true
      const current = cloneSnapshot({ nodes: pageNodes, edges: pageEdges })
      setHistory((next) => [...next, current])
      updateSnapshot(() => target)
      previousSnapshot.current = target
      queueMicrotask(() => { restoringHistory.current = false })
      return items.slice(1)
    })
  }, [pageEdges, pageNodes, updateSnapshot])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      } else if (event.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      } else if (event.key === '?' && !modifier) {
        setShortcutsOpen(true)
      } else if (modifier && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFindReplaceOpen(true)
      } else if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (modifier && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copySelection()
      } else if (modifier && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteClipboard()
      } else if (modifier && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        selectAll()
      } else if (modifier && event.key.toLowerCase() === 'd' && selectedNode) {
        event.preventDefault()
        duplicateNode(selectedNode)
      } else if (modifier && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        newDiagram()
      } else if (modifier && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        fileInput.current?.click()
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && (selectedNode || selectedEdge)) {
        event.preventDefault()
        deleteSelection()
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const selectedIds = new Set(pageNodes.filter((node) => node.selected || node.id === selectedNode?.id).map((node) => node.id))
        if (!selectedIds.size) return
        event.preventDefault()
        const amount = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0
        const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0
        updateSnapshot((current) => ({ ...current, nodes: current.nodes.map((node) => selectedIds.has(node.id) ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } } : node) }))
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [commandPaletteOpen, copySelection, deleteSelection, pageNodes, pasteClipboard, redo, selectAll, selectedEdge, selectedNode, undo, updateSnapshot])

  const newDiagram = () => {
    if (!window.confirm(t('prompt.newDiagramConfirm'))) return
    restoringHistory.current = true
    setDocument(createLocalizedDocument(language))
    setSelection(null)
    setHistory([])
    setFuture([])
    previousSnapshot.current = { nodes: [], edges: [] }
    queueMicrotask(() => { restoringHistory.current = false })
  }

  const exportDiagram = () => {
    const contents = serializeDiagramDocument(document)
    download(contents, `${safeFilename(document.name)}.99draw.json`, 'application/json')
    setStatus(t('status.exportedJson'))
  }

  const exportDocumentSnapshot = (name: string, snapshot: DiagramSnapshot, filename: string, pageName = t('document.defaultPageName')) => {
    const scopedDocument = createDocumentFromSnapshot(name, snapshot, { pageName, layers: activePage.layers })
    const contents = serializeDiagramDocument(scopedDocument)
    download(contents, `${safeFilename(filename)}.99draw.json`, 'application/json')
    setStatus(t('status.exportedFile', { name: filename }))
  }

  const exportActivePage = () => {
    exportDocumentSnapshot(`${document.name} - ${activePage.name}`, activePage, `${document.name}-${activePage.name}`, activePage.name)
  }

  const exportSelection = () => {
    const selectedNodes = pageNodes.filter((node) => node.selected || node.id === selectedNode?.id)
    if (!selectedNodes.length) {
      window.alert(t('alert.exportSelectionEmpty'))
      return
    }
    exportDocumentSnapshot(`${document.name} - ${t('document.selectionSuffix')}`, buildScopedSnapshot(selectedNodes), `${document.name}-selection`)
  }

  const exportImage = async (format: 'svg' | 'png' | 'pdf') => {
    const filename = safeFilename(document.name)
    setStatus(t('status.exportingFormat', { format: format.toUpperCase() }))
    try {
      const svg = exportSnapshotToSvg({ nodes, edges }, { title: `${document.name} - ${activePage.name}` })
      if (format === 'svg') {
        download(svg, `${filename}.svg`, 'image/svg+xml')
      } else if (format === 'png') {
        downloadDataUrl(await rasterizeSvgToPngDataUrl(svg), `${filename}.png`)
      } else {
        const dataUrl = await rasterizeSvgToPngDataUrl(svg)
        const { jsPDF } = await import('jspdf')
        const image = await loadImage(dataUrl)
        const orientation = image.width > image.height ? 'landscape' : 'portrait'
        const pdf = new jsPDF({ orientation, unit: 'px', format: [image.width, image.height] })
        pdf.addImage(dataUrl, 'PNG', 0, 0, image.width, image.height)
        pdf.save(`${filename}.pdf`)
      }
      setStatus(t('status.exportedFormat', { format: format.toUpperCase() }))
    } catch {
      setStatus(t('status.exportFailedFormat', { format: format.toUpperCase() }))
      window.alert(t('alert.exportImageFailed'))
    }
  }

  const copyCanvasImage = async () => {
    const target = canvasRef.current?.querySelector<HTMLElement>('.react-flow__viewport')
    if (!target) return
    if (!navigator.clipboard?.write || !('ClipboardItem' in window)) {
      window.alert(t('alert.clipboardUnsupported'))
      return
    }
    setStatus(t('status.copyingImage'))
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(target, { backgroundColor: '#ffffff', pixelRatio: 2 })
      if (!blob) throw new Error('empty image')
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
      setStatus(t('status.copiedImage'))
    } catch {
      setStatus(t('status.copyImageFailed'))
      window.alert(t('alert.copyImageFailed'))
    }
  }

  const applyAutoLayout = async (direction: LayoutDirection) => {
    if (pageNodes.length < 2) return
    setStatus(t('status.layouting'))
    try {
      const positions = await runLayoutWorker(pageNodes, pageEdges, direction)
      updateSnapshot((current) => ({ ...current, nodes: applyLayoutPositions(current.nodes, positions) }))
      setStatus(t('status.layoutDone'))
      void fitView({ padding: 0.2, duration: 250 })
    } catch {
      setStatus(t('status.layoutFailed'))
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    const copy = templateText(template, language)
    if (pageNodes.length && !window.confirm(t('prompt.replaceTemplateConfirm', { page: activePage.name, template: copy.name }))) return
    updateSnapshot(() => template.snapshot(language))
    setSelection(null)
    setTemplatePickerOpen(false)
    setStatus(t('status.templateApplied', { name: copy.name }))
    void fitView({ padding: 0.25, duration: 250 })
  }

  const openDemo = (demoId: string) => {
    const demo = demoGallery.find((item) => item.id === demoId)
    if (!demo) return
    const copy = demoText(demo, language)
    const hasCurrentWork = document.pages.some((page) => page.nodes.length || page.edges.length)
    if (hasCurrentWork && !window.confirm(t('prompt.replaceDemoConfirm', { name: copy.name }))) return

    const next = createDocumentFromSnapshot(copy.name, demo.snapshot(language), {
      pageName: copy.name,
      layers: demo.layers,
    })
    restoringHistory.current = true
    setDocument(next)
    setSelection(null)
    setHistory([])
    setFuture([])
    previousSnapshot.current = cloneSnapshot(getActivePage(next))
    setDemoGalleryOpen(false)
    setStatus(t('status.demoOpened', { name: copy.name }))
    queueMicrotask(() => { restoringHistory.current = false })
    void fitView({ padding: 0.25, duration: 250 })
  }

  const openMermaidImport = () => setTextImport({ kind: 'mermaid', value: '' })
  const openCsvImport = () => setTextImport({ kind: 'csv', value: '' })

  const importMermaid = (source: string) => {
    const diagram = parseMermaidFlowchart(source)
    if (!diagram) {
      window.alert(t('alert.mermaidUnsupported'))
      return
    }
    updateSnapshot(() => diagram)
    setSelection(null)
    setTextImport(null)
    setStatus(t('status.mermaidImported'))
    void fitView({ padding: 0.25, duration: 250 })
  }

  const importCsv = (source: string) => {
    const diagram = parseCsvDiagram(source)
    if (!diagram) {
      window.alert(t('alert.csvUnsupported'))
      return
    }
    updateSnapshot(() => diagram)
    setSelection(null)
    setTextImport(null)
    setStatus(t('status.csvImported'))
    void fitView({ padding: 0.25, duration: 250 })
  }

  const submitTextImport = () => {
    if (!textImport?.value.trim()) return
    if (textImport.kind === 'mermaid') {
      importMermaid(textImport.value)
    } else {
      importCsv(textImport.value)
    }
  }

  const replaceLabels = () => {
    if (!findValue) return
    let matches = 0
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (!node.data.label.includes(findValue)) return node
        matches += 1
        return { ...node, data: { ...node.data, label: node.data.label.split(findValue).join(replaceValue) } }
      }),
    }))
    setStatus(matches ? t('status.replaceMatches', { count: matches }) : t('status.replaceNone'))
  }

  const cycleTheme = () => setTheme((current) => current === 'light' ? 'dark' : current === 'dark' ? 'contrast' : 'light')

  const importDiagram = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) openDiagramFile(file)
    event.target.value = ''
  }

  const uploadSelectedImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedNode || selectedNode.data.kind !== 'image') {
      event.target.value = ''
      return
    }
    if (!/^image\/(?:png|jpe?g|webp|gif)$/i.test(file.type)) {
      window.alert(t('alert.imageTypeUnsupported'))
      event.target.value = ''
      return
    }
    if (file.size > maxEmbeddedImageBytes) {
      window.alert(t('alert.imageTooLarge'))
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateSelected({ imageDataUrl: String(reader.result), label: selectedNode.data.label === t('node.imageDefaultLabel') ? file.name.replace(/\.[^.]+$/, '') : selectedNode.data.label })
      setStatus(t('status.imageAdded', { name: file.name }))
    }
    reader.onerror = () => window.alert(t('alert.imageReadFailed'))
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const openRecentDocument = async (id: string) => {
    const saved = await loadDiagramDocument(id)
    if (!saved) {
      setStatus(t('status.openRecentFailed'))
      return
    }
    restoringHistory.current = true
    setDocument(saved)
    setSelection(null)
    setHistory([])
    setFuture([])
    previousSnapshot.current = cloneSnapshot(getActivePage(saved))
    setRecentOpen(false)
    setStatus(t('status.openedDocument', { name: saved.name }))
    queueMicrotask(() => { restoringHistory.current = false })
  }

  const selectedSummary = useMemo(() => selectedNode?.data.kind ?? (selectedEdge ? 'connector' : 'canvas'), [selectedEdge, selectedNode])
  const selectedSwimlane = selectedNode?.data.kind === 'swimlane' ? selectedNode.data.swimlane ?? { direction: 'horizontal' as const, lanes: ['Lane 1', 'Lane 2', 'Lane 3'] } : null
  const selectedChildCount = selectedNode ? containerChildCount(selectedNode.id, pageNodes) : 0
  const selectedLaneMembership = selectedNode ? getSwimlaneMembership(selectedNode.id, pageNodes) : null
  const outlineNodeCount = nodes.length
  const nodeLabelById = useMemo(() => new Map(pageNodes.map((node) => [node.id, node.data.label])), [pageNodes])
  const selectOutlineNode = useCallback((nodeId: string) => {
    const node = pageNodes.find((item) => item.id === nodeId)
    if (!node) return
    setSelection({ type: 'node', id: node.id })
    void fitBounds(getNodesBounds([node]), { padding: 0.35, duration: 250 })
  }, [fitBounds, getNodesBounds, pageNodes])
  const selectOutlineEdge = useCallback((edgeId: string) => {
    const edge = pageEdges.find((item) => item.id === edgeId)
    if (!edge) return
    setSelection({ type: 'edge', id: edge.id })
    const terminals = pageNodes.filter((node) => node.id === edge.source || node.id === edge.target)
    if (terminals.length) void fitBounds(getNodesBounds(terminals), { padding: 0.35, duration: 250 })
  }, [fitBounds, getNodesBounds, pageEdges, pageNodes])
  const commands = [
    { id: 'new', label: t('command.new'), shortcut: '⌘ N', execute: newDiagram },
    { id: 'open', label: t('command.open'), shortcut: '⌘ O', execute: () => fileInput.current?.click() },
    { id: 'export-json', label: t('command.exportJson'), shortcut: '', execute: exportDiagram },
    { id: 'export-page', label: t('command.exportPage'), shortcut: '', execute: exportActivePage },
    { id: 'export-selection', label: t('command.exportSelection'), shortcut: '', execute: exportSelection },
    { id: 'export-svg', label: t('command.exportSvg'), shortcut: '', execute: () => void exportImage('svg') },
    { id: 'export-png', label: t('command.exportPng'), shortcut: '', execute: () => void exportImage('png') },
    { id: 'export-pdf', label: t('command.exportPdf'), shortcut: '', execute: () => void exportImage('pdf') },
    { id: 'copy-image', label: t('command.copyImage'), shortcut: '', execute: () => void copyCanvasImage() },
    { id: 'layout', label: t('command.layoutDown'), shortcut: '', execute: () => void applyAutoLayout('DOWN') },
    { id: 'mermaid', label: t('command.mermaid'), shortcut: '', execute: openMermaidImport },
    { id: 'csv', label: t('command.csv'), shortcut: '', execute: openCsvImport },
    { id: 'templates', label: t('command.templates'), shortcut: '', execute: () => setTemplatePickerOpen(true) },
    { id: 'demos', label: t('command.demos'), shortcut: '', execute: () => setDemoGalleryOpen(true) },
    { id: 'find-replace', label: t('command.findReplace'), shortcut: '⌘ F', execute: () => setFindReplaceOpen(true) },
    { id: 'theme', label: t('command.theme'), shortcut: '', execute: cycleTheme },
    { id: 'add-process', label: t('command.addProcess'), shortcut: '', execute: () => addNode('process') },
    { id: 'add-decision', label: t('command.addDecision'), shortcut: '', execute: () => addNode('decision') },
    { id: 'add-page', label: t('command.addPage'), shortcut: '', execute: appendPage },
    { id: 'select-all', label: t('command.selectAll'), shortcut: '⌘ A', execute: selectAll },
    { id: 'connect-selected', label: t('command.connectSelected'), shortcut: '', execute: connectSelectedNodes },
    { id: 'fit-selection', label: t('command.fitSelection'), shortcut: '', execute: fitSelection },
    { id: 'group', label: t('command.group'), shortcut: '', execute: groupSelection },
  ]
  const filteredCommands = commands.filter((command) => command.label.toLocaleLowerCase(language).includes(commandQuery.toLocaleLowerCase(language)))

  const executeCommand = (command: typeof commands[number]) => {
    setCommandPaletteOpen(false)
    setCommandQuery('')
    window.setTimeout(() => command.execute(), 0)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><GitFork size={18} strokeWidth={2.5} /></div>
          <span>99draw</span>
          <span className="beta">{t('app.beta')}</span>
        </div>
        <button className="document-title" title={t('topbar.renameDocument')} onClick={renameDocument}><span className="save-dot" />{document.name}</button>
        <div className="topbar-actions">
          <button className="button quiet" onClick={() => setLanguage((current) => nextLanguage(current))} title={t('language.title')} aria-label={`${t('language.title')}: ${t('language.toggle')}`}>{t('language.toggle')}</button>
          <button className="button quiet" onClick={newDiagram}><Plus size={16} />{t('topbar.new')}</button>
          <button className="button quiet" onClick={() => fileInput.current?.click()}><FolderOpen size={16} />{t('topbar.open')}</button>
          <button className="button quiet" onClick={() => { void refreshRecentDocuments(); setRecentOpen(true) }}>{t('topbar.recent')}</button>
          <button className="button primary" onClick={exportDiagram}><Download size={16} />{t('topbar.exportFile')}</button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json,.99draw" aria-label={t('topbar.open')} onChange={importDiagram} />
        </div>
      </header>

      <nav className="toolbar" aria-label={t('toolbar.arrange')}>
        <div className="tool-group">
          <button className="icon-button" title={t('toolbar.undo')} aria-label={t('toolbar.undo')} disabled={!history.length} onClick={undo}><Undo2 size={17} /></button>
          <button className="icon-button" title={t('toolbar.redo')} aria-label={t('toolbar.redo')} disabled={!future.length} onClick={redo}><Redo2 size={17} /></button>
          <button className="icon-button" title={t('toolbar.copy')} aria-label={t('toolbar.copy')} onClick={copySelection}><ClipboardCopy size={17} /></button>
          <button className="icon-button" title={t('toolbar.paste')} aria-label={t('toolbar.paste')} disabled={!clipboard.current} onClick={pasteClipboard}><ClipboardPaste size={17} /></button>
        </div>
        <div className="tool-group export-group" aria-label={t('topbar.exportFile')}>
          <button className="icon-button" title={t('toolbar.exportSvg')} aria-label={t('toolbar.exportSvg')} onClick={() => void exportImage('svg')}>SVG</button>
          <button className="icon-button" title={t('toolbar.exportPng')} aria-label={t('toolbar.exportPng')} onClick={() => void exportImage('png')}>PNG</button>
          <button className="icon-button" title={t('toolbar.exportPdf')} aria-label={t('toolbar.exportPdf')} onClick={() => void exportImage('pdf')}>PDF</button>
          <button className="icon-button" title={t('toolbar.copyPng')} aria-label={t('toolbar.copyPng')} onClick={() => void copyCanvasImage()}><Copy size={16} /></button>
        </div>
        <div className="tool-group" aria-label={t('toolbar.arrange')}>
          <button className="icon-button" title={t('toolbar.alignLeft')} aria-label={t('toolbar.alignLeft')} onClick={() => arrangeSelected('align-x')}>↤</button>
          <button className="icon-button" title={t('toolbar.alignTop')} aria-label={t('toolbar.alignTop')} onClick={() => arrangeSelected('align-y')}>↥</button>
          <button className="icon-button" title={t('toolbar.distributeX')} aria-label={t('toolbar.distributeX')} onClick={() => arrangeSelected('distribute-x')}>↔</button>
          <button className="icon-button" title={t('toolbar.distributeY')} aria-label={t('toolbar.distributeY')} onClick={() => arrangeSelected('distribute-y')}>↕</button>
          <button className="icon-button" title={t('toolbar.front')} aria-label={t('toolbar.front')} onClick={() => arrangeSelected('front')}>⇧</button>
          <button className="icon-button" title={t('toolbar.back')} aria-label={t('toolbar.back')} onClick={() => arrangeSelected('back')}>⇩</button>
          <button className="icon-button" title={t('toolbar.group')} aria-label={t('toolbar.group')} onClick={groupSelection}>⧉</button>
          <button className="icon-button" title={t('toolbar.ungroup')} aria-label={t('toolbar.ungroup')} onClick={ungroupSelection}>⊟</button>
        </div>
        <div className="tool-group">
          <button className="icon-button" title={t('toolbar.autoLayoutDown')} aria-label={t('toolbar.autoLayoutDown')} onClick={() => void applyAutoLayout('DOWN')}><GitBranch size={17} /></button>
          <button className="toolbar-text-button" title={t('toolbar.autoLayoutRight')} onClick={() => void applyAutoLayout('RIGHT')}>{t('toolbar.layout')}</button>
          <button className="toolbar-text-button" title="Cmd/Ctrl+K" onClick={() => setCommandPaletteOpen(true)}>{t('toolbar.commands')}</button>
          <button className="toolbar-text-button" title={t('toolbar.templates')} onClick={() => setTemplatePickerOpen(true)}>{t('toolbar.templates')}</button>
          <button className="toolbar-text-button" title={t('toolbar.demos')} onClick={() => setDemoGalleryOpen(true)}>{t('toolbar.demos')}</button>
          <button className="toolbar-text-button" title={t('command.mermaid')} onClick={openMermaidImport}>Mermaid</button>
          <button className="toolbar-text-button" title={t('command.csv')} onClick={openCsvImport}>CSV</button>
          <button className="toolbar-text-button" title={t('toolbar.shortcuts')} onClick={() => setShortcutsOpen(true)}>?</button>
          <button className="toolbar-text-button" title="Cmd/Ctrl+F" onClick={() => setFindReplaceOpen(true)}>{t('toolbar.find')}</button>
          <button className="toolbar-text-button" title={t('toolbar.theme')} onClick={cycleTheme}>{theme === 'light' ? t('toolbar.themeLight') : theme === 'dark' ? t('toolbar.themeDark') : t('toolbar.themeContrast')}</button>
        </div>
        <div className="toolbar-divider" />
        <button className="icon-button active" title={t('toolbar.select')} aria-label={t('toolbar.select')}><MousePointer2 size={17} /></button>
        <div className="toolbar-divider" />
        <div className="tool-group">
          <button className="icon-button" title={t('toolbar.zoomOut')} aria-label={t('toolbar.zoomOut')} onClick={() => zoomOut()}><Minus size={17} /></button>
          <button className="icon-button" title={t('toolbar.zoomIn')} aria-label={t('toolbar.zoomIn')} onClick={() => zoomIn()}><Plus size={17} /></button>
          <button className="icon-button" title={t('toolbar.fitView')} aria-label={t('toolbar.fitView')} onClick={() => fitView({ padding: 0.28, duration: 250 })}><Maximize2 size={17} /></button>
          <button className="toolbar-text-button" title={t('toolbar.fitSelectionTitle')} onClick={fitSelection}>{t('toolbar.fitSelection')}</button>
        </div>
        <div className="page-tabs" aria-label={t('toolbar.pages')}>
          {document.pages.map((page) => <button key={page.id} className={`page-tab ${page.id === activePage.id ? 'is-active' : ''}`} onClick={() => switchPage(page.id)} onDoubleClick={() => renamePage(page.id)}>{page.name}</button>)}
          <button className="icon-button page-add" title={t('toolbar.addPage')} aria-label={t('toolbar.addPage')} onClick={appendPage}><Plus size={15} /></button>
          {document.pages.length > 1 && <button className="icon-button page-remove" title={t('toolbar.deletePage')} aria-label={t('toolbar.deletePage')} onClick={deleteActivePage}><Trash2 size={14} /></button>}
        </div>
        <span className="toolbar-status"><Save size={14} /> {status}</span>
      </nav>

      <aside className="palette-panel">
        <div className="panel-heading"><span>{t('palette.heading')}</span><small>{t('palette.subheading')}</small></div>
        <div className="shape-list">
          {palette.map(({ kind, labelKey, hintKey, icon: Icon }) => (
            <button
              key={kind}
              className="shape-item"
              draggable
              onDragStart={(event) => onDragStart(event, kind)}
              onClick={() => addNode(kind)}
              title={t(hintKey)}
            >
              <span className={`shape-preview preview-${kind}`}><Icon size={18} /></span>
              <span><strong>{t(labelKey)}</strong><small>{t(hintKey)}</small></span>
            </button>
          ))}
        </div>
        <div className="layers-panel">
          <div className="layers-heading"><span>{t('layers.heading')}</span><button className="icon-button" title={t('layers.add')} aria-label={t('layers.add')} onClick={addLayer}><Plus size={14} /></button></div>
          {activePage.layers.map((layer, index) => <div key={layer.id} className={`layer-row ${layer.id === activeLayerId ? 'is-active' : ''}`}>
            <button className="layer-name" onClick={() => setActiveLayerId(layer.id)} onDoubleClick={() => renameLayer(layer.id)}>{layer.name}</button>
            <button className="layer-action" title={t('layers.moveUp')} aria-label={t('layers.moveUp')} disabled={index === 0} onClick={() => moveLayer(layer.id, -1)}>↑</button>
            <button className="layer-action" title={t('layers.moveDown')} aria-label={t('layers.moveDown')} disabled={index === activePage.layers.length - 1} onClick={() => moveLayer(layer.id, 1)}>↓</button>
            <button className="layer-action" title={layer.visible ? t('layers.hide') : t('layers.show')} aria-label={layer.visible ? t('layers.hide') : t('layers.show')} onClick={() => toggleLayer(layer.id, 'visible')}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
            <button className="layer-action" title={layer.locked ? t('layers.unlock') : t('layers.lock')} aria-label={layer.locked ? t('layers.unlock') : t('layers.lock')} onClick={() => toggleLayer(layer.id, 'locked')}>{layer.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
          </div>)}
        </div>
        <div className="outline-panel">
          <div className="outline-heading"><span>{t('outline.heading')}</span><small>{outlineNodeCount}</small></div>
          {outlineNodeCount ? (
            <>
              <div className="outline-section">{t('outline.nodes')}</div>
              <div className="outline-list" role="list" aria-label={t('outline.nodes')}>
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    className={`outline-item ${selection?.type === 'node' && selection.id === node.id ? 'is-active' : ''}`}
                    onClick={() => selectOutlineNode(node.id)}
                    aria-label={`${node.data.label} ${node.data.kind}`}
                  >
                    <span className={`outline-kind outline-kind-${node.data.kind}`} aria-hidden="true" />
                    <span>
                      <strong>{node.data.label}</strong>
                      <small>{t('outline.nodeMeta', { kind: node.data.kind, x: Math.round(node.position.x), y: Math.round(node.position.y) })}</small>
                    </span>
                  </button>
                ))}
              </div>
              {edges.length > 0 && <>
                <div className="outline-section">{t('outline.edges')}</div>
                <div className="outline-list" role="list" aria-label={t('outline.edges')}>
                  {edges.map((edge) => {
                    const source = nodeLabelById.get(edge.source) ?? edge.source
                    const target = nodeLabelById.get(edge.target) ?? edge.target
                    const label = String(edge.label ?? '').trim() || t('outline.edgeFallback')
                    return (
                      <button
                        key={edge.id}
                        className={`outline-item outline-edge ${selection?.type === 'edge' && selection.id === edge.id ? 'is-active' : ''}`}
                        onClick={() => selectOutlineEdge(edge.id)}
                        aria-label={`${label}: ${source} to ${target}`}
                      >
                        <span className="outline-connector" aria-hidden="true">→</span>
                        <span>
                          <strong>{label}</strong>
                          <small>{t('outline.edgeMeta', { source, target })}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>}
            </>
          ) : <p className="outline-empty">{t('outline.empty')}</p>}
        </div>
        <div className="palette-footnote">
          {t('palette.footnote')}
        </div>
      </aside>

      <section ref={canvasRef} className="canvas-panel" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
        <ReactFlow
          nodes={renderNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onNodeClick={(_, node) => setSelection({ type: 'node', id: node.id })}
          onNodeDoubleClick={(_, node) => {
            if (compactReadOnly) return
            const label = window.prompt(t('prompt.nodeLabel'), node.data.label)
            if (label !== null) updateSnapshot((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, data: { ...item.data, label } } : item) }))
          }}
          onEdgeClick={(_, edge) => setSelection({ type: 'edge', id: edge.id })}
          onNodeContextMenu={(event, node) => openContextMenu(event, { type: 'node', id: node.id })}
          onEdgeContextMenu={(event, edge) => openContextMenu(event, { type: 'edge', id: edge.id })}
          onPaneClick={() => { setSelection(null); setContextMenu(null) }}
          onPaneContextMenu={(event) => { event.preventDefault(); setContextMenu(null) }}
          onNodesDelete={() => setSelection(null)}
          onEdgesDelete={() => setSelection(null)}
          fitView
          fitViewOptions={{ padding: 0.28 }}
          nodesDraggable={!compactReadOnly}
          nodesConnectable={!compactReadOnly}
          nodesFocusable={!compactReadOnly}
          edgesFocusable={!compactReadOnly}
          elementsSelectable={!compactReadOnly}
          minZoom={0.2}
          maxZoom={2.5}
          defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#64748b', strokeWidth: 2 } }}
          edgesReconnectable={!compactReadOnly}
          deleteKeyCode={compactReadOnly ? null : ['Backspace', 'Delete']}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap nodeColor={(node) => (node.data as DiagramNodeData).stroke} pannable zoomable />
          <Panel position="bottom-left" className="canvas-tip"><Image size={14} /> {t('canvas.tip')}</Panel>
        </ReactFlow>
      </section>

      <div className="mobile-readonly" role="status">
        <strong>{t('mobileReadOnly.title')}</strong>
        <span>{t('mobileReadOnly.body')}</span>
      </div>

      <aside className="inspector-panel">
        <div className="panel-heading"><span>{t('inspector.heading')}</span><small>{selectedSummary}</small></div>
        {selectedNode ? (
          <div className="inspector-content">
            <label className="field-label">{t('inspector.label')}
              <textarea value={selectedNode.data.label} rows={3} onChange={(event) => updateSelected({ label: event.target.value })} />
            </label>
            <div className="section-label">{t('inspector.colors')}</div>
            <div className="color-row"><label>{t('inspector.fill')} <input type="color" value={selectedNode.data.fill} onChange={(event) => updateSelected({ fill: event.target.value })} /></label><label>{t('inspector.stroke')} <input type="color" value={selectedNode.data.stroke} onChange={(event) => updateSelected({ stroke: event.target.value })} /></label></div>
            <label className="field-label">{t('inspector.textColor')} <input type="color" value={selectedNode.data.textColor} onChange={(event) => updateSelected({ textColor: event.target.value })} /></label>
            {selectedNode.data.kind === 'image' && <>
              <div className="section-label">{t('inspector.image')}</div>
              <button className="button secondary" onClick={() => imageInput.current?.click()}><Image size={15} />{selectedNode.data.imageDataUrl ? t('inspector.replaceImage') : t('inspector.chooseImage')}</button>
              {selectedNode.data.imageDataUrl && <button className="button secondary" onClick={() => updateSelected({ imageDataUrl: undefined })}><Trash2 size={15} />{t('inspector.removeImage')}</button>}
              <input ref={imageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={t('inspector.image')} onChange={uploadSelectedImage} />
            </>}
            {selectedNode.data.kind === 'group' && <div className="container-summary"><strong>{selectedChildCount}</strong><span>{t('inspector.groupChildren')}</span></div>}
            {selectedLaneMembership && <div className="container-summary lane-summary"><strong>{selectedLaneMembership.laneIndex + 1}</strong><span>{t('inspector.currentLane', { lane: selectedLaneMembership.laneLabel })}<small>{t('inspector.currentSwimlane', { swimlane: selectedLaneMembership.swimlaneLabel })}</small></span></div>}
            {selectedSwimlane && <>
              <div className="section-label">{t('inspector.swimlane')}</div>
              <label className="field-label">{t('inspector.laneDirection')}
                <select value={selectedSwimlane.direction} onChange={(event) => updateSelectedSwimlane((current) => ({ ...current, direction: event.target.value as SwimlaneData['direction'] }))}>
                  <option value="horizontal">{t('inspector.horizontal')}</option>
                  <option value="vertical">{t('inspector.vertical')}</option>
                </select>
              </label>
              <div className="lane-editor">
                {selectedSwimlane.lanes.map((lane, index) => <div key={`${lane}-${index}`} className="lane-row">
                  <input value={lane} aria-label={t('inspector.laneLabel', { index: index + 1 })} onChange={(event) => updateSelectedSwimlane((current) => ({ ...current, lanes: current.lanes.map((item, laneIndex) => laneIndex === index ? event.target.value : item) }))} />
                  <button className="icon-button" title={t('inspector.deleteLane')} disabled={selectedSwimlane.lanes.length <= 1} onClick={() => updateSelectedSwimlane((current) => ({ ...current, lanes: current.lanes.filter((_, laneIndex) => laneIndex !== index) }))}><Trash2 size={13} /></button>
                </div>)}
                <button className="button secondary" disabled={selectedSwimlane.lanes.length >= 12} onClick={() => updateSelectedSwimlane((current) => ({ ...current, lanes: [...current.lanes, t('inspector.laneLabel', { index: current.lanes.length + 1 })] }))}><Plus size={15} />{t('inspector.addLane')}</button>
              </div>
            </>}
            <div className="section-label">{t('inspector.size')}</div>
            <div className="size-grid"><span>W <strong>{Math.round(selectedNode.measured?.width ?? 160)}</strong></span><span>H <strong>{Math.round(selectedNode.measured?.height ?? 62)}</strong></span></div>
            <button className="button secondary" onClick={() => duplicateNode(selectedNode)}><Copy size={15} />{t('inspector.duplicateNode')}</button>
            <button className="button destructive" onClick={deleteSelection}><Trash2 size={15} />{t('inspector.deleteNode')}</button>
          </div>
        ) : selectedEdge ? (
          <div className="inspector-content">
            <label className="field-label">{t('inspector.edgeLabel')}
              <input value={String(selectedEdge.label ?? '')} placeholder={t('inspector.edgePlaceholder')} onChange={(event) => updateSelectedEdge({ label: event.target.value })} />
            </label>
            <div className="section-label">{t('inspector.edgeLine')}</div>
            <div className="color-row"><label>{t('inspector.color')} <input type="color" value={String((selectedEdge.style?.stroke as string | undefined) ?? '#64748b')} onChange={(event) => {
              const color = event.target.value
              updateSelectedEdge({
                style: { ...selectedEdge.style, stroke: color },
                markerStart: markerFromValue(markerValue(selectedEdge.markerStart), color),
                markerEnd: markerFromValue(markerValue(selectedEdge.markerEnd), color),
              })
            }} /></label><label>{t('inspector.width')} <input type="number" min="1" max="8" value={Number(selectedEdge.style?.strokeWidth ?? 2)} onChange={(event) => updateSelectedEdge({ style: { ...selectedEdge.style, strokeWidth: Number(event.target.value) } })} /></label></div>
            <label className="field-label">{t('inspector.lineType')}
              <select value={String(selectedEdge.type ?? 'smoothstep')} onChange={(event) => updateSelectedEdge({ type: event.target.value })}>
                <option value="smoothstep">{t('inspector.lineOrthogonal')}</option>
                <option value="straight">{t('inspector.lineStraight')}</option>
                <option value="default">{t('inspector.lineCurved')}</option>
              </select>
            </label>
            <label className="field-label">{t('inspector.dash')}
              <select value={String(selectedEdge.style?.strokeDasharray ?? 'solid')} onChange={(event) => updateSelectedEdge({ style: { ...selectedEdge.style, strokeDasharray: event.target.value === 'solid' ? undefined : event.target.value } })}>
                <option value="solid">{t('inspector.dashSolid')}</option>
                <option value="6 4">{t('inspector.dashDashed')}</option>
                <option value="2 3">{t('inspector.dashDotted')}</option>
              </select>
            </label>
            <div className="marker-row">
              <label>{t('inspector.markerStart')}
                <select value={markerValue(selectedEdge.markerStart)} onChange={(event) => updateSelectedEdge({ markerStart: markerFromValue(event.target.value, String(selectedEdge.style?.stroke ?? '#64748b')) })}>
                  <option value="none">{t('inspector.markerNone')}</option><option value="arrow">{t('inspector.markerArrow')}</option><option value="arrowclosed">{t('inspector.markerTriangle')}</option>
                </select>
              </label>
              <label>{t('inspector.markerEnd')}
                <select value={markerValue(selectedEdge.markerEnd)} onChange={(event) => updateSelectedEdge({ markerEnd: markerFromValue(event.target.value, String(selectedEdge.style?.stroke ?? '#64748b')) })}>
                  <option value="none">{t('inspector.markerNone')}</option><option value="arrow">{t('inspector.markerArrow')}</option><option value="arrowclosed">{t('inspector.markerTriangle')}</option>
                </select>
              </label>
            </div>
            <label className="check-row"><input type="checkbox" checked={Boolean(selectedEdge.animated)} onChange={(event) => updateSelectedEdge({ animated: event.target.checked })} />{t('inspector.animated')}</label>
            <p className="inspector-hint">{t('inspector.edgeHint')}</p>
            <button className="button destructive" onClick={deleteSelection}><Trash2 size={15} />{t('inspector.deleteEdge')}</button>
          </div>
        ) : (
          <div className="empty-inspector">
            <Square size={23} />
            <strong>{t('inspector.emptyTitle')}</strong>
            <p>{t('inspector.emptyBody')}</p>
          </div>
        )}
        <div className="inspector-footer"><Upload size={14} /> {t('inspector.localFirst')}</div>
      </aside>
      {contextMenu && <div
        className="context-menu"
        role="menu"
        aria-label={t('context.menu')}
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {contextMenu.type === 'node' ? <>
          <button role="menuitem" onClick={() => renameTargetNode(contextMenu.id)}>{t('context.rename')}</button>
          <button role="menuitem" onClick={() => duplicateTargetNode(contextMenu.id)}>{t('context.duplicate')}</button>
          <button role="menuitem" onClick={() => bringTargetToFront(contextMenu)}>{t('context.bringFront')}</button>
        </> : <>
          <button role="menuitem" onClick={() => setTargetEdgeType(contextMenu, 'smoothstep')}>{t('context.edgeOrthogonal')}</button>
          <button role="menuitem" onClick={() => setTargetEdgeType(contextMenu, 'straight')}>{t('context.edgeStraight')}</button>
        </>}
        <button role="menuitem" className="danger" onClick={() => deleteTarget(contextMenu)}>{t('context.delete')}</button>
      </div>}
      {commandPaletteOpen && <div className="command-backdrop" onMouseDown={() => setCommandPaletteOpen(false)}>
        <section className="command-palette" role="dialog" aria-modal="true" aria-label={t('command.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <input ref={commandInput} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Escape') setCommandPaletteOpen(false)
            if (event.key === 'Enter' && filteredCommands[0]) executeCommand(filteredCommands[0])
          }} placeholder={t('command.search')} aria-label={t('command.search')} />
          <div className="command-list">
            {filteredCommands.length ? filteredCommands.map((command) => <button key={command.id} onClick={() => executeCommand(command)}><span>{command.label}</span><kbd>{command.shortcut}</kbd></button>) : <p>{t('command.noResults')}</p>}
          </div>
          <footer>{t('command.footer')}</footer>
        </section>
      </div>}
      {templatePickerOpen && <div className="command-backdrop" onMouseDown={() => setTemplatePickerOpen(false)}>
        <section className="template-picker" role="dialog" aria-modal="true" aria-label={t('template.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <header><div><strong>{t('template.title')}</strong><span>{t('template.subtitle')}</span></div><button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setTemplatePickerOpen(false)}>×</button></header>
          <div>{templates.map((template) => {
            const copy = templateText(template, language)
            return <button key={template.id} onClick={() => applyTemplate(template.id)}><strong>{copy.name}</strong><span>{copy.description}</span></button>
          })}</div>
        </section>
      </div>}
      {demoGalleryOpen && <div className="command-backdrop" onMouseDown={() => setDemoGalleryOpen(false)}>
        <section className="template-picker" role="dialog" aria-modal="true" aria-label={t('demo.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <header><div><strong>{t('demo.title')}</strong><span>{t('demo.subtitle')}</span></div><button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setDemoGalleryOpen(false)}>×</button></header>
          <div>{demoGallery.map((demo) => {
            const copy = demoText(demo, language)
            return <button key={demo.id} onClick={() => openDemo(demo.id)}><strong>{copy.name}</strong><span>{copy.description}</span></button>
          })}</div>
        </section>
      </div>}
      {shortcutsOpen && <div className="command-backdrop" onMouseDown={() => setShortcutsOpen(false)}>
        <section className="shortcuts-dialog" role="dialog" aria-modal="true" aria-label={t('shortcuts.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <header><strong>{t('shortcuts.dialog')}</strong><button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setShortcutsOpen(false)}>×</button></header>
          <dl><dt><kbd>⌘/Ctrl K</kbd></dt><dd>{t('shortcuts.commandPalette')}</dd><dt><kbd>⌘/Ctrl Z</kbd></dt><dd>{t('shortcuts.undo')}</dd><dt><kbd>⌘/Ctrl Shift Z</kbd></dt><dd>{t('shortcuts.redo')}</dd><dt><kbd>⌘/Ctrl C</kbd></dt><dd>{t('shortcuts.copy')}</dd><dt><kbd>⌘/Ctrl V</kbd></dt><dd>{t('shortcuts.paste')}</dd><dt><kbd>⌘/Ctrl D</kbd></dt><dd>{t('shortcuts.duplicate')}</dd><dt><kbd>⌘/Ctrl A</kbd></dt><dd>{t('shortcuts.selectAll')}</dd><dt><kbd>↑ ↓ ← →</kbd></dt><dd>{t('shortcuts.move')}</dd></dl>
        </section>
      </div>}
      {textImport && <div className="command-backdrop" onMouseDown={() => setTextImport(null)}>
        <section className="text-import-dialog" role="dialog" aria-modal="true" aria-label={textImport.kind === 'mermaid' ? t('textImport.mermaidTitle') : t('textImport.csvTitle')} onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><strong>{textImport.kind === 'mermaid' ? t('textImport.mermaidTitle') : t('textImport.csvTitle')}</strong><span>{textImport.kind === 'mermaid' ? t('textImport.mermaidSubtitle') : t('textImport.csvSubtitle')}</span></div>
            <button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setTextImport(null)}>×</button>
          </header>
          <label>{t('textImport.source')}
            <textarea
              autoFocus
              value={textImport.value}
              placeholder={textImport.kind === 'mermaid' ? t('textImport.mermaidPlaceholder') : t('textImport.csvPlaceholder')}
              rows={10}
              onChange={(event) => setTextImport({ ...textImport, value: event.target.value })}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitTextImport()
              }}
            />
          </label>
          <footer><button className="button quiet-dialog" onClick={() => setTextImport(null)}>{t('dialog.close')}</button><button className="button action-dialog" disabled={!textImport.value.trim()} onClick={submitTextImport}>{t('textImport.import')}</button></footer>
        </section>
      </div>}
      {findReplaceOpen && <div className="command-backdrop" onMouseDown={() => setFindReplaceOpen(false)}>
        <section className="find-dialog" role="dialog" aria-modal="true" aria-label={t('find.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <header><strong>{t('find.dialog')}</strong><button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setFindReplaceOpen(false)}>×</button></header>
          <label>{t('find.find')}<input autoFocus value={findValue} onChange={(event) => setFindValue(event.target.value)} /></label>
          <label>{t('find.replaceWith')}<input value={replaceValue} onChange={(event) => setReplaceValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') replaceLabels() }} /></label>
          <footer><button className="button quiet-dialog" onClick={() => setFindReplaceOpen(false)}>{t('dialog.close')}</button><button className="button action-dialog" disabled={!findValue} onClick={replaceLabels}>{t('find.replaceAll')}</button></footer>
        </section>
      </div>}
      {recentOpen && <div className="command-backdrop" onMouseDown={() => setRecentOpen(false)}>
        <section className="recent-dialog" role="dialog" aria-modal="true" aria-label={t('recent.dialog')} onMouseDown={(event) => event.stopPropagation()}>
          <header><strong>{t('recent.dialog')}</strong><button className="icon-button" title={t('dialog.close')} aria-label={t('dialog.close')} onClick={() => setRecentOpen(false)}>×</button></header>
          <div>{recentDocuments.length ? recentDocuments.map((item) => <button key={item.id} onClick={() => void openRecentDocument(item.id)}><strong>{item.name}</strong><span>{new Date(item.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span></button>) : <p>{t('recent.empty')}</p>}</div>
        </section>
      </div>}
    </main>
  )
}

function App() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>
}

function loadLegacySnapshot(): DiagramSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return parseDocument(JSON.parse(raw))
  } catch {
    return null
  }
}

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'diagram'
}

function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

export default App
