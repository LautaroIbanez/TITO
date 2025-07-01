import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from '@/types';

/**
 * Sanitizes a username to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required and must be a string');
  }

  // Validate username length
  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be between 3 and 20 characters');
  }

  // Sanitize username to prevent path traversal attacks
  // Only allow alphanumeric characters, hyphens, and underscores
  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  
  if (sanitizedUsername !== username.toLowerCase() || sanitizedUsername.length === 0) {
    throw new Error('Invalid username format. Only letters, numbers, hyphens, and underscores are allowed.');
  }

  return sanitizedUsername;
}

/**
 * Validates that a file path is within the expected data directory
 */
function validateFilePath(filePath: string, expectedPrefix: string): void {
  if (!path.resolve(filePath).startsWith(expectedPrefix)) {
    throw new Error('Invalid file path');
  }
}

/**
 * Gets user data from the file system with proper sanitization and validation
 */
export async function getUserData(username: string): Promise<UserData | null> {
  try {
    const sanitizedUsername = sanitizeUsername(username);
    
    // Ensure data directory exists and is within the expected path
    const dataDir = path.resolve(process.cwd(), 'data', 'users');
    const expectedPrefix = path.resolve(process.cwd(), 'data');
    
    if (!dataDir.startsWith(expectedPrefix)) {
      throw new Error('Invalid data directory path');
    }

    await fs.mkdir(dataDir, { recursive: true });

    const userFilePath = path.join(dataDir, `${sanitizedUsername}.json`);
    
    // Verify the constructed path is still within the data directory
    validateFilePath(userFilePath, dataDir);

    // Try to read existing user data
    const fileContent = await fs.readFile(userFilePath, 'utf-8');
    return JSON.parse(fileContent) as UserData;
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such file or directory')) {
      return null; // User doesn't exist
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Saves user data to the file system with proper sanitization and validation
 */
export async function saveUserData(username: string, data: UserData): Promise<void> {
  try {
    const sanitizedUsername = sanitizeUsername(username);
    
    // Ensure data directory exists and is within the expected path
    const dataDir = path.resolve(process.cwd(), 'data', 'users');
    const expectedPrefix = path.resolve(process.cwd(), 'data');
    
    if (!dataDir.startsWith(expectedPrefix)) {
      throw new Error('Invalid data directory path');
    }

    await fs.mkdir(dataDir, { recursive: true });

    const userFilePath = path.join(dataDir, `${sanitizedUsername}.json`);
    
    // Verify the constructed path is still within the data directory
    validateFilePath(userFilePath, dataDir);

    // Save the user data
    await fs.writeFile(userFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to save data for user ${username}:`, error);
    throw new Error('Failed to save user data');
  }
}

/**
 * Creates a new user with default data structure
 */
export async function createUser(username: string): Promise<UserData> {
  const sanitizedUsername = sanitizeUsername(username);
  
  const userData: UserData = {
    username: sanitizedUsername,
    createdAt: new Date().toISOString(),
    profileCompleted: false,
    positions: [],
    transactions: [],
    goals: [],
    cash: { ARS: 0, USD: 0 }
  };

  await saveUserData(sanitizedUsername, userData);
  return userData;
}

/**
 * Gets or creates user data (useful for login flow)
 */
export async function getOrCreateUser(username: string): Promise<UserData> {
  let userData = await getUserData(username);
  
  if (!userData) {
    userData = await createUser(username);
  }
  
  return userData;
} 