
export type PrerequisiteGraph = ReadonlyMap<number, readonly number[]>;

export class CycleDetectedError extends Error {
  constructor(public readonly movieId: number) {
    super(`Dependency cycle detected at movie ${movieId}`);
  }
}


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


export function getRewatchOrder(graph: PrerequisiteGraph, targetId: number): number[] {
  const VISITING = 1;
  const DONE = 2;
  const state = new Map<number, typeof VISITING | typeof DONE>();
  const order: number[] = [];

  
  const stack: Array<{ id: number; next: number }> = [{ id: targetId, next: 0 }];
  state.set(targetId, VISITING);

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const prerequisites = graph.get(frame.id) ?? [];

    if (frame.next < prerequisites.length) {
      const prerequisiteId = prerequisites[frame.next++];
      const s = state.get(prerequisiteId);
      if (s === DONE) continue; 
      if (s === VISITING) throw new CycleDetectedError(prerequisiteId);
      state.set(prerequisiteId, VISITING);
      stack.push({ id: prerequisiteId, next: 0 });
    } else {
     
      stack.pop();
      state.set(frame.id, DONE);
      order.push(frame.id);
    }
  }

  order.pop(); 
  return order;
}
