import { renderHook } from '@testing-library/react';
import { usePortfolioHistory } from '../usePortfolioHistory';

describe('usePortfolioHistory', () => {
  it('should clear history and error when username is undefined', () => {
    const { result, rerender } = renderHook(({ username }: { username?: string }) => usePortfolioHistory(username), {
      initialProps: { username: undefined },
    });
    expect(result.current.history).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    // Should remain clear if username stays undefined
    rerender({ username: undefined });
    expect(result.current.history).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 