import { getSessionData, setSessionData, clearSessionData } from '../sessionStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  
  const mock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    store
  };
  
  return mock;
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('sessionStorage utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('getSessionData', () => {
    it('should return null when no session data exists', () => {
      const result = getSessionData();
      expect(result).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('session');
    });

    it('should return parsed data when valid JSON exists', () => {
      const mockData = { username: 'testuser', token: 'abc123' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = getSessionData();
      expect(result).toEqual(mockData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('session');
    });

    it('should return null when JSON parsing fails', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = getSessionData();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse session data from localStorage:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should return null when localStorage.getItem throws an error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = getSessionData();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse session data from localStorage:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle complex nested objects', () => {
      const mockData = {
        user: {
          id: 1,
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            language: 'en'
          }
        },
        timestamp: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = getSessionData();
      expect(result).toEqual(mockData);
    });
  });

  describe('setSessionData', () => {
    it('should successfully store valid data', () => {
      const mockData = { username: 'testuser', token: 'abc123' };
      
      const result = setSessionData(mockData);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'session',
        JSON.stringify(mockData)
      );
    });

    it('should return false when localStorage.setItem throws an error', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = setSessionData({ test: 'data' });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store session data to localStorage:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = setSessionData(circularObj);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store session data to localStorage:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('clearSessionData', () => {
    it('should successfully clear session data', () => {
      const result = clearSessionData();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('session');
    });

    it('should return false when localStorage.removeItem throws an error', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = clearSessionData();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear session data from localStorage:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });


}); 