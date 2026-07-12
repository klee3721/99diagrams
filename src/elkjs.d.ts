declare module 'elkjs/lib/elk-worker.min.js' {
  export class Worker {
    postMessage(message: unknown): void
    terminate(): void
    onmessage?: (event: MessageEvent) => void
  }

  const module: { Worker: typeof Worker; default: typeof Worker }
  export default module
}
