import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CAUCIONES_PATH = path.join(process.cwd(), 'data', 'cauciones.json');
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

async function tryUpdateCauciones() {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(process.cwd(), 'scripts', 'update-cauciones.ts')], {
      stdio: 'ignore',
      shell: true,
    });
    child.on('exit', (code) => {
      resolve(code === 0);
    });
    child.on('error', () => {
      resolve(false);
    });
  });
}

export async function GET() {
  let cauciones;
  let source = 'unknown';
  try {
    const data = await fs.readFile(CAUCIONES_PATH, 'utf-8');
    cauciones = JSON.parse(data);
    // Check if data is stale
    const lastUpdated = new Date(cauciones.lastUpdated);
    const now = new Date();
    if (now.getTime() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
      // Try to update data
      const updated = await tryUpdateCauciones();
      if (updated) {
        // Reload the file after update
        const newData = await fs.readFile(CAUCIONES_PATH, 'utf-8');
        cauciones = JSON.parse(newData);
        source = (cauciones.rates[0]?.provider || 'unknown') + ' (refreshed)';
      } else {
        source = (cauciones.rates[0]?.provider || 'unknown') + ' (stale)';
      }
    } else {
      source = (cauciones.rates[0]?.provider || 'unknown');
    }
    return NextResponse.json({ ...cauciones, source });
  } catch (error) {
    console.error('Failed to fetch cauciones data:', error);
    return NextResponse.json({ error: 'Failed to fetch cauciones data' }, { status: 500 });
  }
} 