import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, type Movie, type RewatchOrder } from '../api'
import { Notice } from '../components/Notice'
import { formatRuntime } from '../format'

export function RewatchView() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [plan, setPlan] = useState<RewatchOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listMovies()
      .then((list) => {
        setMovies(list)
        // Default to the newest movie — usually the one you're catching up for.
        const newest = [...list].sort((a, b) => b.releaseYear - a.releaseYear || b.id - a.id)[0]
        if (newest) setTargetId(newest.id)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const loadPlan = useCallback(async (id: number) => {
    try {
      setPlan(await api.rewatchOrder(id))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    if (targetId !== null) void loadPlan(targetId)
  }, [targetId, loadPlan])

  const toggle = async (id: number, watched: boolean) => {
    // Show the change straight away; the reload below brings the server's numbers.
    setPlan((current) => {
      if (!current) return current
      const list = current.movies.map((m) => (m.id === id ? { ...m, watched } : m))
      const unwatched = list.filter((m) => !m.watched)
      return {
        ...current,
        movies: list,
        watchedCount: list.length - unwatched.length,
        unwatchedCount: unwatched.length,
        unwatchedRuntime: unwatched.reduce((sum, m) => sum + m.runtime, 0),
      }
    })
    try {
      await api.updateMovie(id, { watched })
      if (targetId !== null) await loadPlan(targetId)
    } catch (err) {
      setError(errorMessage(err))
      if (targetId !== null) await loadPlan(targetId)
    }
  }

  const percent = plan && plan.totalCount > 0 ? Math.round((plan.watchedCount / plan.totalCount) * 100) : 0

  return (
    <section className="narrow" aria-labelledby="rewatch-heading">
      <div className="view-head">
        <h1 id="rewatch-heading">Rewatch plan</h1>
        <p className="view-sub">Everything to watch before a movie, in an order that never spoils a story.</p>
      </div>

      {error && <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice>}
      {movies === null && !error && <p className="loading">Loading movies…</p>}
      {movies?.length === 0 && (
        <div className="empty">
          <p>
            There are no movies yet. <a href="#/movies">Add movies</a> to build a plan.
          </p>
        </div>
      )}

      {movies && movies.length > 0 && (
        <label className="field target-select">
          <span>I want to be ready for</span>
          <select value={targetId ?? ''} onChange={(e) => setTargetId(Number(e.target.value))}>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.releaseYear})
              </option>
            ))}
          </select>
        </label>
      )}

      {plan && plan.target.id === targetId && (
        <>
          {plan.totalCount === 0 ? (
            <div className="empty">
              <p>
                {plan.target.title} has no prerequisites. You can watch it straight away.
              </p>
            </div>
          ) : (
            <>
              <div className="progress-block">
                <div className="progress-figures">
                  <p className="figure">
                    <span className="figure-num">
                      {plan.watchedCount} of {plan.totalCount}
                    </span>
                    <span className="figure-label">watched</span>
                  </p>
                  <p className="figure figure-right">
                    <span className="figure-num">
                      {plan.unwatchedRuntime === 0 ? 'Ready' : formatRuntime(plan.unwatchedRuntime)}
                    </span>
                    <span className="figure-label">
                      {plan.unwatchedRuntime === 0 ? 'nothing left to watch' : 'left to watch'}
                    </span>
                  </p>
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label="Movies watched"
                  aria-valuemin={0}
                  aria-valuemax={plan.totalCount}
                  aria-valuenow={plan.watchedCount}
                  aria-valuetext={`${plan.watchedCount} of ${plan.totalCount} watched`}
                >
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <ol className="plan-list">
                {plan.movies.map((m, i) => (
                  <li key={m.id} className={`plan-item${m.watched ? ' is-watched' : ''}`}>
                    <span className="plan-step" aria-hidden="true">
                      {i + 1}
                    </span>
                    <label className="plan-label">
                      <input type="checkbox" checked={m.watched} onChange={(e) => void toggle(m.id, e.target.checked)} />
                      <span className="plan-title">{m.title}</span>
                    </label>
                    <span className="plan-meta">
                      {m.releaseYear}, {formatRuntime(m.runtime)}
                    </span>
                  </li>
                ))}
                <li className="plan-item plan-target">
                  <span className="plan-step" aria-hidden="true">
                    ★
                  </span>
                  <span className="plan-title">Then: {plan.target.title}</span>
                </li>
              </ol>
            </>
          )}
        </>
      )}
    </section>
  )
}
