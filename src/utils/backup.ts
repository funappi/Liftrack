// Backup / restore of every localStorage key starting with 'volt_'.
// The storage is passed as a parameter (defaults to localStorage) so the functions stay testable.

const BACKUP_APP = 'volt-athlete';
const BACKUP_VERSION = 1;
const BACKUP_KEY_PREFIX = 'volt_';

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<string, string>; // raw localStorage values
}

type StorageLike = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem'>;

export function exportBackup(storage: StorageLike = localStorage, now: Date = new Date()): BackupFile {
  const data: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(BACKUP_KEY_PREFIX)) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

// File name: volt-sauvegarde-AAAA-MM-JJ.json (local date)
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `volt-sauvegarde-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un JSON valide." };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde VOLT." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== BACKUP_APP) {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde VOLT." };
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    return { ok: false, error: 'Version de sauvegarde non prise en charge.' };
  }
  const data = obj.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'La sauvegarde ne contient aucune donnée.' };
  }
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!key.startsWith(BACKUP_KEY_PREFIX) || typeof value !== 'string') {
      return { ok: false, error: `Entrée invalide dans la sauvegarde : « ${key} ».` };
    }
    clean[key] = value;
  }
  if (Object.keys(clean).length === 0) {
    return { ok: false, error: 'La sauvegarde ne contient aucune donnée.' };
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: obj.version,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      data: clean,
    },
  };
}

// Writes the 'volt_*' keys from the backup. Never removes keys absent from the file.
// Returns the number of keys written; throws if storage refuses a write (e.g. quota).
export function restoreBackup(backup: BackupFile, storage: StorageLike = localStorage): number {
  let written = 0;
  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(BACKUP_KEY_PREFIX)) continue;
    storage.setItem(key, value);
    written++;
  }
  return written;
}
