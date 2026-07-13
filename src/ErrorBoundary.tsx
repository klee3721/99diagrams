import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('99 Diagrams editor error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="error-boundary" role="alert">
      <div>
        <h1>99 Diagrams gặp sự cố</h1>
        <p>Sơ đồ đã lưu cục bộ vẫn còn trên thiết bị. Hãy tải lại trang để thử khôi phục phiên làm việc.</p>
        <button onClick={() => window.location.reload()}>Tải lại 99 Diagrams</button>
      </div>
    </main>
  }
}
