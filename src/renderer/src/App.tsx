import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './i18n'
import { firebaseConfigError } from '@/services/firebase'
import './stores/authStore' // side-effect: registers onAuthStateChanged listener

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#111827',
        color: '#f8fafc',
        fontFamily: 'Cairo, Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#1f2937',
          border: '1px solid rgba(248,113,113,0.4)',
          borderRadius: '16px',
          padding: '1.75rem'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          تعذّر تشغيل التطبيق
        </h1>
        <p style={{ color: '#e2e8f0', marginBottom: '1rem', lineHeight: 1.7 }}>
          حدثت مشكلة في إعدادات التطبيق ولم يتمكّن من التحميل بشكل صحيح. يرجى
          تحديث التطبيق إلى أحدث إصدار أو إعادة تثبيته. إذا استمرّت المشكلة تواصل
          مع الدعم.
        </p>
        <pre
          style={{
            fontSize: '0.8rem',
            color: '#fca5a5',
            background: 'rgba(0,0,0,0.35)',
            padding: '0.75rem',
            borderRadius: '10px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            direction: 'ltr',
            textAlign: 'left'
          }}
        >
          {message}
        </pre>
      </div>
    </div>
  )
}

export default function App() {
  if (firebaseConfigError) {
    return <ConfigErrorScreen message={firebaseConfigError} />
  }
  return <RouterProvider router={router} />
}
