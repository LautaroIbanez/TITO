import { renderHook, waitFor } from '@testing-library/react';
import { useBonistasBonds } from '../useBonistasBonds';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('useBonistasBonds', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch bonds successfully from API', async () => {
    const mockBonds = [
      { id: '1', ticker: 'AL30', price: 100, tir: 15.5 },
      { id: '2', ticker: 'GD30', price: 200, tir: 12.3 }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBonds
    });

    const { result } = renderHook(() => useBonistasBonds());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.bonds).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual(mockBonds);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/bonds');
  });

  it('should fallback to raw API when main API fails', async () => {
    const mockBonds = [
      { id: '1', ticker: 'AL30', price: 100, tir: 15.5 }
    ];

    // Main API fails
    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    // Raw API succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bonds: mockBonds })
    });

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual(mockBonds);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/bonds');
    expect(mockFetch).toHaveBeenCalledWith('/api/bonds/raw');
  });

  it('should fallback to public JSON when both APIs fail', async () => {
    const mockBonds = [
      { id: '1', ticker: 'AL30', price: 100, tir: 15.5 }
    ];

    // Main API fails
    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    // Raw API fails
    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    // Public JSON succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bonds: mockBonds })
    });

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual(mockBonds);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/bonds');
    expect(mockFetch).toHaveBeenCalledWith('/api/bonds/raw');
    expect(mockFetch).toHaveBeenCalledWith('/data/bonistas_bonds.json');
  });

  it('should handle all API and fallback failures', async () => {
    // All sources fail
    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch bonds data from all sources');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle raw API data without bonds property', async () => {
    const mockBonds = [
      { id: '1', ticker: 'AL30', price: 100 }
    ];

    // Main API fails
    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    // Raw API returns data directly (not wrapped in bonds property)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBonds
    });

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonds).toEqual(mockBonds);
    expect(result.current.error).toBe(null);
  });

  it('should provide refetch function', async () => {
    const mockBonds = [{ id: '1', ticker: 'AL30' }];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockBonds
    });

    const { result } = renderHook(() => useBonistasBonds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');

    // Test refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + refetch
    });
  });
}); 