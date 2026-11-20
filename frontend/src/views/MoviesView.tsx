import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, type Movie, type MovieInput } from '../api'
import { MovieForm } from '../components/MovieForm'
import { Notice } from '../components/Notice'
import { formatRuntime, joinTitles, plural } from '../format'

export function MoviesView() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setMovies(await api.listMovies())
      setLoadError(null)
    } catch (err) {
      setLoadError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Runs a change, shows its error (if any) and reloads the list.
  const run = async (action: () => Promise<unknown>, done?: string) => {
    setActionError(null)
    setFlash(null)
    try {
      await action()
      if (done) setFlash(done)
      await load()
      return true
    } catch (err) {
      setActionError(errorMessage(err))
      await load()
      return false
    }
  }

  const add = async (input: MovieInput) => {
    await run(() => api.createMovie(input), `Added ${input.title}.`)
  }

  const save = async (id: number, input: MovieInput) => {
    if (await run(() => api.updateMovie(id, input), `Saved ${input.title}.`)) setEditingId(null)
  }

  const toggleWatched = (m: Movie) => {
    setMovies((list) => list?.map((x) => (x.id === m.id ? { ...x, watched: !m.watched } : x)) ?? list)
    return run(() => api.updateMovie(m.id, { watched: !m.watched }))
  }

  const remove = (m: Movie) => {
    if (window.confirm(`Delete ${m.title}? It will also be removed from other movies' prerequisites.`)) {
      void run(() => api.deleteMovie(m.id), `Deleted ${m.title}.`)
    }
  }

  const watched = movies?.filter((m) => m.watched).length ?? 0

  return (
    <div className="split">
      <section className="split-main" aria-labelledby="movies-heading">
        <div className="view-head">
          <h1 id="movies-heading">Movies</h1>
          {movies && movies.length > 0 && (
            <p className="view-sub">
              {plural(movies.length, 'movie')}, {watched} watched
            </p>
          )}
        </div>

        {actionError && <Notice tone="error" onDismiss={() => setActionError(null)}>{actionError}</Notice>}
        {flash && <Notice tone="info" onDismiss={() => setFlash(null)}>{flash}</Notice>}
        {loadError && <Notice tone="error">{loadError}</Notice>}

        {movies === null && !loadError && <p className="loading">Loading movies…</p>}

        {movies?.length === 0 && (
          <div className="empty">
            <p>No movies yet. Add the first one with the form, then link movies together with prerequisites.</p>
          </div>
        )}

        {movies && movies.length > 0 && (
          <ul className="movie-list">
            {movies.map((m) => (
              <li key={m.id} className={`movie-row${m.watched ? ' is-watched' : ''}`}>
                {editingId === m.id ? (
                  <div className="movie-edit">
                    <h2 className="edit-title">Edit {m.title}</h2>
                    <MovieForm
                      allMovies={movies}
                      initial={m}
                      submitLabel="Save changes"
                      onSubmit={(input) => save(m.id, input)}
                      onCancel={() => {
                        setEditingId(null)
                        setActionError(null)
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <label className="watch-toggle" title={m.watched ? 'Mark as not watched' : 'Mark as watched'}>
                      <input type="checkbox" checked={m.watched} onChange={() => void toggleWatched(m)} />
                      <span className="sr-only">Watched {m.title}</span>
                    </label>
                    <div className="movie-info">
                      <p className="movie-title">{m.title}</p>
                      <p className="movie-meta">
                        {m.releaseYear}, {formatRuntime(m.runtime)}
                      </p>
                      <p className="movie-prereqs">
                        {m.prerequisites.length === 0
                          ? 'No prerequisites'
                          : `Watch first: ${joinTitles(m.prerequisites.map((p) => p.title))}`}
                      </p>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn btn-quiet" onClick={() => setEditingId(m.id)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-quiet btn-danger" onClick={() => remove(m)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="split-side panel" aria-labelledby="add-movie-heading">
        <h2 id="add-movie-heading">Add a movie</h2>
        <MovieForm allMovies={movies ?? []} submitLabel="Add movie" onSubmit={add} />
      </aside>
    </div>
  )
}
