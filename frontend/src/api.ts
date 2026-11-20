

export interface MovieRef {
  id: number
  title: string
}

export interface Movie {
  id: number
  title: string
  releaseYear: number
  runtime: number
  watched: boolean
  prerequisites: MovieRef[]
}

export interface MovieInput {
  title: string
  releaseYear: number
  runtime: number
  watched?: boolean
  prerequisiteIds: number[]
}

export interface RewatchMovie {
  id: number
  title: string
  releaseYear: number
  runtime: number
  watched: boolean
}

export interface RewatchOrder {
  target: MovieRef
  movies: RewatchMovie[]
  totalCount: number
  watchedCount: number
  unwatchedCount: number
  unwatchedRuntime: number
}

export interface Cinema {
  id: number
  name: string
  bundleSizes: number[]
}

export interface BookingQuote {
  cinema: Cinema
  groupSize: number
  possible: boolean
  totalBundles: number | null
  bundles: { size: number; count: number }[]
}


async function send(path: string, method = 'GET', body?: unknown) {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Could not reach the server. Check that the API is running.')
  }

  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join('. ') : data.message
    throw new Error(message || 'Request failed')
  }
  return data
}

export const api = {
  listMovies: (): Promise<Movie[]> => send('/movies'),
  createMovie: (input: MovieInput): Promise<Movie> => send('/movies', 'POST', input),
  updateMovie: (id: number, input: Partial<MovieInput>): Promise<Movie> => send(`/movies/${id}`, 'PATCH', input),
  deleteMovie: (id: number): Promise<null> => send(`/movies/${id}`, 'DELETE'),
  rewatchOrder: (id: number): Promise<RewatchOrder> => send(`/movies/${id}/rewatch-order`),

  listCinemas: (): Promise<Cinema[]> => send('/cinemas'),
  createCinema: (input: { name: string; bundleSizes: number[] }): Promise<Cinema> => send('/cinemas', 'POST', input),
  bookingQuote: (id: number, groupSize: number): Promise<BookingQuote> =>
    send(`/cinemas/${id}/booking?groupSize=${groupSize}`),
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong. Try again.'
}