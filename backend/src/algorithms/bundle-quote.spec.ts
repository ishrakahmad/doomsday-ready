import { quoteBundles } from './bundle-quote';

describe('quoteBundles', () => {
  it('1, 3, 4 / 6 -> 2 bundles: 3 x 2', () => {
    expect(quoteBundles([1, 3, 4], 6)).toEqual({
      possible: true,
      totalBundles: 2,
      bundles: [{ size: 3, count: 2 }],
    });
  });

  it('2, 5 / 11 -> 4 bundles: 5 x 1, 2 x 3', () => {
    expect(quoteBundles([2, 5], 11)).toEqual({
      possible: true,
      totalBundles: 4,
      bundles: [
        { size: 5, count: 1 },
        { size: 2, count: 3 },
      ],
    });
  });

  it('6, 9, 20 / 44 -> 4 bundles: 20 x 1, 9 x 2, 6 x 1', () => {
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