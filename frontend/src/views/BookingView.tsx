import { useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage, type BookingQuote, type Cinema } from '../api'
import { Notice } from '../components/Notice'
import { joinTitles, plural } from '../format'


const MAX_DRAWN_SEATS = 160

export function BookingView() {
  const [cinemas, setCinemas] = useState<Cinema[] | null>(null)
  const [cinemaId, setCinemaId] = useState<number | null>(null)
  const [groupSize, setGroupSize] = useState('')
  const [quote, setQuote] = useState<BookingQuote | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCinemas = async (selectId?: number) => {
    try {
      const list = await api.listCinemas()
      setCinemas(list)
      setCinemaId((current) => selectId ?? current ?? list[0]?.id ?? null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void loadCinemas()
  }, [])

  const cinema = cinemas?.find((c) => c.id === cinemaId) ?? null

  const getQuote = async (e: FormEvent) => {
    e.preventDefault()
    if (cinemaId === null) return
    setBusy(true)
    setError(null)
    try {
      setQuote(await api.bookingQuote(cinemaId, Number(groupSize)))
    } catch (err) {
      setQuote(null)
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="split">
      <section className="split-main" aria-labelledby="booking-heading">
        <div className="view-head">
          <h1 id="booking-heading">Booking</h1>
          <p className="view-sub">
            Opening-night seats are sold only in bundles. Find the fewest bundles that seat your group exactly.
          </p>
        </div>

        {error && <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice>}
        {cinemas === null && !error && <p className="loading">Loading cinemas…</p>}
        {cinemas?.length === 0 && (
          <div className="empty">
            <p>No cinemas yet. Add one with the form to get a quote.</p>
          </div>
        )}

        {cinemas && cinemas.length > 0 && (
          <form className="quote-form" onSubmit={getQuote}>
            <label className="field">
              <span>Cinema</span>
              <select
                value={cinemaId ?? ''}
                onChange={(e) => {
                  setCinemaId(Number(e.target.value))
                  setQuote(null)
                }}
              >
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-narrow">
              <span>Group size</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                required
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Working it out…' : 'Get quote'}
            </button>
            {cinema && (
              <p className="bundle-hint">
                {cinema.name} sells {joinTitles(cinema.bundleSizes.map((s) => `${s}-seat`))} bundles.
              </p>
            )}
          </form>
        )}

        {quote && <QuoteResult quote={quote} />}
      </section>

      <aside className="split-side panel" aria-labelledby="add-cinema-heading">
        <h2 id="add-cinema-heading">Add a cinema</h2>
        <AddCinemaForm
          onCreated={(c) => {
            setQuote(null)
            void loadCinemas(c.id)
          }}
        />
      </aside>
    </div>
  )
}

function QuoteResult({ quote }: { quote: BookingQuote }) {
  if (!quote.possible) {
    return (
      <div className="quote quote-none" role="status">
        <p className="quote-headline">Not possible</p>
        <p className="quote-detail">
          No mix of {joinTitles(quote.cinema.bundleSizes.map((s) => `${s}-seat`))} bundles adds up to exactly{' '}
          {plural(quote.groupSize, 'seat')}. Try a different group size or another cinema.
        </p>
      </div>
    )
  }

  const drawSeats = quote.groupSize <= MAX_DRAWN_SEATS

  const blocks = quote.bundles.flatMap((b) => Array.from({ length: b.count }, () => b.size))

  return (
    <div className="quote" role="status">
      <p className="quote-headline">
        Buy {plural(quote.totalBundles ?? 0, 'bundle')}
      </p>
      <p className="quote-detail">
        Seats {plural(quote.groupSize, 'person', 'people')} at {quote.cinema.name} with no empty seats.
      </p>

      <ul className="quote-lines">
        {quote.bundles.map((b) => (
          <li key={b.size}>
            <span className="quote-count">{b.count} ×</span>
            <span>{b.size}-seat bundle</span>
            <span className="quote-sub">{plural(b.size * b.count, 'seat')}</span>
          </li>
        ))}
      </ul>

      {drawSeats && (
        <div className="seat-map" aria-hidden="true">
          {blocks.map((size, i) => (
            <div key={i} className="seat-block" style={{ animationDelay: `${Math.min(i, 20) * 60}ms` }}>
              <div className="seat-row">
                {Array.from({ length: size }, (_, s) => (
                  <span key={s} className="seat" />
                ))}
              </div>
              <span className="seat-caption">{size} seats</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddCinemaForm({ onCreated }: { onCreated: (c: Cinema) => void }) {
  const [name, setName] = useState('')
  const [sizes, setSizes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const parts = sizes.split(/[\s,]+/).filter(Boolean)
    const bundleSizes = parts.map(Number)
    if (parts.length === 0 || bundleSizes.some((n) => !Number.isInteger(n))) {
      setError('Enter bundle sizes as whole numbers separated by commas, for example 2, 5.')
      return
    }
    setBusy(true)
    try {
      const created = await api.createCinema({ name: name.trim(), bundleSizes })
      setName('')
      setSizes('')
      onCreated(created)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="cinema-form" onSubmit={submit}>
      {error && <Notice tone="error">{error}</Notice>}
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      </label>
      <label className="field">
        <span>Bundle sizes</span>
        <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="2, 5" required />
        <small className="field-help">1 to 10 different sizes, each 1–500 seats.</small>
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Adding…' : 'Add cinema'}
      </button>
    </form>
  )
}
