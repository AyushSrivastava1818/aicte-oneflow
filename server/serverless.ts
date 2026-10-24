import { createApp } from './app';
import { getDatabase, getDbFilePath } from './db/database';
import { seedDatabase } from './db/seed';
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
    // Reconstruct proper Express url if routed via Vercel catch-all path parameter
    if (req.query && req.query.path) {
      const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
      if (subpath && !req.url.includes(subpath)) {
        const queryIdx = req.url.indexOf('?');
        const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : '';
        req.url = '/api/' + subpath + qs;
      }
    }

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
