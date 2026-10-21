import fs from 'fs';
import path from 'path';
import { createApp } from './app';
import { seedDatabase } from './db/seed';

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aicte_oneflow.sqlite');

async function startServer() {
  try {
    // If database does not exist, run deterministic seed
    if (!fs.existsSync(DB_FILE)) {
      console.log('Database not found. Initializing schema and seed data...');
      await seedDatabase();
      console.log('Database seeded successfully.');
    }

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` AICTE OneFlow Relational Backend Server Active     `);
      console.log(` Listening on: http://localhost:${PORT}             `);
      console.log(` Health Check: http://localhost:${PORT}/api/health  `);
      console.log(` Database:     ${DB_FILE}                           `);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
