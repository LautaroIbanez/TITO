import { trimHistory, trimCategoryValueHistory } from '../history';

describe('trimHistory', () => {
  it('should return empty array for empty input', () => {
    const result = trimHistory([]);
    expect(result).toEqual([]);
  });

  it('should return original array if no zero values at start', () => {
    const input = [
      { invested: 100, total: 110 },
      { invested: 200, total: 220 },
      { invested: 300, total: 330 }
    ];
    const result = trimHistory(input);
    expect(result).toEqual(input);
  });

  it('should trim initial zero values', () => {
    const input = [
      { invested: 0, total: 0 },
      { invested: 0, total: 0 },
      { invested: 100, total: 110 },
      { invested: 200, total: 220 }
    ];
    const expected = [
      { invested: 100, total: 110 },
      { invested: 200, total: 220 }
    ];
    const result = trimHistory(input);
    expect(result).toEqual(expected);
  });

  it('should trim when only invested is zero', () => {
    const input = [
      { invested: 0, total: 0 },
      { invested: 0, total: 5 },
      { invested: 100, total: 110 }
    ];
    const expected = [
      { invested: 0, total: 5 },
      { invested: 100, total: 110 }
    ];
    const result = trimHistory(input);
    expect(result).toEqual(expected);
  });

  it('should trim when only total is zero', () => {
    const input = [
      { invested: 0, total: 0 },
      { invested: 50, total: 0 },
      { invested: 100, total: 110 }
    ];
    const expected = [
      { invested: 50, total: 0 },
      { invested: 100, total: 110 }
    ];
    const result = trimHistory(input);
    expect(result).toEqual(expected);
  });

  it('should return empty array if all values are zero', () => {
    const input = [
      { invested: 0, total: 0 },
      { invested: 0, total: 0 },
      { invested: 0, total: 0 }
    ];
    const result = trimHistory(input);
    expect(result).toEqual([]);
  });
});

describe('trimCategoryValueHistory', () => {
  it('should return empty array for empty input', () => {
    const result = trimCategoryValueHistory([]);
    expect(result).toEqual([]);
  });

  it('should return original array if no zero totalValue at start', () => {
    const input = [
      { totalValue: 100, categories: { cash: 100 } },
      { totalValue: 200, categories: { cash: 200 } },
      { totalValue: 300, categories: { cash: 300 } }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual(input);
  });

  it('should trim initial zero totalValue entries', () => {
    const input = [
      { totalValue: 0, categories: { cash: 0 } },
      { totalValue: 0, categories: { cash: 0 } },
      { totalValue: 100, categories: { cash: 100 } },
      { totalValue: 200, categories: { cash: 200 } }
    ];
    const expected = [
      { totalValue: 100, categories: { cash: 100 } },
      { totalValue: 200, categories: { cash: 200 } }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual(expected);
  });

  it('should handle complex category structures', () => {
    const input = [
      { totalValue: 0, categories: { cash: 0, stocks: 0 } },
      { totalValue: 0, categories: { cash: 0, stocks: 0 } },
      { totalValue: 150, categories: { cash: 50, stocks: 100 } },
      { totalValue: 250, categories: { cash: 75, stocks: 175 } }
    ];
    const expected = [
      { totalValue: 150, categories: { cash: 50, stocks: 100 } },
      { totalValue: 250, categories: { cash: 75, stocks: 175 } }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual(expected);
  });

  it('should return empty array if all totalValue are zero', () => {
    const input = [
      { totalValue: 0, categories: { cash: 0 } },
      { totalValue: 0, categories: { cash: 0 } },
      { totalValue: 0, categories: { cash: 0 } }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual([]);
  });

  it('should handle edge case with very small non-zero values', () => {
    const input = [
      { totalValue: 0, categories: { cash: 0 } },
      { totalValue: 0.001, categories: { cash: 0.001 } },
      { totalValue: 100, categories: { cash: 100 } }
    ];
    const expected = [
      { totalValue: 0.001, categories: { cash: 0.001 } },
      { totalValue: 100, categories: { cash: 100 } }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual(expected);
  });

  it('should preserve all properties of trimmed entries', () => {
    const input = [
      { totalValue: 0, categories: { cash: 0 }, date: '2023-01-01' },
      { totalValue: 0, categories: { cash: 0 }, date: '2023-01-02' },
      { totalValue: 100, categories: { cash: 100 }, date: '2023-01-03' },
      { totalValue: 200, categories: { cash: 200 }, date: '2023-01-04' }
    ];
    const expected = [
      { totalValue: 100, categories: { cash: 100 }, date: '2023-01-03' },
      { totalValue: 200, categories: { cash: 200 }, date: '2023-01-04' }
    ];
    const result = trimCategoryValueHistory(input);
    expect(result).toEqual(expected);
  });
}); 