export default function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900">
      <div className="text-center animate-slide-up">
        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          Nashat TV
        </h1>
        <p className="mt-4 text-ink-200 text-lg">نسخة سطح المكتب — قيد البناء</p>
        <p className="mt-8 text-ink-300 text-sm">
          Electron {' · '} React {' · '} TypeScript {' · '} Tailwind
        </p>
      </div>
    </div>
  )
}
