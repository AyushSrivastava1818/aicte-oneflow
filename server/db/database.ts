import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

let db: SqlJsDatabase | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aicte_oneflow.sqlite');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = path.resolve(__dirname, 'schema.sql');

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    // Run initial schema migration
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    db.run(schemaSql);
    persistToDisk(db);
  }

  return db;
}

export function persistToDisk(database: SqlJsDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = database.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

export async function query<T = any>(sqlStr: string, params: any[] = []): Promise<T[]> {
  const database = await getDatabase();
  const stmt = database.prepare(sqlStr);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sqlStr: string, params: any[] = []): Promise<T | null> {
  const list = await query<T>(sqlStr, params);
  return list.length > 0 ? list[0] : null;
}

let inTransaction = false;

export async function execute(sqlStr: string, params: any[] = []): Promise<void> {
  const database = await getDatabase();
  database.run(sqlStr, params);
  if (!inTransaction) {
    persistToDisk(database);
  }
}

export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  const database = await getDatabase();
  database.run('BEGIN TRANSACTION;');
  inTransaction = true;
  try {
    const result = await callback();
    inTransaction = false;
    database.run('COMMIT;');
    persistToDisk(database);
    return result;
  } catch (error) {
    inTransaction = false;
    console.error('Transaction failed with inner error:', error);
    try {
      database.run('ROLLBACK;');
    } catch (_rbErr) {
      // ignore rollback error
    }
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const SQL = await initSqlJs();
  const newDb = new SQL.Database();
  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  newDb.run(schemaSql);
  persistToDisk(newDb);
  db = newDb;
}
