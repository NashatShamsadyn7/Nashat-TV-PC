import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './i18n'
import './stores/authStore' // side-effect: registers onAuthStateChanged listener

export default function App() {
  return <RouterProvider router={router} />
}
