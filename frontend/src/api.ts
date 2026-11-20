// Thin client for the Doomsday Ready API. All requests go to /api
// (proxied to the backend by Vite in development and by nginx in Docker).

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

export interface RewatchOrder {
  target: MovieRef
  movies: Array<Omit<Movie, 'prerequisites'>>
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
  bundles: Array<{ size: number; count: number }>
}

/** Error returned by the API: `{ statusCode, error, message }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check that the API is running.')
  }

  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const raw = body?.message
    const message = Array.isArray(raw) ? raw.join('. ') : (raw ?? `Request failed (${res.status})`)
    throw new ApiError(res.status, body?.error ?? 'ERROR', message)
  }
  return body as T
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) })

export const api = {
  listMovies: () => request<Movie[]>('/movies'),
  createMovie: (input: MovieInput) => request<Movie>('/movies', json('POST', input)),
  updateMovie: (id: number, input: Partial<MovieInput>) => request<Movie>(`/movies/${id}`, json('PATCH', input)),
  deleteMovie: (id: number) => request<void>(`/movies/${id}`, { method: 'DELETE' }),
  rewatchOrder: (id: number) => request<RewatchOrder>(`/movies/${id}/rewatch-order`),

  listCinemas: () => request<Cinema[]>('/cinemas'),
  createCinema: (input: { name: string; bundleSizes: number[] }) => request<Cinema>('/cinemas', json('POST', input)),
  bookingQuote: (id: number, groupSize: number) =>
    request<BookingQuote>(`/cinemas/${id}/booking?groupSize=${encodeURIComponent(groupSize)}`),
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'CIRCULAR_DEPENDENCY') {
      return 'That would make the movie depend on itself through its own prerequisites. Remove the movie that leads back to it.'
    }
    return err.message
  }
  return 'Something went wrong. Try again.'
}
