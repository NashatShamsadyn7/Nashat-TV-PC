import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null; info: string | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: error.stack ?? null }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null, info: null })
  reload = () => window.location.reload()

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children
    return (
      <div className="min-h-screen bg-ink-900 text-white grid place-items-center p-8">
        <div className="max-w-xl w-full bg-ink-700/30 ring-1 ring-rose-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <h1 className="text-2xl font-bold">حدث خطأ غير متوقّع</h1>
          </div>
          <p className="text-rose-300 font-mono text-sm mb-3 break-words">{error.message}</p>
          {info && (
            <details className="text-xs text-ink-300 mb-4">
              <summary className="cursor-pointer hover:text-white">عرض التفاصيل</summary>
              <pre className="mt-2 p-3 bg-black/40 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">
                {info}
              </pre>
            </details>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={this.reload}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل التطبيق
            </button>
            <button
              onClick={this.reset}
              className="bg-ink-700/60 hover:bg-ink-700 px-4 py-2 rounded-xl text-sm"
            >
              متابعة
            </button>
          </div>
        </div>
      </div>
    )
  }
}
