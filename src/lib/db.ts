import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:backup-tracker.db");
    await db.execute("PRAGMA foreign_keys = ON");
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS storage_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      total_capacity_gb REAL,
      path TEXT,
      notes TEXT,
      deleted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'other',
      os TEXT,
      model TEXT,
      serial_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other',
      tags TEXT,
      notes TEXT,
      encryption_info TEXT,
      reminder_interval_days INTEGER DEFAULT 30,
      watch_path TEXT,
      auto_detect INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS backup_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id INTEGER NOT NULL,
      storage_media_id INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      backup_date TEXT NOT NULL DEFAULT (datetime('now')),
      verified_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE,
      FOREIGN KEY (storage_media_id) REFERENCES storage_media(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS backup_storage_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id INTEGER NOT NULL,
      storage_media_id INTEGER NOT NULL,
      path_on_media TEXT,
      FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE,
      FOREIGN KEY (storage_media_id) REFERENCES storage_media(id) ON DELETE CASCADE,
      UNIQUE(backup_id, storage_media_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      collapsed INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migrations for existing databases
  try {
    await db.execute("ALTER TABLE storage_media ADD COLUMN deleted_at TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN deleted_at TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_entries ADD COLUMN deleted_at TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN auto_detect INTEGER NOT NULL DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN scan_mode TEXT DEFAULT 'subdirectories'");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_entries ADD COLUMN entry_number INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN os TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN model TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN serial_number TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN notes TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN deleted_at TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE storage_media ADD COLUMN is_encrypted INTEGER DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE storage_media ADD COLUMN encryption_type TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE storage_media ADD COLUMN encryption_label TEXT");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN sort_order INTEGER DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN sort_order INTEGER DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN is_paused INTEGER DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN folder_id INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE storage_media ADD COLUMN folder_id INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN folder_id INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN backup_mode TEXT DEFAULT 'manual'");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_frequency TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_time TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_weekday INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_month_day INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_custom_interval_days INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backups ADD COLUMN schedule_note TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN brand TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN provider TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN ip_address TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN url TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE devices ADD COLUMN storage_capacity TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE folders ADD COLUMN parent_id INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN backup_mode TEXT DEFAULT 'manual'");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_frequency TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_time TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_weekday INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_month_day INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_custom_interval_days INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN schedule_note TEXT DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN reminder_interval_days INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN retention_type TEXT DEFAULT 'all'");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_storage_locations ADD COLUMN retention_value INTEGER DEFAULT NULL");
  } catch { /* column already exists */ }
  try {
    await db.execute("ALTER TABLE backup_entries ADD COLUMN is_available INTEGER NOT NULL DEFAULT 1");
  } catch { /* column already exists */ }
  // One-time migration: copy backup_mode/schedule from backups to their storage locations
  try {
    await db.execute(`
      UPDATE backup_storage_locations
      SET backup_mode = (SELECT backup_mode FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_frequency = (SELECT schedule_frequency FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_time = (SELECT schedule_time FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_weekday = (SELECT schedule_weekday FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_month_day = (SELECT schedule_month_day FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_custom_interval_days = (SELECT schedule_custom_interval_days FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          schedule_note = (SELECT schedule_note FROM backups WHERE backups.id = backup_storage_locations.backup_id),
          reminder_interval_days = (SELECT reminder_interval_days FROM backups WHERE backups.id = backup_storage_locations.backup_id)
      WHERE backup_mode IS NULL OR backup_mode = 'manual'
    `);
  } catch { /* already migrated */ }
}

// --- Storage Media ---

export async function getAllMedia() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM storage_media WHERE deleted_at IS NULL ORDER BY name"
  );
}

export async function getMediaWithUsage() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(`
    SELECT sm.*,
      COALESCE((
        SELECT SUM(be.size_bytes) / 1073741824.0
        FROM backup_entries be
        WHERE be.storage_media_id = sm.id
        AND be.id IN (
          SELECT MAX(id) FROM backup_entries GROUP BY backup_id, storage_media_id
        )
      ), 0) as used_gb,
      (SELECT COUNT(DISTINCT bsl.backup_id) FROM backup_storage_locations bsl WHERE bsl.storage_media_id = sm.id) as backup_count
    FROM storage_media sm
    WHERE sm.deleted_at IS NULL
    ORDER BY sm.name
  `);
}

export async function getDeletedMedia() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM storage_media WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
  );
}

export async function createMedia(data: {
  name: string;
  type: string;
  total_capacity_gb: number | null;
  path: string | null;
  notes: string | null;
  is_encrypted?: boolean;
  encryption_type?: string | null;
  encryption_label?: string | null;
}) {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO storage_media (name, type, total_capacity_gb, path, notes, is_encrypted, encryption_type, encryption_label) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [data.name, data.type, data.total_capacity_gb, data.path, data.notes, data.is_encrypted ? 1 : 0, data.encryption_type || null, data.encryption_label || null]
  );
  return result.lastInsertId!;
}

export async function updateMedia(
  id: number,
  data: {
    name: string;
    type: string;
    total_capacity_gb: number | null;
    path: string | null;
    notes: string | null;
    is_encrypted?: boolean;
    encryption_type?: string | null;
    encryption_label?: string | null;
  }
) {
  const db = await getDb();
  await db.execute(
    "UPDATE storage_media SET name=$1, type=$2, total_capacity_gb=$3, path=$4, notes=$5, is_encrypted=$6, encryption_type=$7, encryption_label=$8, updated_at=datetime('now') WHERE id=$9",
    [data.name, data.type, data.total_capacity_gb, data.path, data.notes, data.is_encrypted ? 1 : 0, data.encryption_type || null, data.encryption_label || null, id]
  );
}

export async function softDeleteMedia(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE storage_media SET deleted_at=datetime('now') WHERE id=$1",
    [id]
  );
}

export async function restoreMedia(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE storage_media SET deleted_at=NULL WHERE id=$1",
    [id]
  );
}

export async function permanentDeleteMedia(id: number) {
  const db = await getDb();
  // Remove referencing entries first
  await db.execute("DELETE FROM backup_entries WHERE storage_media_id=$1", [id]);
  await db.execute("DELETE FROM backup_storage_locations WHERE storage_media_id=$1", [id]);
  await db.execute("DELETE FROM storage_media WHERE id=$1", [id]);
}

// --- Devices ---

export async function getAllDevices() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );
}

export async function getDeletedDevices() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM devices WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
  );
}

export async function createDevice(name: string, type?: string) {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO devices (name, type) VALUES ($1, $2)",
    [name, type || "other"]
  );
}

export async function updateDevice(id: number, data: {
  name: string;
  type: string;
  os: string | null;
  model: string | null;
  serial_number: string | null;
  notes: string | null;
  brand: string | null;
  provider: string | null;
  ip_address: string | null;
  url: string | null;
  storage_capacity: string | null;
}) {
  const db = await getDb();
  await db.execute(
    `UPDATE devices SET name=$1, type=$2, os=$3, model=$4, serial_number=$5, notes=$6,
     brand=$7, provider=$8, ip_address=$9, url=$10, storage_capacity=$11 WHERE id=$12`,
    [data.name, data.type, data.os, data.model, data.serial_number, data.notes,
     data.brand, data.provider, data.ip_address, data.url, data.storage_capacity, id]
  );
}

export async function softDeleteDevice(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE devices SET deleted_at=datetime('now') WHERE id=$1",
    [id]
  );
}

export async function restoreDevice(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE devices SET deleted_at=NULL WHERE id=$1",
    [id]
  );
}

export async function permanentDeleteDevice(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM devices WHERE id=$1", [id]);
}

export async function getDeviceWithBackupCount() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(`
    SELECT d.*,
      (SELECT COUNT(*) FROM backups b WHERE b.device_name = d.name AND b.deleted_at IS NULL) as backup_count
    FROM devices d WHERE d.deleted_at IS NULL ORDER BY d.sort_order, d.name
  `);
}

// --- Backups ---

export async function getAllBackups() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );
}

export async function getDeletedBackups() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
  );
}

export async function getBackupById(id: number) {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE id=$1",
    [id]
  );
  return rows[0] || null;
}

export async function createBackup(data: {
  name: string;
  device_name: string;
  category: string;
  tags: string | null;
  notes: string | null;
  encryption_info: string | null;
  reminder_interval_days: number | null;
  backup_mode: string;
  schedule_frequency: string | null;
  schedule_time: string | null;
  schedule_weekday: number | null;
  schedule_month_day: number | null;
  schedule_custom_interval_days: number | null;
  schedule_note: string | null;
}) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO backups (name, device_name, category, tags, notes, encryption_info, reminder_interval_days,
     backup_mode, schedule_frequency, schedule_time, schedule_weekday, schedule_month_day, schedule_custom_interval_days, schedule_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      data.name,
      data.device_name,
      data.category,
      data.tags,
      data.notes,
      data.encryption_info,
      data.reminder_interval_days,
      data.backup_mode,
      data.schedule_frequency,
      data.schedule_time,
      data.schedule_weekday,
      data.schedule_month_day,
      data.schedule_custom_interval_days,
      data.schedule_note,
    ]
  );
  return result.lastInsertId!;
}

export async function updateBackup(
  id: number,
  data: {
    name: string;
    device_name: string;
    category: string;
    tags: string | null;
    notes: string | null;
    encryption_info: string | null;
    reminder_interval_days: number | null;
    backup_mode: string;
    schedule_frequency: string | null;
    schedule_time: string | null;
    schedule_weekday: number | null;
    schedule_month_day: number | null;
    schedule_custom_interval_days: number | null;
    schedule_note: string | null;
  }
) {
  const db = await getDb();
  await db.execute(
    `UPDATE backups SET name=$1, device_name=$2, category=$3, tags=$4, notes=$5, encryption_info=$6,
     reminder_interval_days=$7, backup_mode=$8, schedule_frequency=$9, schedule_time=$10,
     schedule_weekday=$11, schedule_month_day=$12, schedule_custom_interval_days=$13,
     schedule_note=$14, updated_at=datetime('now') WHERE id=$15`,
    [
      data.name,
      data.device_name,
      data.category,
      data.tags,
      data.notes,
      data.encryption_info,
      data.reminder_interval_days,
      data.backup_mode,
      data.schedule_frequency,
      data.schedule_time,
      data.schedule_weekday,
      data.schedule_month_day,
      data.schedule_custom_interval_days,
      data.schedule_note,
      id,
    ]
  );
}

export async function softDeleteBackup(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backups SET deleted_at=datetime('now') WHERE id=$1",
    [id]
  );
}

export async function restoreBackup(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backups SET deleted_at=NULL WHERE id=$1",
    [id]
  );
}

export async function toggleBackupPaused(id: number, paused: boolean) {
  const db = await getDb();
  await db.execute(
    "UPDATE backups SET is_paused=$1, updated_at=datetime('now') WHERE id=$2",
    [paused ? 1 : 0, id]
  );
}

export async function permanentDeleteBackup(id: number) {
  const db = await getDb();
  // CASCADE will handle backup_entries and backup_storage_locations
  await db.execute("DELETE FROM backups WHERE id=$1", [id]);
}

// --- Backup Entries ---

export async function getEntriesForBackup(backupId: number) {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    `SELECT be.*, sm.name as media_name
     FROM backup_entries be
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE be.backup_id = $1 AND be.deleted_at IS NULL
     ORDER BY be.backup_date DESC`,
    [backupId]
  );
}

export async function getLatestEntryForBackup(backupId: number) {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, any>>>(
    `SELECT be.*, sm.name as media_name
     FROM backup_entries be
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE be.backup_id = $1 AND be.deleted_at IS NULL
     ORDER BY be.backup_date DESC LIMIT 1`,
    [backupId]
  );
  return rows[0] || null;
}

export async function createEntry(data: {
  backup_id: number;
  storage_media_id: number;
  size_bytes: number;
  backup_date: string;
  notes: string | null;
}) {
  const db = await getDb();
  // Auto-assign next entry number
  const maxRows = await db.select<Array<Record<string, any>>>(
    "SELECT MAX(entry_number) as max_num FROM backup_entries WHERE backup_id=$1 AND deleted_at IS NULL",
    [data.backup_id]
  );
  const nextNum = ((maxRows[0]?.max_num as number) || 0) + 1;
  const result = await db.execute(
    `INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date, notes, entry_number)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [data.backup_id, data.storage_media_id, data.size_bytes, data.backup_date, data.notes, nextNum]
  );
  // Also ensure storage location exists
  await db.execute(
    `INSERT OR IGNORE INTO backup_storage_locations (backup_id, storage_media_id) VALUES ($1, $2)`,
    [data.backup_id, data.storage_media_id]
  );
  // Apply retention policy — mark older entries as not available
  await applyRetentionPolicy(data.backup_id, data.storage_media_id);
  return result.lastInsertId!;
}

export async function toggleEntryAvailability(id: number, available: boolean) {
  const db = await getDb();
  await db.execute("UPDATE backup_entries SET is_available=$1 WHERE id=$2", [available ? 1 : 0, id]);
}

export async function applyRetentionPolicy(backupId: number, storageMediaId: number) {
  const db = await getDb();
  const locRows = await db.select<Array<Record<string, any>>>(
    "SELECT retention_type, retention_value FROM backup_storage_locations WHERE backup_id=$1 AND storage_media_id=$2",
    [backupId, storageMediaId]
  );
  const loc = locRows[0];
  if (!loc) return;
  const retType = (loc.retention_type as string) || "all";
  const retVal = loc.retention_value as number | null;
  if (retType === "all" || !retVal || retVal <= 0) return;

  const entries = await db.select<Array<Record<string, any>>>(
    `SELECT id, backup_date FROM backup_entries
     WHERE backup_id=$1 AND storage_media_id=$2 AND deleted_at IS NULL AND is_available = 1
     ORDER BY backup_date DESC`,
    [backupId, storageMediaId]
  );

  const idsToMark: number[] = [];
  if (retType === "count") {
    for (let i = retVal; i < entries.length; i++) {
      idsToMark.push(entries[i].id as number);
    }
  } else if (retType === "days" || retType === "months") {
    const now = Date.now();
    const cutoffMs = retType === "days"
      ? retVal * 86400000
      : retVal * 30 * 86400000;
    for (const e of entries) {
      const age = now - new Date(e.backup_date as string).getTime();
      if (age > cutoffMs) idsToMark.push(e.id as number);
    }
  }

  for (const id of idsToMark) {
    await db.execute("UPDATE backup_entries SET is_available=0 WHERE id=$1", [id]);
  }
}

export async function markEntryVerified(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_entries SET verified_at=datetime('now') WHERE id=$1",
    [id]
  );
}

export async function updateEntrySize(id: number, size_bytes: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_entries SET size_bytes=$1 WHERE id=$2",
    [size_bytes, id]
  );
}

export async function updateEntry(
  id: number,
  data: {
    size_bytes: number;
    backup_date: string;
    notes: string | null;
    entry_number: number | null;
  }
) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_entries SET size_bytes=$1, backup_date=$2, notes=$3, entry_number=$4 WHERE id=$5",
    [data.size_bytes, data.backup_date, data.notes, data.entry_number, id]
  );
}

export async function softDeleteEntry(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_entries SET deleted_at=datetime('now') WHERE id=$1",
    [id]
  );
}

export async function restoreEntry(id: number) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_entries SET deleted_at=NULL WHERE id=$1",
    [id]
  );
}

export async function permanentDeleteEntry(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM backup_entries WHERE id=$1", [id]);
}

export async function getDeletedEntries() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    `SELECT be.*, b.name as backup_name, sm.name as media_name
     FROM backup_entries be
     JOIN backups b ON b.id = be.backup_id
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE be.deleted_at IS NOT NULL
     ORDER BY be.deleted_at DESC`
  );
}

// --- Storage Locations ---

export async function getLocationsForBackup(backupId: number) {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    `SELECT bsl.*, sm.name as media_name, sm.type as media_type, sm.path as media_path
     FROM backup_storage_locations bsl
     JOIN storage_media sm ON sm.id = bsl.storage_media_id
     WHERE bsl.backup_id = $1`,
    [backupId]
  );
}

export async function addStorageLocation(data: {
  backup_id: number;
  storage_media_id: number;
  path_on_media: string | null;
  auto_detect: boolean;
  scan_mode?: string;
  backup_mode?: string;
  schedule_frequency?: string | null;
  schedule_time?: string | null;
  schedule_weekday?: number | null;
  schedule_month_day?: number | null;
  schedule_custom_interval_days?: number | null;
  schedule_note?: string | null;
  reminder_interval_days?: number | null;
  retention_type?: string;
  retention_value?: number | null;
}) {
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO backup_storage_locations
     (backup_id, storage_media_id, path_on_media, auto_detect, scan_mode,
      backup_mode, schedule_frequency, schedule_time, schedule_weekday,
      schedule_month_day, schedule_custom_interval_days, schedule_note, reminder_interval_days,
      retention_type, retention_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      data.backup_id, data.storage_media_id, data.path_on_media,
      data.auto_detect ? 1 : 0, data.scan_mode || "subdirectories",
      data.backup_mode || "manual",
      data.schedule_frequency ?? null,
      data.schedule_time ?? null,
      data.schedule_weekday ?? null,
      data.schedule_month_day ?? null,
      data.schedule_custom_interval_days ?? null,
      data.schedule_note ?? null,
      data.reminder_interval_days ?? null,
      data.retention_type || "all",
      data.retention_value ?? null,
    ]
  );
}

export async function updateStorageLocation(id: number, data: {
  path_on_media: string | null;
  auto_detect: boolean;
  scan_mode?: string;
  backup_mode?: string;
  schedule_frequency?: string | null;
  schedule_time?: string | null;
  schedule_weekday?: number | null;
  schedule_month_day?: number | null;
  schedule_custom_interval_days?: number | null;
  schedule_note?: string | null;
  reminder_interval_days?: number | null;
  retention_type?: string;
  retention_value?: number | null;
}) {
  const db = await getDb();
  await db.execute(
    `UPDATE backup_storage_locations
     SET path_on_media=$1, auto_detect=$2, scan_mode=$3,
         backup_mode=$4, schedule_frequency=$5, schedule_time=$6,
         schedule_weekday=$7, schedule_month_day=$8, schedule_custom_interval_days=$9,
         schedule_note=$10, reminder_interval_days=$11,
         retention_type=$12, retention_value=$13
     WHERE id=$14`,
    [
      data.path_on_media, data.auto_detect ? 1 : 0, data.scan_mode || "subdirectories",
      data.backup_mode || "manual",
      data.schedule_frequency ?? null,
      data.schedule_time ?? null,
      data.schedule_weekday ?? null,
      data.schedule_month_day ?? null,
      data.schedule_custom_interval_days ?? null,
      data.schedule_note ?? null,
      data.reminder_interval_days ?? null,
      data.retention_type || "all",
      data.retention_value ?? null,
      id,
    ]
  );
}

export async function getWatchedLocations() {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    `SELECT bsl.*, b.name as backup_name, sm.name as media_name
     FROM backup_storage_locations bsl
     JOIN backups b ON b.id = bsl.backup_id
     JOIN storage_media sm ON sm.id = bsl.storage_media_id
     WHERE bsl.auto_detect = 1 AND b.deleted_at IS NULL`
  );
}

export async function removeStorageLocation(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM backup_storage_locations WHERE id=$1", [id]);
}

// --- Dashboard / Stats ---

// Compute status for a single storage location
function computeLocationStatus(
  location: Record<string, any>,
  backup: Record<string, any>,
  latestEntryForLocation: Record<string, any> | null
): "ok" | "warning" | "critical" {
  const mode = (location.backup_mode as string) || (backup.backup_mode as string) || "manual";
  const hasSchedule = !!(location.schedule_frequency || backup.schedule_frequency);
  const isAutomatic = mode === "automatic" && hasSchedule;
  const reminderDays = (location.reminder_interval_days as number)
    || (backup.reminder_interval_days as number) || 30;

  if (!latestEntryForLocation) {
    return isAutomatic ? "ok" : "critical";
  }
  const daysSince = Math.floor(
    (Date.now() - new Date(latestEntryForLocation.backup_date as string).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= reminderDays) return "ok";
  if (daysSince <= reminderDays * 2) return "warning";
  return "critical";
}

function worstStatus(statuses: ("ok" | "warning" | "critical")[]): "ok" | "warning" | "critical" {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "ok";
}

export async function getBackupsWithStatus() {
  const db = await getDb();
  const backups = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );

  const result = [];
  for (const backup of backups) {
    const latest = await getLatestEntryForBackup(backup.id as number);
    const locations = await getLocationsForBackup(backup.id as number);

    let status: "ok" | "warning" | "critical" | "paused";
    if (backup.is_paused) {
      status = "paused";
    } else if (locations.length === 0) {
      // No locations: fall back to backup-level mode/schedule
      const isAutomatic = backup.backup_mode === "automatic" && backup.schedule_frequency;
      status = isAutomatic ? "ok" : "critical";
      if (latest) {
        const daysSince = Math.floor(
          (Date.now() - new Date(latest.backup_date as string).getTime()) / (1000 * 60 * 60 * 24)
        );
        const reminderDays = (backup.reminder_interval_days as number) || 30;
        if (daysSince <= reminderDays) status = "ok";
        else if (daysSince <= reminderDays * 2) status = "warning";
        else status = "critical";
      }
    } else {
      // Calculate status per location and take the worst
      const locationStatuses: ("ok" | "warning" | "critical")[] = [];
      for (const loc of locations) {
        // Find latest entry for this specific location
        const locEntries = await db.select<Array<Record<string, any>>>(
          `SELECT * FROM backup_entries
           WHERE backup_id = $1 AND storage_media_id = $2 AND deleted_at IS NULL
           ORDER BY backup_date DESC LIMIT 1`,
          [backup.id, loc.storage_media_id]
        );
        const latestForLoc = locEntries[0] || null;
        locationStatuses.push(computeLocationStatus(loc, backup, latestForLoc));
      }
      status = worstStatus(locationStatuses);
    }

    result.push({
      ...backup,
      status,
      latest_entry: latest,
      storage_locations: locations,
      total_media_count: locations.length,
    });
  }

  return result;
}

export async function getAllEntries(limit?: number) {
  const db = await getDb();
  if (limit !== undefined) {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 10000));
    return db.select<Array<Record<string, any>>>(
      `SELECT be.*, b.name as backup_name, sm.name as media_name
       FROM backup_entries be
       JOIN backups b ON b.id = be.backup_id
       JOIN storage_media sm ON sm.id = be.storage_media_id
       WHERE b.deleted_at IS NULL AND be.deleted_at IS NULL
       ORDER BY be.backup_date DESC LIMIT $1`,
      [safeLimit]
    );
  }
  return db.select<Array<Record<string, any>>>(
    `SELECT be.*, b.name as backup_name, sm.name as media_name
     FROM backup_entries be
     JOIN backups b ON b.id = be.backup_id
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE b.deleted_at IS NULL AND be.deleted_at IS NULL
     ORDER BY be.backup_date DESC`
  );
}

export async function getEntriesInRange(startDate: string, endDate: string) {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    `SELECT be.*, b.name as backup_name, sm.name as media_name
     FROM backup_entries be
     JOIN backups b ON b.id = be.backup_id
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE b.deleted_at IS NULL AND be.deleted_at IS NULL AND be.backup_date >= $1 AND be.backup_date <= $2
     ORDER BY be.backup_date DESC`,
    [startDate, endDate]
  );
}

// --- Reorder ---

export async function reorderBackups(ids: number[]) {
  const db = await getDb();
  for (let i = 0; i < ids.length; i++) {
    await db.execute("UPDATE backups SET sort_order=$1 WHERE id=$2", [i, ids[i]]);
  }
}

export async function reorderDevices(ids: number[]) {
  const db = await getDb();
  for (let i = 0; i < ids.length; i++) {
    await db.execute("UPDATE devices SET sort_order=$1 WHERE id=$2", [i, ids[i]]);
  }
}

// --- Folders ---

export async function getFolders(entityType: string) {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM folders WHERE entity_type=$1 AND deleted_at IS NULL ORDER BY sort_order, name",
    [entityType]
  );
}

export async function createFolder(name: string, entityType: string, parentId?: number | null) {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO folders (name, entity_type, parent_id) VALUES ($1, $2, $3)",
    [name, entityType, parentId ?? null]
  );
  return result.lastInsertId!;
}

export async function updateFolder(id: number, name: string) {
  const db = await getDb();
  await db.execute("UPDATE folders SET name=$1 WHERE id=$2", [name, id]);
}

export async function softDeleteFolder(id: number) {
  const db = await getDb();
  await db.execute("UPDATE folders SET deleted_at=datetime('now') WHERE id=$1", [id]);
  // Also soft-delete child folders
  await db.execute("UPDATE folders SET deleted_at=datetime('now') WHERE parent_id=$1 AND deleted_at IS NULL", [id]);
}

export async function restoreFolder(id: number) {
  const db = await getDb();
  await db.execute("UPDATE folders SET deleted_at=NULL WHERE id=$1", [id]);
  // Also restore child folders
  await db.execute("UPDATE folders SET deleted_at=NULL WHERE parent_id=$1", [id]);
}

export async function permanentDeleteFolder(id: number) {
  const db = await getDb();
  // Move items to unfiled before deleting
  await db.execute("UPDATE backups SET folder_id=NULL WHERE folder_id=$1", [id]);
  await db.execute("UPDATE storage_media SET folder_id=NULL WHERE folder_id=$1", [id]);
  await db.execute("UPDATE devices SET folder_id=NULL WHERE folder_id=$1", [id]);
  // Move child folder items to unfiled and delete child folders
  const children = await db.select<Array<Record<string, any>>>("SELECT id FROM folders WHERE parent_id=$1", [id]);
  for (const child of children) {
    await permanentDeleteFolder(child.id as number);
  }
  await db.execute("DELETE FROM folders WHERE id=$1", [id]);
}

export async function getDeletedFolders(entityType: string) {
  const db = await getDb();
  return db.select<Array<Record<string, any>>>(
    "SELECT * FROM folders WHERE entity_type=$1 AND deleted_at IS NOT NULL ORDER BY name",
    [entityType]
  );
}

export async function moveFolderToParent(folderId: number, parentId: number | null) {
  const db = await getDb();
  await db.execute("UPDATE folders SET parent_id=$1 WHERE id=$2", [parentId, folderId]);
}

export async function updateFolderCollapsed(id: number, collapsed: boolean) {
  const db = await getDb();
  await db.execute("UPDATE folders SET collapsed=$1 WHERE id=$2", [collapsed ? 1 : 0, id]);
}

export async function moveItemToFolder(entityType: string, itemId: number, folderId: number | null) {
  const db = await getDb();
  const table = entityType === "backup" ? "backups" : entityType === "media" ? "storage_media" : "devices";
  await db.execute(`UPDATE ${table} SET folder_id=$1 WHERE id=$2`, [folderId, itemId]);
}

export async function moveItemsToFolder(entityType: string, itemIds: number[], folderId: number | null) {
  const db = await getDb();
  const table = entityType === "backup" ? "backups" : entityType === "media" ? "storage_media" : "devices";
  for (const id of itemIds) {
    await db.execute(`UPDATE ${table} SET folder_id=$1 WHERE id=$2`, [folderId, id]);
  }
}

export async function reorderFolders(ids: number[]) {
  const db = await getDb();
  for (let i = 0; i < ids.length; i++) {
    await db.execute("UPDATE folders SET sort_order=$1 WHERE id=$2", [i, ids[i]]);
  }
}

// --- Export ---

export async function exportAllData() {
  const db = await getDb();
  const backups = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );
  const media = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM storage_media WHERE deleted_at IS NULL ORDER BY name"
  );
  const devices = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );
  const entries = await db.select<Array<Record<string, any>>>(
    `SELECT be.*, b.name as backup_name, b.device_name, b.category, sm.name as media_name
     FROM backup_entries be
     JOIN backups b ON b.id = be.backup_id
     JOIN storage_media sm ON sm.id = be.storage_media_id
     WHERE be.deleted_at IS NULL AND b.deleted_at IS NULL
     ORDER BY b.name, be.backup_date`
  );
  const locations = await db.select<Array<Record<string, any>>>(
    `SELECT bsl.*, b.name as backup_name, sm.name as media_name
     FROM backup_storage_locations bsl
     JOIN backups b ON b.id = bsl.backup_id
     JOIN storage_media sm ON sm.id = bsl.storage_media_id
     WHERE b.deleted_at IS NULL`
  );
  const folders = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY entity_type, sort_order, name"
  );
  return { backups, media, devices, entries, locations, folders };
}

// --- Import ---

export async function importData(data: {
  backups?: Array<Record<string, any>>;
  media?: Array<Record<string, any>>;
  devices?: Array<Record<string, any>>;
  entries?: Array<Record<string, any>>;
  locations?: Array<Record<string, any>>;
  folders?: Array<Record<string, any>>;
}): Promise<{ imported: number; skipped: number }> {
  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  // Maps old IDs to new IDs
  const mediaIdMap = new Map<number, number>();
  const backupIdMap = new Map<number, number>();
  const folderIdMap = new Map<number, number>();

  // 0. Import folders
  if (data.folders) {
    for (const f of data.folders) {
      const existing = await db.select<Array<Record<string, any>>>(
        "SELECT id FROM folders WHERE name=$1 AND entity_type=$2 AND deleted_at IS NULL",
        [f.name, f.entity_type]
      );
      if (existing.length > 0) {
        folderIdMap.set(f.id as number, existing[0].id as number);
        skipped++;
      } else {
        const result = await db.execute(
          "INSERT INTO folders (name, entity_type, sort_order) VALUES ($1, $2, $3)",
          [f.name, f.entity_type, f.sort_order || 0]
        );
        folderIdMap.set(f.id as number, result.lastInsertId!);
        imported++;
      }
    }
  }

  // 1. Import storage media
  if (data.media) {
    const existing = await db.select<Array<Record<string, any>>>("SELECT name FROM storage_media WHERE deleted_at IS NULL");
    const existingNames = new Set(existing.map((m) => m.name as string));

    for (const m of data.media) {
      if (existingNames.has(m.name as string)) {
        const rows = await db.select<Array<Record<string, any>>>("SELECT id FROM storage_media WHERE name=$1 AND deleted_at IS NULL", [m.name]);
        if (rows[0]) mediaIdMap.set(m.id as number, rows[0].id as number);
        skipped++;
        continue;
      }
      const result = await db.execute(
        "INSERT INTO storage_media (name, type, total_capacity_gb, path, notes, is_encrypted, encryption_type, encryption_label) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [m.name, m.type || "other", m.total_capacity_gb, m.path, m.notes, m.is_encrypted ? 1 : 0, m.encryption_type, m.encryption_label]
      );
      mediaIdMap.set(m.id as number, result.lastInsertId!);
      imported++;
    }
  }

  // 2. Import devices
  if (data.devices) {
    const existing = await db.select<Array<Record<string, any>>>("SELECT name FROM devices WHERE deleted_at IS NULL");
    const existingNames = new Set(existing.map((d) => d.name as string));

    for (const d of data.devices) {
      if (existingNames.has(d.name as string)) {
        skipped++;
        continue;
      }
      await db.execute(
        "INSERT INTO devices (name, type, os, model, serial_number, notes) VALUES ($1, $2, $3, $4, $5, $6)",
        [d.name, d.type || "other", d.os, d.model, d.serial_number, d.notes]
      );
      imported++;
    }
  }

  // 3. Import backups
  if (data.backups) {
    const existing = await db.select<Array<Record<string, any>>>("SELECT name, device_name FROM backups WHERE deleted_at IS NULL");
    const existingKeys = new Set(existing.map((b) => `${b.name}|${b.device_name}`));

    for (const b of data.backups) {
      const key = `${b.name}|${b.device_name}`;
      if (existingKeys.has(key)) {
        const rows = await db.select<Array<Record<string, any>>>("SELECT id FROM backups WHERE name=$1 AND device_name=$2 AND deleted_at IS NULL", [b.name, b.device_name]);
        if (rows[0]) backupIdMap.set(b.id as number, rows[0].id as number);
        skipped++;
        continue;
      }
      const result = await db.execute(
        "INSERT INTO backups (name, device_name, category, tags, notes, encryption_info, reminder_interval_days) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [b.name, b.device_name || "", b.category || "other", b.tags, b.notes, b.encryption_info, b.reminder_interval_days || 30]
      );
      backupIdMap.set(b.id as number, result.lastInsertId!);
      imported++;
    }
  }

  // 4. Import storage locations
  if (data.locations) {
    for (const loc of data.locations) {
      const newBackupId = backupIdMap.get(loc.backup_id as number);
      const newMediaId = mediaIdMap.get(loc.storage_media_id as number);
      if (!newBackupId || !newMediaId) { skipped++; continue; }
      try {
        await db.execute(
          "INSERT OR IGNORE INTO backup_storage_locations (backup_id, storage_media_id, path_on_media, auto_detect, scan_mode) VALUES ($1, $2, $3, $4, $5)",
          [newBackupId, newMediaId, loc.path_on_media, loc.auto_detect ? 1 : 0, loc.scan_mode || "subdirectories"]
        );
        imported++;
      } catch { skipped++; }
    }
  }

  // 5. Import entries
  if (data.entries) {
    for (const e of data.entries) {
      const newBackupId = backupIdMap.get(e.backup_id as number);
      const newMediaId = mediaIdMap.get(e.storage_media_id as number);
      if (!newBackupId || !newMediaId) { skipped++; continue; }
      await db.execute(
        "INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date, notes, entry_number) VALUES ($1, $2, $3, $4, $5, $6)",
        [newBackupId, newMediaId, e.size_bytes || 0, e.backup_date, e.notes, e.entry_number]
      );
      imported++;
    }
  }

  return { imported, skipped };
}

export async function getMatrixData() {
  const db = await getDb();
  const backups = await db.select<Array<Record<string, any>>>(
    "SELECT id, name, device_name, category FROM backups WHERE deleted_at IS NULL ORDER BY device_name, name"
  );
  const media = await db.select<Array<Record<string, any>>>(
    "SELECT id, name FROM storage_media WHERE deleted_at IS NULL ORDER BY name"
  );
  const locations = await db.select<Array<Record<string, any>>>(
    `SELECT bsl.backup_id, bsl.storage_media_id, bsl.path_on_media,
       (SELECT MAX(be.backup_date) FROM backup_entries be WHERE be.backup_id = bsl.backup_id AND be.storage_media_id = bsl.storage_media_id AND be.deleted_at IS NULL) as last_date,
       (SELECT be.size_bytes FROM backup_entries be WHERE be.backup_id = bsl.backup_id AND be.storage_media_id = bsl.storage_media_id AND be.deleted_at IS NULL ORDER BY be.backup_date DESC LIMIT 1) as last_size
     FROM backup_storage_locations bsl
     JOIN backups b ON b.id = bsl.backup_id
     WHERE b.deleted_at IS NULL`
  );
  return { backups, media, locations };
}
