
export type PrerequisiteGraph = ReadonlyMap<number, readonly number[]>;


export function wouldCreateCycle(
  graph: PrerequisiteGraph,
  movieId: number,
  newPrerequisiteIds: readonly number[],
): boolean {
  const visited = new Set<number>();

  function leadsBack(id: number): boolean {
    if (id === movieId) return true;
    if (visited.has(id)) return false;
    visited.add(id);

    for (const prerequisiteId of graph.get(id) ?? []) {
      if (leadsBack(prerequisiteId)) return true;
    }
    return false;
  }

  for (const id of newPrerequisiteIds) {
    if (leadsBack(id)) return true;
  }
  return false;
}


export function getRewatchOrder(graph: PrerequisiteGraph, targetId: number): number[] {
  const visited = new Set<number>();
  const order: number[] = [];

  function visit(id: number) {
    if (visited.has(id)) return;
    visited.add(id);

    for (const prerequisiteId of graph.get(id) ?? []) {
      visit(prerequisiteId);
    }
    order.push(id);
  }

  visit(targetId);
  order.pop(); 
  return order;
}