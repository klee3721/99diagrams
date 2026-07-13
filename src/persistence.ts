import type { DiagramDocument, DocumentIndexEntry } from './document'
import { parseDiagramDocument } from './document'

const previousProductSlug = ['99', 'draw'].join('')
const databaseName = '99diagrams'
const previousDatabaseName = previousProductSlug
const databaseVersion = 1
const documentsStore = 'documents'
const fallbackPrefix = '99diagrams:document:'
const previousFallbackPrefix = `${previousProductSlug}:document:`

export async function saveDiagramDocument(document: DiagramDocument): Promise<void> {
  if (!('indexedDB' in window)) return saveFallback(document)
  try {
    const database = await openDatabase()
    await transaction(database, 'readwrite', (store) => store.put(document))
  } catch {
    saveFallback(document)
  }
}

export async function loadDiagramDocument(id: string): Promise<DiagramDocument | null> {
  if (!('indexedDB' in window)) return loadFallback(id) ?? loadFallback(id, previousFallbackPrefix)
  try {
    const database = await openDatabase()
    const value = await request<unknown>(database.transaction(documentsStore, 'readonly').objectStore(documentsStore).get(id))
    const document = parseDiagramDocument(value)
    if (document) return document

    const previousDatabase = await openDatabase(previousDatabaseName)
    const previousValue = await request<unknown>(previousDatabase.transaction(documentsStore, 'readonly').objectStore(documentsStore).get(id))
    return parseDiagramDocument(previousValue) ?? loadFallback(id, previousFallbackPrefix)
  } catch {
    return loadFallback(id) ?? loadFallback(id, previousFallbackPrefix)
  }
}

export async function listDiagramDocuments(): Promise<DocumentIndexEntry[]> {
  if (!('indexedDB' in window)) return mergeDocumentLists(listFallback(), listFallback(previousFallbackPrefix))
  try {
    const database = await openDatabase()
    const values = await request<unknown[]>(database.transaction(documentsStore, 'readonly').objectStore(documentsStore).getAll())
    let documents = values.map(parseDiagramDocument).filter((document): document is DiagramDocument => document != null)
    try {
      const previousDatabase = await openDatabase(previousDatabaseName)
      const previousValues = await request<unknown[]>(previousDatabase.transaction(documentsStore, 'readonly').objectStore(documentsStore).getAll())
      documents = mergeDocuments(documents, previousValues.map(parseDiagramDocument).filter((document): document is DiagramDocument => document != null))
    } catch {
      return mergeDocumentLists(
        documents.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
        listFallback(previousFallbackPrefix),
      )
    }
    return documents
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return mergeDocumentLists(listFallback(), listFallback(previousFallbackPrefix))
  }
}

export async function deleteDiagramDocument(id: string): Promise<void> {
  if (!('indexedDB' in window)) {
    deleteFallback(id)
    deleteFallback(id, previousFallbackPrefix)
    return
  }
  try {
    const database = await openDatabase()
    await transaction(database, 'readwrite', (store) => store.delete(id))
    try {
      const previousDatabase = await openDatabase(previousDatabaseName)
      await transaction(previousDatabase, 'readwrite', (store) => store.delete(id))
    } catch {
      deleteFallback(id, previousFallbackPrefix)
    }
  } catch {
    deleteFallback(id)
    deleteFallback(id, previousFallbackPrefix)
  }
}

function openDatabase(name = databaseName): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, databaseVersion)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(documentsStore)) open.result.createObjectStore(documentsStore, { keyPath: 'id' })
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transaction(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = action(database.transaction(documentsStore, mode).objectStore(documentsStore))
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function saveFallback(document: DiagramDocument) {
  localStorage.setItem(`${fallbackPrefix}${document.id}`, JSON.stringify(document))
}

function loadFallback(id: string, prefix = fallbackPrefix): DiagramDocument | null {
  try { return parseDiagramDocument(JSON.parse(localStorage.getItem(`${prefix}${id}`) ?? 'null')) } catch { return null }
}

function listFallback(prefix = fallbackPrefix): DocumentIndexEntry[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(prefix))
    .map((key) => loadFallback(key.slice(prefix.length), prefix))
    .filter((document): document is DiagramDocument => document != null)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function deleteFallback(id: string, prefix = fallbackPrefix) {
  localStorage.removeItem(`${prefix}${id}`)
}

function mergeDocuments(primary: DiagramDocument[], secondary: DiagramDocument[]) {
  const byId = new Map<string, DiagramDocument>()
  for (const document of secondary) byId.set(document.id, document)
  for (const document of primary) byId.set(document.id, document)
  return [...byId.values()]
}

function mergeDocumentLists(primary: DocumentIndexEntry[], secondary: DocumentIndexEntry[]) {
  const byId = new Map<string, DocumentIndexEntry>()
  for (const document of secondary) byId.set(document.id, document)
  for (const document of primary) byId.set(document.id, document)
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
