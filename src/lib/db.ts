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
  return result.lastInsertId;
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
}) {
  const db = await getDb();
  await db.execute(
    "UPDATE devices SET name=$1, type=$2, os=$3, model=$4, serial_number=$5, notes=$6 WHERE id=$7",
    [data.name, data.type, data.os, data.model, data.serial_number, data.notes, id]
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
}) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO backups (name, device_name, category, tags, notes, encryption_info, reminder_interval_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.name,
      data.device_name,
      data.category,
      data.tags,
      data.notes,
      data.encryption_info,
      data.reminder_interval_days,
    ]
  );
  return result.lastInsertId;
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
  }
) {
  const db = await getDb();
  await db.execute(
    `UPDATE backups SET name=$1, device_name=$2, category=$3, tags=$4, notes=$5, encryption_info=$6,
     reminder_interval_days=$7, updated_at=datetime('now') WHERE id=$8`,
    [
      data.name,
      data.device_name,
      data.category,
      data.tags,
      data.notes,
      data.encryption_info,
      data.reminder_interval_days,
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
  return result.lastInsertId;
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
}) {
  const db = await getDb();
  await db.execute(
    `INSERT OR IGNORE INTO backup_storage_locations (backup_id, storage_media_id, path_on_media, auto_detect, scan_mode)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.backup_id, data.storage_media_id, data.path_on_media, data.auto_detect ? 1 : 0, data.scan_mode || "subdirectories"]
  );
}

export async function updateStorageLocation(id: number, data: {
  path_on_media: string | null;
  auto_detect: boolean;
  scan_mode?: string;
}) {
  const db = await getDb();
  await db.execute(
    "UPDATE backup_storage_locations SET path_on_media=$1, auto_detect=$2, scan_mode=$3 WHERE id=$4",
    [data.path_on_media, data.auto_detect ? 1 : 0, data.scan_mode || "subdirectories", id]
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

export async function getBackupsWithStatus() {
  const db = await getDb();
  const backups = await db.select<Array<Record<string, any>>>(
    "SELECT * FROM backups WHERE deleted_at IS NULL ORDER BY sort_order, name"
  );

  const result = [];
  for (const backup of backups) {
    const latest = await getLatestEntryForBackup(backup.id as number);
    const locations = await getLocationsForBackup(backup.id as number);

    let status: "ok" | "warning" | "critical" = "critical";
    if (latest) {
      const daysSince = Math.floor(
        (Date.now() - new Date(latest.backup_date as string).getTime()) / (1000 * 60 * 60 * 24)
      );
      const reminderDays = (backup.reminder_interval_days as number) || 30;
      if (daysSince <= reminderDays) {
        status = "ok";
      } else if (daysSince <= reminderDays * 2) {
        status = "warning";
      }
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
  return { backups, media, devices, entries, locations };
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
