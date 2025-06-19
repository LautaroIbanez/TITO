import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'stocks-list.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const list = JSON.parse(data);
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
} 