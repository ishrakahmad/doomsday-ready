/**
 * Feature 1 — dependency graph logic (no graph libraries).
 *
 * The graph maps a movie id to the ids of its prerequisites, i.e. an edge
 * `movie -> prerequisite` means "watch `prerequisite` before `movie`".
 */
export type PrerequisiteGraph = ReadonlyMap<number, readonly number[]>;

export class CycleDetectedError extends Error {
  constructor(public readonly movieId: number) {
    super(`Dependency cycle detected at movie ${movieId}`);
  }
}

/**
 * Would giving `movieId` the prerequisites `newPrerequisiteIds` create a cycle?
 *
 * A cycle appears exactly when `movieId` can be reached by walking
 * prerequisite edges from one of its new prerequisites (that includes the
 * direct case where a movie lists itself). We run an iterative DFS from the
 * new prerequisites and stop as soon as we meet `movieId`.
 *
 * The movie's *current* prerequisites in `graph` are never followed, because
 * the walk stops the moment it reaches `movieId` — so the check is correct for
 * an update that replaces the old list.
 *
 * Time: O(V + E). Space: O(V).
 */
export function wouldCreateCycle(
  graph: PrerequisiteGraph,
  movieId: number,
  newPrerequisiteIds: readonly number[],
): boolean {
  const stack = [...newPrerequisiteIds];
  const seen = new Set<number>();

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === movieId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const prerequisiteId of graph.get(id) ?? []) {
      if (!seen.has(prerequisiteId)) stack.push(prerequisiteId);
    }
  }
  return false;
}

/**
 * Every movie that must be watched before `targetId` (prerequisites,
 * their prerequisites, and so on), each exactly once, in an order where each
 * movie comes after all of its prerequisites. The target itself is excluded.
 *
 * Implementation: post-order DFS (a topological sort restricted to the
 * target's ancestors). A movie is appended only after all of its
 * prerequisites have been appended. The DFS is iterative, so a very long
 * chain cannot overflow the call stack.
 *
 * Prerequisites are explored in the order the graph lists them, so callers
 * control tie-breaking (the service sorts them by release year).
 *
 * Time: O(V + E) over the ancestors of the target. Space: O(V).
 * Throws CycleDetectedError if the stored data contains a cycle (the API
 * prevents this, so it is a safety net, not a normal path).
 */
export function getRewatchOrder(graph: PrerequisiteGraph, targetId: number): number[] {
  const VISITING = 1;
  const DONE = 2;
  const state = new Map<number, typeof VISITING | typeof DONE>();
  const order: number[] = [];

  // Each frame remembers which prerequisite to explore next.
  const stack: Array<{ id: number; next: number }> = [{ id: targetId, next: 0 }];
  state.set(targetId, VISITING);

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const prerequisites = graph.get(frame.id) ?? [];

    if (frame.next < prerequisites.length) {
      const prerequisiteId = prerequisites[frame.next++];
      const s = state.get(prerequisiteId);
      if (s === DONE) continue; // already placed — keeps every movie unique
      if (s === VISITING) throw new CycleDetectedError(prerequisiteId);
      state.set(prerequisiteId, VISITING);
      stack.push({ id: prerequisiteId, next: 0 });
    } else {
      // All prerequisites of this movie are placed, so it can be placed now.
      stack.pop();
      state.set(frame.id, DONE);
      order.push(frame.id);
    }
  }

  order.pop(); // the target is always finished last — drop it
  return order;
}
