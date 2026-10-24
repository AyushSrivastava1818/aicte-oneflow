import { createApp } from '../server/app';
import { getDatabase, getDbFilePath } from '../server/db/database';
import { seedDatabase } from '../server/db/seed';
import fs from 'fs';

let isInitialized = false;

async function ensureDatabaseInitialized() {
  if (isInitialized) return;
  const dbFile = getDbFilePath();
  const needsSeed = !fs.existsSync(dbFile);
  await getDatabase();
  if (needsSeed) {
    try {
      await seedDatabase();
    } catch (e) {
      console.warn('Vercel serverless auto-seed warning:', e);
    }
  }
  isInitialized = true;
}

const app = createApp();

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseInitialized();
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel API Handler Error:', error);
    return res.status(500).json({
      error: 'Serverless initialization failed',
      message: error?.message || 'Internal Server Error',
    });
  }
}
