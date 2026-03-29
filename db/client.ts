import * as SQLite from 'expo-sqlite';

type Database = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

let databasePromise: Promise<Database> | null = null;
let initialized = false;

export async function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('doneyet.db');
  }

  return databasePromise;
}

export async function withDatabase<T>(handler: (database: Database) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  return handler(database);
}

export function markDatabaseInitialized(): void {
  initialized = true;
}

export function isDatabaseInitialized(): boolean {
  return initialized;
}
