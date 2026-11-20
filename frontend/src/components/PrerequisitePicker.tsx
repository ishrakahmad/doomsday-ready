import { useId, useState } from 'react'
import type { MovieRef } from '../api'

interface Props {
  movies: Array<MovieRef & { releaseYear: number }>
  selected: number[]
  onChange: (ids: number[]) => void
  /** The movie being edited — it can't be its own prerequisite. */
  excludeId?: number
}

/** Checkbox list for choosing which movies to watch first. */
export function PrerequisitePicker({ movies, selected, onChange, excludeId }: Props) {
  const [filter, setFilter] = useState('')
  const id = useId()
  const options = movies
    .filter((m) => m.id !== excludeId)
    .filter((m) => m.title.toLowerCase().includes(filter.trim().toLowerCase()))

  const toggle = (movieId: number) =>
    onChange(selected.includes(movieId) ? selected.filter((x) => x !== movieId) : [...selected, movieId])

  return (
    <fieldset className="picker">
      <legend>Watch these first</legend>
      {movies.length > 6 && (
        <input
          className="picker-filter"
          type="search"
          placeholder="Filter movies"
          aria-label="Filter movies"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {options.length === 0 ? (
        <p className="picker-empty">{movies.length <= (excludeId ? 1 : 0) ? 'Add another movie first.' : 'No movies match.'}</p>
      ) : (
        <ul className="picker-list">
          {options.map((m) => (
            <li key={m.id}>
              <label htmlFor={`${id}-${m.id}`}>
                <input
                  id={`${id}-${m.id}`}
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                />
                <span>{m.title}</span>
                <span className="picker-year">{m.releaseYear}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="picker-count" aria-live="polite">
        {selected.length === 0 ? 'None selected' : `${selected.length} selected`}
      </p>
    </fieldset>
  )
}
