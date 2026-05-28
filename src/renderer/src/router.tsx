import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'

const Home = lazy(() => import('@/pages/Home'))
const LiveTV = lazy(() => import('@/pages/LiveTV'))
const MultiLive = lazy(() => import('@/pages/MultiLive'))
const Movies = lazy(() => import('@/pages/Movies'))
const Series = lazy(() => import('@/pages/Series'))
const Arabic = lazy(() => import('@/pages/Arabic'))
const Actors = lazy(() => import('@/pages/Actors'))
const ActorDetail = lazy(() => import('@/pages/ActorDetail'))
const Details = lazy(() => import('@/pages/Details'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const Library = lazy(() => import('@/pages/Library'))
const Settings = lazy(() => import('@/pages/Settings'))
const Profiles = lazy(() => import('@/pages/Profiles'))
const Stats = lazy(() => import('@/pages/Stats'))
const WatchTogether = lazy(() => import('@/pages/WatchTogether'))
const Friends = lazy(() => import('@/pages/Friends'))
const Profile = lazy(() => import('@/pages/Profile'))
const Chats = lazy(() => import('@/pages/Chats'))

function PageFallback() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-4 w-80" />
      <div className="grid grid-cols-5 gap-4 mt-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3]" />
        ))}
      </div>
    </div>
  )
}

const wrap = (el: React.ReactElement) => <Suspense fallback={<PageFallback />}>{el}</Suspense>

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: wrap(<Home />) },
      { path: 'live', element: wrap(<LiveTV />) },
      { path: 'live/multi', element: wrap(<MultiLive />) },
      { path: 'movies', element: wrap(<Movies />) },
      { path: 'series', element: wrap(<Series />) },
      { path: 'arabic', element: wrap(<Arabic />) },
      { path: 'actors', element: wrap(<Actors />) },
      { path: 'actors/:id', element: wrap(<ActorDetail />) },
      { path: 'details/:kind/:id', element: wrap(<Details />) },
      { path: 'search', element: wrap(<SearchPage />) },
      { path: 'library', element: wrap(<Library />) },
      { path: 'stats', element: wrap(<Stats />) },
      { path: 'settings', element: wrap(<Settings />) },
      { path: 'profiles', element: wrap(<Profiles />) },
      { path: 'together', element: wrap(<WatchTogether />) },
      { path: 'friends', element: wrap(<Friends />) },
      { path: 'profile', element: wrap(<Profile />) },
      { path: 'chats', element: wrap(<Chats />) }
    ]
  }
])
