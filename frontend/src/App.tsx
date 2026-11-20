import { useEffect, useState } from 'react'
import { BookingView } from './views/BookingView'
import { MoviesView } from './views/MoviesView'
import { RewatchView } from './views/RewatchView'

const VIEWS = [
  { id: 'movies', label: 'Movies' },
  { id: 'rewatch', label: 'Rewatch plan' },
  { id: 'booking', label: 'Booking' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const fromHash = (): ViewId => {
  const id = window.location.hash.replace('#/', '')
  return VIEWS.some((v) => v.id === id) ? (id as ViewId) : 'movies'
}

export default function App() {
  const [view, setView] = useState<ViewId>(fromHash)

  useEffect(() => {
    const onHash = () => setView(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-inner">
          <a className="brand" href="#/movies" aria-label="Doomsday Ready, home">
            <span className="brand-seats" aria-hidden="true">
              <i /><i /><i />
            </span>
            Doomsday Ready
          </a>
          <nav className="tabs" aria-label="Sections">
            {VIEWS.map((v) => (
              <a key={v.id} href={`#/${v.id}`} className="tab" aria-current={view === v.id ? 'page' : undefined}>
                {v.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        {view === 'movies' && <MoviesView />}
        {view === 'rewatch' && <RewatchView />}
        {view === 'booking' && <BookingView />}
      </main>
    </div>
  )
}
