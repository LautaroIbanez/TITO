import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const bondsDataPath = path.join(process.cwd(), 'data', 'bonds.json');
const scraperPath = path.join(process.cwd(), 'scripts', 'scrape_bonistas.py');

export async function GET() {
  try {
    // Check if bonds data file exists and is older than 24 hours
    let shouldRefresh = false;
    
    try {
      const stats = await fs.stat(bondsDataPath);
      const fileAge = Date.now() - stats.mtime.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      shouldRefresh = fileAge > twentyFourHours;
    } catch (error) {
      // File doesn't exist, need to refresh
      shouldRefresh = true;
    }

    // Run scraper if data is old or doesn't exist
    if (shouldRefresh) {
      console.log('Bonds data is stale or missing, running scraper...');
      try {
        await execAsync(`python3 "${scraperPath}"`);
        console.log('Bond scraper completed successfully');
      } catch (error) {
        console.error('Failed to run bond scraper:', error);
        // Continue with existing data if scraper fails
      }
    }

    // Read and return bonds data
    const fileContents = await fs.readFile(bondsDataPath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Return bonds array if it's the new format, or the whole data if it's the old format
    const bonds = data.bonds || data;
    
    return NextResponse.json(bonds);
  } catch (error) {
    console.error('Failed to read bonds data:', error);
    return NextResponse.json({ message: 'Error reading bonds data file.' }, { status: 500 });
  }
} 