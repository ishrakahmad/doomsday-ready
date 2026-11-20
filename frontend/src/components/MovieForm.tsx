import { useState, type FormEvent } from 'react'
import type { Movie, MovieInput } from '../api'
import { PrerequisitePicker } from './PrerequisitePicker'

interface Props {
  allMovies: Movie[]
  initial?: Movie
  submitLabel: string
  onSubmit: (input: MovieInput) => Promise<void>
  onCancel?: () => void
}


export function MovieForm({ allMovies, initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [releaseYear, setReleaseYear] = useState(initial ? String(initial.releaseYear) : '')
  const [runtime, setRuntime] = useState(initial ? String(initial.runtime) : '')
  const [prerequisiteIds, setPrerequisiteIds] = useState<number[]>(initial?.prerequisites.map((p) => p.id) ?? [])
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        releaseYear: Number(releaseYear),
        runtime: Number(runtime),
        prerequisiteIds,
      })
      if (!initial) {
        setTitle('')
        setReleaseYear('')
        setRuntime('')
        setPrerequisiteIds([])
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="movie-form" onSubmit={submit}>
      <label className="field field-wide">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </label>
      <label className="field">
        <span>Release year</span>
        <input
          type="number"
          inputMode="numeric"
          min={1888}
          max={2100}
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Runtime (minutes)</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          value={runtime}
          onChange={(e) => setRuntime(e.target.value)}
          required
        />
      </label>
      <div className="field-wide">
        <PrerequisitePicker
          movies={allMovies}
          selected={prerequisiteIds}
          onChange={setPrerequisiteIds}
          excludeId={initial?.id}
        />
      </div>
      <div className="form-actions field-wide">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
