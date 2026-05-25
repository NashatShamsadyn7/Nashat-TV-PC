import { createHashRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Home from '@/pages/Home'
import LiveTV from '@/pages/LiveTV'
import MultiLive from '@/pages/MultiLive'
import Movies from '@/pages/Movies'
import Series from '@/pages/Series'
import Actors from '@/pages/Actors'
import SearchPage from '@/pages/SearchPage'
import Library from '@/pages/Library'
import Settings from '@/pages/Settings'
import Profiles from '@/pages/Profiles'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'live', element: <LiveTV /> },
      { path: 'live/multi', element: <MultiLive /> },
      { path: 'movies', element: <Movies /> },
      { path: 'series', element: <Series /> },
      { path: 'actors', element: <Actors /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'library', element: <Library /> },
      { path: 'settings', element: <Settings /> },
      { path: 'profiles', element: <Profiles /> }
    ]
  }
])
