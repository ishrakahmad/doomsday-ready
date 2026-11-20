# Doomsday Ready

A full-stack app that helps MCU fans plan their rewatch before *Avengers: Doomsday* and book an opening night watch party.

- **Movies**: add movies, link them with prerequisites, tick them off as watched.
- **Rewatch plan**: pick a movie and get everything you need to see first, in an order that respects every prerequisite with progress and remaining watch time.
- **Booking**: pick a cinema and a group size and get the fewest seat bundles that seat the group exactly, or "not possible".

**Stack:** NestJS 11 + TypeORM + PostgreSQL 16 (API), React 19 + Vite + TypeScript (UI), Docker Compose.

---

## Quick start (Docker)

```bash
docker compose up --build
```

| What | URL |
|---|---|
| App | http://localhost:8080 |
| API | http://localhost:3000/api |

The database schema is created by migrations when the API starts. An empty database is filled with the sample movies and one cinema per booking example from the assessment (`SEED_ON_START=true`), so every example can be tried straight away.

To start again from a clean database: `docker compose down -v`.

## Running without Docker

Requires Node.js 22+ and PostgreSQL 16.

```bash
# 1. Database
createuser -P doomsday          # password: doomsday
createdb -O doomsday doomsday

# 2. API  (http://localhost:3000/api)
cd backend
npm ci
SEED_ON_START=true npm run start:dev
# or point at another database:
# DATABASE_URL=postgres://user:pass@host:5432/db npm run start:dev

# 3. UI  (http://localhost:5173, proxies /api to the API)
cd ../frontend
npm ci
npm run dev
```

## Tests

```bash
cd backend
npm test            # unit tests for the two algorithms (no database needed)
npm run test:e2e    # API tests against a real PostgreSQL database
```

The e2e tests use `TEST_DATABASE_URL` (default `postgres://doomsday:doomsday@localhost:5432/doomsday_test`) and **wipe that database** before running. Create it with `createdb -O doomsday doomsday_test`.

Every expected result from the assessment is covered by both suites:

| Case | Unit | E2E |
|---|---|---|
| Rewatch order for Avengers: Doomsday → the 7 other movies in a valid order | ✓ | ✓ |
| Rewatch order for Civil War → Iron Man + First Avenger (any order), then The Avengers | ✓ | ✓ |
| Rewatch order for Thor: Ragnarok → empty | ✓ | ✓ |
| Endgame as a prerequisite of Iron Man → `409 CIRCULAR_DEPENDENCY` | ✓ | ✓ |
| Bundles 1, 3, 4 / group 6 → 2 bundles: 3 × 2 | ✓ | ✓ |
| Bundles 2, 5 / group 11 → 4 bundles: 5 × 1, 2 × 3 | ✓ | ✓ |
| Bundles 6, 9, 20 / group 44 → 4 bundles: 20 × 1, 9 × 2, 6 × 1 | ✓ | ✓ |
| Bundles 4, 6 / group 7 → not possible | ✓ | ✓ |

The unit tests also cover diamonds (a shared prerequisite listed once), a 50,000-movie chain (no stack overflow), the largest booking input (10,000 seats, 10 sizes), and a randomised check of the booking quote against a brute-force reference. The e2e tests cover validation, duplicates, unknown ids and status codes.

---

## Project structure

```
doomsday-ready/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── algorithms/            ← Feature 1 & 2 logic, pure functions + unit tests
│   │   │   ├── dependency-graph.ts    cycle check + rewatch order
│   │   │   └── bundle-quote.ts        fewest bundles (dynamic programming)
│   │   ├── movies/                ← entity, DTOs, service, controller
│   │   ├── cinemas/
│   │   ├── database/              ← migration + sample data
│   │   ├── common/                ← error format
│   │   ├── app.module.ts
│   │   ├── setup-app.ts           ← /api prefix, validation, error filter
│   │   └── main.ts
│   └── test/app.e2e-spec.ts
└── frontend/
    ├── nginx.conf                 ← serves the UI, proxies /api in Docker
    └── src/
        ├── api.ts                 ← typed API client
        ├── views/                 ← Movies, Rewatch plan, Booking
        └── components/
```

The algorithms do not touch the database. The services load the data, call the pure functions and save the results, so the logic can be tested on its own.

## Data model

```mermaid
erDiagram
    MOVIES ||--o{ MOVIE_PREREQUISITES : "needs (movie_id)"
    MOVIES ||--o{ MOVIE_PREREQUISITES : "is needed by (prerequisite_id)"

    MOVIES {
        int id PK
        varchar title "unique, case-insensitive"
        int release_year "1888 to 2100"
        int runtime "1 to 300 minutes"
        boolean watched "default false"
        timestamptz created_at
    }

    MOVIE_PREREQUISITES {
        int movie_id PK, FK "the movie"
        int prerequisite_id PK, FK "watch this first"
    }

    CINEMAS {
        int id PK
        varchar name "unique, case-insensitive"
        int_array bundle_sizes "1 to 10 distinct sizes, each 1 to 500"
        timestamptz created_at
    }
```

- **Prerequisites are a self-referencing many-to-many relationship.** Each row in `movie_prerequisites` is one edge of a directed graph: "watch `prerequisite_id` before `movie_id`". The composite primary key prevents duplicate edges, `CHECK (movie_id <> prerequisite_id)` blocks the simplest cycle at the database level, and `ON DELETE CASCADE` removes edges when a movie is deleted. Longer cycles are prevented by the API (see below).
- **Bundle sizes are a PostgreSQL integer array**, because they are always read and written together with their cinema and never queried on their own.
- Uniqueness is enforced by unique indexes on `lower(title)` and `lower(name)`, and the main range rules are repeated as `CHECK` constraints, so bad data cannot get in even if a bug slips past the API.

---

## API

All endpoints are under `/api`. Request and response bodies are JSON.

| Method and path | Purpose |
|---|---|
| `POST /movies` | Create a movie |
| `GET /movies` | List movies (with their prerequisites) |
| `GET /movies/:id` | Get one movie *(extra)* |
| `PATCH /movies/:id` | Update a movie, including `watched` and prerequisites |
| `DELETE /movies/:id` | Delete a movie *(extra)* |
| `GET /movies/:id/rewatch-order` | Rewatch order (feature 1) |
| `POST /cinemas` | Create a cinema |
| `GET /cinemas` | List cinemas |
| `GET /cinemas/:id` | Get one cinema *(extra)* |
| `DELETE /cinemas/:id` | Delete a cinema *(extra)* |
| `GET /cinemas/:id/booking?groupSize=6` | Booking quote (feature 2) |
| `GET /health` | Health check used by Docker *(extra)* |

### Movies

`POST /api/movies`

```json
{
  "title": "Avengers: Infinity War",
  "releaseYear": 2018,
  "runtime": 149,
  "prerequisiteIds": [4, 5],
  "watched": false
}
```

`prerequisiteIds` and `watched` are optional. Response `201`:

```json
{
  "id": 6,
  "title": "Avengers: Infinity War",
  "releaseYear": 2018,
  "runtime": 149,
  "watched": false,
  "prerequisites": [
    { "id": 4, "title": "Captain America: Civil War" },
    { "id": 5, "title": "Thor: Ragnarok" }
  ]
}
```

`PATCH /api/movies/:id` accepts any subset of the same fields, for example `{ "watched": true }` or `{ "prerequisiteIds": [7] }`. Sending `prerequisiteIds` **replaces** the whole list (`[]` clears it).

`GET /api/movies/8/rewatch-order`

```json
{
  "target": { "id": 8, "title": "Avengers: Doomsday" },
  "movies": [
    { "id": 1, "title": "Iron Man", "releaseYear": 2008, "runtime": 126, "watched": true },
    { "id": 2, "title": "Captain America: The First Avenger", "releaseYear": 2011, "runtime": 124, "watched": false },
    { "id": 3, "title": "The Avengers", "releaseYear": 2012, "runtime": 143, "watched": false },
    { "id": 4, "title": "Captain America: Civil War", "releaseYear": 2016, "runtime": 147, "watched": false },
    { "id": 5, "title": "Thor: Ragnarok", "releaseYear": 2017, "runtime": 130, "watched": true },
    { "id": 6, "title": "Avengers: Infinity War", "releaseYear": 2018, "runtime": 149, "watched": false },
    { "id": 7, "title": "Avengers: Endgame", "releaseYear": 2019, "runtime": 181, "watched": false }
  ],
  "totalCount": 7,
  "watchedCount": 2,
  "unwatchedCount": 5,
  "unwatchedRuntime": 744
}
```

`unwatchedRuntime` is in minutes.

### Cinemas

`POST /api/cinemas`

```json
{ "name": "Meridian Screens", "bundleSizes": [2, 5] }
```

`GET /api/cinemas/2/booking?groupSize=11`

```json
{
  "cinema": { "id": 2, "name": "Meridian Screens", "bundleSizes": [2, 5] },
  "groupSize": 11,
  "possible": true,
  "totalBundles": 4,
  "bundles": [
    { "size": 5, "count": 1 },
    { "size": 2, "count": 3 }
  ]
}
```

When no exact combination exists: `"possible": false, "totalBundles": null, "bundles": []`.

### Errors

Every error has the same shape:

```json
{ "statusCode": 409, "error": "CIRCULAR_DEPENDENCY", "message": "This change would make the movie depend on itself, directly or through other movies" }
```

| Status | `error` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body or query fails validation (`message` lists every problem), or an unknown field is sent |
| 400 | `UNKNOWN_PREREQUISITE` | A prerequisite id doesn't exist |
| 400 | `BAD_REQUEST` | Non-numeric id in the path |
| 404 | `MOVIE_NOT_FOUND` / `CINEMA_NOT_FOUND` | Unknown id |
| 409 | `DUPLICATE_TITLE` / `DUPLICATE_NAME` | Title or name already used (case-insensitive) |
| 409 | `CIRCULAR_DEPENDENCY` | The change would make a movie depend on itself |

---

## How the algorithms work

Both are written from scratch in `backend/src/algorithms/`, with no graph or optimisation libraries.

### Feature 1: dependency graph

Movies and prerequisites form a directed graph with an edge `movie → prerequisite`.

**Cycle check** (`wouldCreateCycle`): giving movie *M* a new list of prerequisites creates a cycle exactly when *M* can be reached by following prerequisite edges from one of the new prerequisites. A movie listing itself is the direct case. An iterative depth-first search from the new prerequisites answers this and stops as soon as it meets *M*. *M*'s old prerequisites are never followed, which is correct because an update replaces them. **O(V + E).**

The check only runs on `PATCH`. A new movie has nothing depending on it yet, so `POST` can never create a cycle.

All writes that change the graph take a transaction-scoped PostgreSQL advisory lock. Without it, two concurrent updates could each pass the check on their own and together form a cycle.

**Rewatch order** (`getRewatchOrder`): a post-order depth-first search from the target. A movie is added to the list only after all of its prerequisites have been added. That places every movie after its prerequisites (a topological sort limited to the target's ancestors), and a visited set keeps each movie in the list exactly once. The target finishes last and is dropped. The DFS uses an explicit stack, so very long chains cannot overflow the call stack. **O(V + E).**

Many orders can be valid. To make the output stable and natural, the service explores prerequisites oldest-first (by release year). For the sample data this gives exactly the order shown in the assessment.

### Feature 2: booking quote

Finding the fewest bundles that add up to exactly *n* seats, with unlimited bundles of each size, is the **minimum coin change** problem. Picking the largest bundle first (greedy) gives wrong answers:

- sizes 1, 3, 4, group 6: greedy takes 4 + 1 + 1 (3 bundles), but 3 + 3 (2 bundles) is better
- sizes 6, 9, 20, group 44: greedy takes 20 + 20, gets stuck with 4 left over and wrongly reports "not possible", but 20 + 9 + 9 + 6 works

So `quoteBundles` uses bottom-up **dynamic programming**:

```
dp[0] = 0
dp[s] = min over bundle sizes b ≤ s of dp[s − b] + 1      (∞ if no size fits)
```

`last[s]` remembers which bundle size gave the best value for `s`. Walking `last` back from `n` to `0` rebuilds how many of each size to buy. **O(n × k)** time and **O(n)** space. For the largest allowed input (n = 10,000, k = 10) that is 100,000 steps, effectively instant. On ties the larger bundle wins, so the answer is deterministic.

---

## Assumptions and decisions

- **Release year range.** The brief says *"Release year and runtime in minutes: 1–300"*. Applying 1–300 to the year would reject every real movie, so the range applies to **runtime** only. The release year must be a whole number from 1888 (the first known motion picture) to 2100.
- **Titles and cinema names** are trimmed and unique **case-insensitively** ("iron man" clashes with "Iron Man"). A clash returns `409`, matching the conflict status the brief uses for cycles.
- **Prerequisites are sent as ids** (`prerequisiteIds`). On `PATCH` the list **replaces** the old one. Duplicate ids in the list are ignored. Unknown ids return `400 UNKNOWN_PREREQUISITE` and nothing is saved.
- **A failed update changes nothing.** Each update runs in one transaction, so a `409` or `400` leaves the movie as it was, including its other fields.
- **Bundle sizes** must be distinct: a repeated size returns `400`, because the brief asks for "different" sizes. They are stored in ascending order.
- **"Not possible" returns `200`** with `possible: false`. The request is valid; there is just no exact combination.
- **Booking output** lists bundle sizes largest first, without sizes that have a count of zero.
- **Rewatch order** includes watched movies, marked `watched: true`, so the plan can show progress. Only unwatched movies count towards `unwatchedRuntime`.
- **Extra endpoints** (get one, delete, health) were added for the UI and Docker. Deleting a movie also removes it from other movies' prerequisite lists.
- **Sample data:** runtimes are the theatrical runtimes. *Avengers: Doomsday* has not been released, so its 150-minute runtime is a placeholder. The four sample cinema names are invented.
- **No authentication.** The brief has a single shared list of movies and cinemas, so `watched` is global rather than per user.

---

## AI usage

This project was built with **Claude (Anthropic)**, an AI assistant, which:

- read the brief and pointed out where it was ambiguous (for example the release-year range),
- wrote the code: backend, tests, frontend, Docker setup,
- wrote this README.

I reviewed the code, ran the unit and e2e tests and the app, and checked every expected result in the brief against the actual output.


