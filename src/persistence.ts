import type { DiagramDocument, DocumentIndexEntry } from './document'
import { parseDiagramDocument } from './document'

const databaseName = '99draw'
const databaseVersion = 1
const documentsStore = 'documents'
const fallbackPrefix = '99draw:document:'

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
  if (!('indexedDB' in window)) return loadFallback(id)
  try {
    const database = await openDatabase()
    const value = await request<unknown>(database.transaction(documentsStore, 'readonly').objectStore(documentsStore).get(id))
    return parseDiagramDocument(value)
  } catch {
    return loadFallback(id)
  }
}

export async function listDiagramDocuments(): Promise<DocumentIndexEntry[]> {
  if (!('indexedDB' in window)) return listFallback()
  try {
    const database = await openDatabase()
    const values = await request<unknown[]>(database.transaction(documentsStore, 'readonly').objectStore(documentsStore).getAll())
    return values.map(parseDiagramDocument).filter((document): document is DiagramDocument => document != null)
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return listFallback()
  }
}

export async function deleteDiagramDocument(id: string): Promise<void> {
  if (!('indexedDB' in window)) return deleteFallback(id)
  try {
    const database = await openDatabase()
    await transaction(database, 'readwrite', (store) => store.delete(id))
  } catch {
    deleteFallback(id)
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(databaseName, databaseVersion)
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

function loadFallback(id: string): DiagramDocument | null {
  try { return parseDiagramDocument(JSON.parse(localStorage.getItem(`${fallbackPrefix}${id}`) ?? 'null')) } catch { return null }
}

function listFallback(): DocumentIndexEntry[] {
  return Object.keys(localStorage).filter((key) => key.startsWith(fallbackPrefix))
    .map((key) => loadFallback(key.slice(fallbackPrefix.length)))
    .filter((document): document is DiagramDocument => document != null)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function deleteFallback(id: string) {
  localStorage.removeItem(`${fallbackPrefix}${id}`)
}
