import { quoteBundles } from './bundle-quote';

const seats = (q: ReturnType<typeof quoteBundles>) =>
  q.bundles.reduce((sum, line) => sum + line.size * line.count, 0);

describe('quoteBundles — examples from the assessment PDF', () => {
  it('1, 3, 4 / 6 -> 2 bundles: 3 × 2', () => {
    expect(quoteBundles([1, 3, 4], 6)).toEqual({
      possible: true,
      totalBundles: 2,
      bundles: [{ size: 3, count: 2 }],
    });
  });

  it('2, 5 / 11 -> 4 bundles: 5 × 1, 2 × 3', () => {
    expect(quoteBundles([2, 5], 11)).toEqual({
      possible: true,
      totalBundles: 4,
      bundles: [
        { size: 5, count: 1 },
        { size: 2, count: 3 },
      ],
    });
  });

  it('6, 9, 20 / 44 -> 4 bundles: 20 × 1, 9 × 2, 6 × 1', () => {
    expect(quoteBundles([6, 9, 20], 44)).toEqual({
      possible: true,
      totalBundles: 4,
      bundles: [
        { size: 20, count: 1 },
        { size: 9, count: 2 },
        { size: 6, count: 1 },
      ],
    });
  });

  it('4, 6 / 7 -> not possible', () => {
    expect(quoteBundles([4, 6], 7)).toEqual({ possible: false, totalBundles: null, bundles: [] });
  });
});

describe('quoteBundles — edge cases', () => {
  it('group of 1 with a 1-seat bundle', () => {
    expect(quoteBundles([1], 1)).toEqual({ possible: true, totalBundles: 1, bundles: [{ size: 1, count: 1 }] });
  });

  it('group smaller than every bundle is not possible', () => {
    expect(quoteBundles([5, 10], 3).possible).toBe(false);
  });

  it('exact single bundle', () => {
    expect(quoteBundles([2, 5, 500], 500).totalBundles).toBe(1);
  });

  it('ignores duplicate sizes and input order', () => {
    expect(quoteBundles([5, 2, 5, 2], 11)).toEqual(quoteBundles([2, 5], 11));
  });

  it('largest limits: 10,000 seats with 10 sizes is fast and exact', () => {
    const sizes = [7, 13, 29, 61, 127, 251, 337, 409, 463, 499];
    const start = Date.now();
    const quote = quoteBundles(sizes, 10_000);
    expect(Date.now() - start).toBeLessThan(500);
    expect(quote.possible).toBe(true);
    expect(seats(quote)).toBe(10_000);
  });

  it('beats greedy where greedy is wrong', () => {
    // Greedy would take 4+1+1 = 3 bundles.
    expect(quoteBundles([1, 3, 4], 6).totalBundles).toBe(2);
    // Greedy would take 20+20 and get stuck with 4.
    expect(quoteBundles([6, 9, 20], 44).possible).toBe(true);
  });

  it('always sums to exactly the group size (randomised check vs brute force)', () => {
    const bruteForce = (sizes: number[], n: number): number | null => {
      const best = new Array(n + 1).fill(Infinity);
      best[0] = 0;
      for (let s = 1; s <= n; s++) for (const b of sizes) if (b <= s) best[s] = Math.min(best[s], best[s - b] + 1);
      return best[n] === Infinity ? null : best[n];
    };
    let seed = 42;
    const rand = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return 1 + (seed % max);
    };
    for (let i = 0; i < 300; i++) {
      const sizes = Array.from({ length: rand(4) }, () => rand(30));
      const n = rand(200);
      const quote = quoteBundles(sizes, n);
      const expected = bruteForce([...new Set(sizes)], n);
      if (expected === null) {
        expect(quote.possible).toBe(false);
      } else {
        expect(quote.totalBundles).toBe(expected);
        expect(seats(quote)).toBe(n);
      }
    }
  });

  it('rejects invalid input', () => {
    expect(() => quoteBundles([2], 0)).toThrow(RangeError);
    expect(() => quoteBundles([0], 5)).toThrow(RangeError);
  });
});
