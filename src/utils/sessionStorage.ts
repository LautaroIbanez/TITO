/**
 * Safely retrieves and parses session data from localStorage
 * @returns Parsed session data or null if parsing fails or data doesn't exist
 */
export function getSessionData(): any {
  try {
    const sessionData = localStorage.getItem('session');
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  } catch (error) {
    console.warn('Failed to parse session data from localStorage:', error);
    return null;
  }
}

/**
 * Safely stores session data to localStorage
 * @param data The data to store
 * @returns true if successful, false if storage fails
 */
export function setSessionData(data: any): boolean {
  try {
    localStorage.setItem('session', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to store session data to localStorage:', error);
    return false;
  }
}

/**
 * Safely removes session data from localStorage
 * @returns true if successful, false if removal fails
 */
export function clearSessionData(): boolean {
  try {
    localStorage.removeItem('session');
    return true;
  } catch (error) {
    console.error('Failed to clear session data from localStorage:', error);
    return false;
  }
} 