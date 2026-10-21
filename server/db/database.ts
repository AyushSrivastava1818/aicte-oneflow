import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let db: SqlJsDatabase | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = path.resolve(__dirname, 'schema.sql');

let customDbPath: string | null = null;

export function setDatabasePath(p: string | null): void {
  customDbPath = p;
  db = null; // force reload for the new path
}

export function getDbFilePath(): string {
  if (customDbPath) return customDbPath;
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const filename = process.env.NODE_ENV === 'test' ? 'test_aicte_oneflow.sqlite' : 'aicte_oneflow.sqlite';
  return path.join(DATA_DIR, filename);
}

// Single-writer async mutex queue to serialize all mutations and transactions
class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn());
    this.queue = next.then(() => {}, () => {});
    return next;
  }
}

const writerLock = new AsyncLock();

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const targetFile = getDbFilePath();
  const targetDir = path.dirname(targetFile);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(targetFile)) {
    const fileBuffer = fs.readFileSync(targetFile);
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
  const targetPath = getDbFilePath();
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const data = database.export();
  // Atomic write via temp file and atomic rename to guarantee crash-resilient persistence
  const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
  fs.writeFileSync(tempPath, Buffer.from(data));
  try {
    fs.renameSync(tempPath, targetPath);
  } catch {
    // Fallback if cross-device or permission lock
    fs.copyFileSync(tempPath, targetPath);
    try { fs.unlinkSync(tempPath); } catch {}
  }
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
  if (inTransaction) {
    const database = await getDatabase();
    database.run(sqlStr, params);
    return;
  }

  await writerLock.acquire(async () => {
    const database = await getDatabase();
    database.run(sqlStr, params);
    persistToDisk(database);
  });
}

export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  return writerLock.acquire(async () => {
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
      try {
        database.run('ROLLBACK;');
      } catch {
        // ignore rollback error if already aborted
      }
      throw error;
    }
  });
}

export async function resetDatabase(): Promise<void> {
  await writerLock.acquire(async () => {
    const targetFile = getDbFilePath();
    const targetDir = path.dirname(targetFile);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const SQL = await initSqlJs();
    const newDb = new SQL.Database();
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    newDb.run(schemaSql);
    persistToDisk(newDb);
    db = newDb;
  });
}

export async function closeDatabase(): Promise<void> {
  await writerLock.acquire(async () => {
    if (db) {
      persistToDisk(db);
      db.close();
      db = null;
    }
  });
}
