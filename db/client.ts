import * as SQLite from 'expo-sqlite';
import { prepareWidgetStorage } from '@/native/DoneYetWidget';

type Database = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

let databasePromise: Promise<Database> | null = null;
let databaseDirectoryPromise: Promise<string | undefined> | null = null;
let initialized = false;

export async function prepareDatabaseStorage(): Promise<string | undefined> {
  if (!databaseDirectoryPromise) {
    databaseDirectoryPromise = prepareWidgetStorage().then((result) => result.databaseDirectory);
  }

  return databaseDirectoryPromise;
}

export async function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = prepareDatabaseStorage().then((databaseDirectory) => SQLite.openDatabaseAsync('doneyet.db', undefined, databaseDirectory));
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
