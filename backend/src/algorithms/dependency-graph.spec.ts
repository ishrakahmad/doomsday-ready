import { CycleDetectedError, getRewatchOrder, wouldCreateCycle } from './dependency-graph';

// Sample data from the assessment PDF.
const IRON_MAN = 1;
const FIRST_AVENGER = 2;
const AVENGERS = 3;
const CIVIL_WAR = 4;
const RAGNAROK = 5;
const INFINITY_WAR = 6;
const ENDGAME = 7;
const DOOMSDAY = 8;

const sampleGraph = (): Map<number, number[]> =>
  new Map([
    [IRON_MAN, []],
    [FIRST_AVENGER, []],
    [AVENGERS, [IRON_MAN, FIRST_AVENGER]],
    [CIVIL_WAR, [AVENGERS]],
    [RAGNAROK, []],
    [INFINITY_WAR, [CIVIL_WAR, RAGNAROK]],
    [ENDGAME, [INFINITY_WAR]],
    [DOOMSDAY, [ENDGAME]],
  ]);

/** Every movie in `order` appears after all of its prerequisites. */
function expectValidOrder(graph: Map<number, number[]>, order: number[]) {
  const position = new Map(order.map((id, i) => [id, i]));
  for (const id of order) {
    for (const prerequisiteId of graph.get(id) ?? []) {
      expect(position.get(prerequisiteId)).toBeLessThan(position.get(id)!);
    }
  }
}

describe('getRewatchOrder', () => {
  it('Avengers: Doomsday -> all 7 other movies in a valid order', () => {
    const graph = sampleGraph();
    const order = getRewatchOrder(graph, DOOMSDAY);
    expect(order).toHaveLength(7);
    expect(new Set(order)).toEqual(
      new Set([IRON_MAN, FIRST_AVENGER, AVENGERS, CIVIL_WAR, RAGNAROK, INFINITY_WAR, ENDGAME]),
    );
    expectValidOrder(graph, order);
    // With prerequisites listed as in the PDF we get exactly the PDF's example order.
    expect(order).toEqual([IRON_MAN, FIRST_AVENGER, AVENGERS, CIVIL_WAR, RAGNAROK, INFINITY_WAR, ENDGAME]);
  });

  it('Captain America: Civil War -> Iron Man and The First Avenger, then The Avengers', () => {
    const order = getRewatchOrder(sampleGraph(), CIVIL_WAR);
    expect(order).toHaveLength(3);
    expect(new Set(order.slice(0, 2))).toEqual(new Set([IRON_MAN, FIRST_AVENGER]));
    expect(order[2]).toBe(AVENGERS);
  });

  it('Thor: Ragnarok -> empty list', () => {
    expect(getRewatchOrder(sampleGraph(), RAGNAROK)).toEqual([]);
  });

  it('lists a shared prerequisite only once (diamond)', () => {
    // 4 needs 2 and 3; both need 1.
    const graph = new Map([
      [1, []],
      [2, [1]],
      [3, [1]],
      [4, [2, 3]],
    ]);
    const order = getRewatchOrder(graph, 4);
    expect(order).toHaveLength(3);
    expect(order[0]).toBe(1);
    expectValidOrder(graph, order);
  });

  it('never includes the target', () => {
    expect(getRewatchOrder(sampleGraph(), DOOMSDAY)).not.toContain(DOOMSDAY);
  });

  it('handles a very long chain without stack overflow', () => {
    const n = 50_000;
    const graph = new Map<number, number[]>();
    for (let i = 1; i <= n; i++) graph.set(i, i > 1 ? [i - 1] : []);
    const order = getRewatchOrder(graph, n);
    expect(order).toHaveLength(n - 1);
    expect(order[0]).toBe(1);
    expect(order[n - 2]).toBe(n - 1);
  });

  it('throws if stored data somehow contains a cycle', () => {
    const graph = new Map([
      [1, [2]],
      [2, [1]],
      [3, [1]],
    ]);
    expect(() => getRewatchOrder(graph, 3)).toThrow(CycleDetectedError);
  });
});

describe('wouldCreateCycle', () => {
  it('making Avengers: Endgame a prerequisite of Iron Man is circular', () => {
    expect(wouldCreateCycle(sampleGraph(), IRON_MAN, [ENDGAME])).toBe(true);
  });

  it('a movie cannot depend on itself directly', () => {
    expect(wouldCreateCycle(sampleGraph(), RAGNAROK, [RAGNAROK])).toBe(true);
  });

  it('allows valid edges', () => {
    expect(wouldCreateCycle(sampleGraph(), RAGNAROK, [IRON_MAN])).toBe(false);
    expect(wouldCreateCycle(sampleGraph(), DOOMSDAY, [ENDGAME, RAGNAROK])).toBe(false);
    expect(wouldCreateCycle(sampleGraph(), IRON_MAN, [])).toBe(false);
  });

  it('ignores the movie\'s own old prerequisites (they are being replaced)', () => {
    // Infinity War currently needs Civil War; replacing that with Ragnarok is fine.
    expect(wouldCreateCycle(sampleGraph(), INFINITY_WAR, [RAGNAROK])).toBe(false);
  });

  it('detects longer indirect cycles', () => {
    expect(wouldCreateCycle(sampleGraph(), FIRST_AVENGER, [DOOMSDAY])).toBe(true);
    expect(wouldCreateCycle(sampleGraph(), AVENGERS, [CIVIL_WAR])).toBe(true);
  });
});
