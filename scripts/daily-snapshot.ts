import fs from 'fs/promises';
import path from 'path';
import { guardarSnapshotDiario } from '../src/utils/portfolioHistory';

async function getUsernames(): Promise<string[]> {
  try {
    const usersDir = path.join(process.cwd(), 'data', 'users');
    const files = await fs.readdir(usersDir);
    
    // Filter for .json files and extract usernames (remove .json extension)
    const usernames = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    return usernames;
  } catch (error) {
    console.error('Error reading users directory:', error);
    return [];
  }
}

async function main() {
  console.log('Starting daily portfolio snapshot generation...');
  
  try {
    // Get all usernames
    const usernames = await getUsernames();
    
    if (usernames.length === 0) {
      console.log('No users found in data/users/ directory');
      return;
    }
    
    console.log(`Found ${usernames.length} users: ${usernames.join(', ')}`);
    
    // Process each user
    for (const username of usernames) {
      try {
        console.log(`Processing snapshot for user: ${username}`);
        await guardarSnapshotDiario(username);
      } catch (error) {
        console.error(`Error processing snapshot for ${username}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    console.log('Daily portfolio snapshot generation completed');
  } catch (error) {
    console.error('Error in daily snapshot script:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error in daily snapshot script:', error);
  process.exit(1);
}); 