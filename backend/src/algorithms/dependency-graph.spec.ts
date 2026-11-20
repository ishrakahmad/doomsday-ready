import { getRewatchOrder, wouldCreateCycle } from './dependency-graph';


const IRON_MAN = 1;
const FIRST_AVENGER = 2;
const AVENGERS = 3;
const CIVIL_WAR = 4;
const RAGNAROK = 5;
const INFINITY_WAR = 6;
const ENDGAME = 7;
const DOOMSDAY = 8;

const graph = new Map<number, number[]>([
  [IRON_MAN, []],
  [FIRST_AVENGER, []],
  [AVENGERS, [IRON_MAN, FIRST_AVENGER]],
  [CIVIL_WAR, [AVENGERS]],
  [RAGNAROK, []],
  [INFINITY_WAR, [CIVIL_WAR, RAGNAROK]],
  [ENDGAME, [INFINITY_WAR]],
  [DOOMSDAY, [ENDGAME]],
]);

describe('getRewatchOrder', () => {
  it('Avengers: Doomsday -> all 7 other movies', () => {
    expect(getRewatchOrder(graph, DOOMSDAY)).toEqual([
      IRON_MAN,
      FIRST_AVENGER,
      AVENGERS,
      CIVIL_WAR,
      RAGNAROK,
      INFINITY_WAR,
      ENDGAME,
    ]);
  });

  it('Civil War -> Iron Man and The First Avenger, then The Avengers', () => {
    expect(getRewatchOrder(graph, CIVIL_WAR)).toEqual([IRON_MAN, FIRST_AVENGER, AVENGERS]);
  });

  it('Thor: Ragnarok -> empty list', () => {
    expect(getRewatchOrder(graph, RAGNAROK)).toEqual([]);
  });
});

describe('wouldCreateCycle', () => {
  it('Endgame as a prerequisite of Iron Man is a cycle', () => {
    expect(wouldCreateCycle(graph, IRON_MAN, [ENDGAME])).toBe(true);
  });

  it('a movie cannot be its own prerequisite', () => {
    expect(wouldCreateCycle(graph, RAGNAROK, [RAGNAROK])).toBe(true);
  });

  it('allows a normal prerequisite', () => {
    expect(wouldCreateCycle(graph, RAGNAROK, [IRON_MAN])).toBe(false);
  });
});