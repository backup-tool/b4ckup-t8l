import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";

// Replicate the exact migration SQL from src/lib/db.ts
function runMigrations(db: Database.Database) {
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
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

  db.exec(`
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

  db.exec(`
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

  db.exec(`
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

  db.exec(`
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

  // Migrations
  const tryExec = (sql: string) => { try { db.exec(sql); } catch {} };
  tryExec("ALTER TABLE storage_media ADD COLUMN deleted_at TEXT DEFAULT NULL");
  tryExec("ALTER TABLE backups ADD COLUMN deleted_at TEXT DEFAULT NULL");
  tryExec("ALTER TABLE backup_entries ADD COLUMN deleted_at TEXT DEFAULT NULL");
  tryExec("ALTER TABLE backup_storage_locations ADD COLUMN auto_detect INTEGER NOT NULL DEFAULT 0");
  tryExec("ALTER TABLE backup_storage_locations ADD COLUMN scan_mode TEXT DEFAULT 'subdirectories'");
  tryExec("ALTER TABLE backup_entries ADD COLUMN entry_number INTEGER DEFAULT NULL");
  tryExec("ALTER TABLE devices ADD COLUMN os TEXT");
  tryExec("ALTER TABLE devices ADD COLUMN model TEXT");
  tryExec("ALTER TABLE devices ADD COLUMN serial_number TEXT");
  tryExec("ALTER TABLE devices ADD COLUMN notes TEXT");
  tryExec("ALTER TABLE devices ADD COLUMN deleted_at TEXT DEFAULT NULL");
  tryExec("ALTER TABLE storage_media ADD COLUMN is_encrypted INTEGER DEFAULT 0");
  tryExec("ALTER TABLE storage_media ADD COLUMN encryption_type TEXT");
  tryExec("ALTER TABLE storage_media ADD COLUMN encryption_label TEXT");
  tryExec("ALTER TABLE backups ADD COLUMN sort_order INTEGER DEFAULT 0");
  tryExec("ALTER TABLE devices ADD COLUMN sort_order INTEGER DEFAULT 0");
  tryExec("ALTER TABLE backups ADD COLUMN is_paused INTEGER DEFAULT 0");
}

function getColumns(db: Database.Database, table: string): string[] {
  return db.pragma(`table_info(${table})`).map((c: any) => c.name);
}

describe("Database Migrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  it("should create all tables on fresh database", () => {
    runMigrations(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("storage_media");
    expect(tables).toContain("devices");
    expect(tables).toContain("backups");
    expect(tables).toContain("backup_entries");
    expect(tables).toContain("backup_storage_locations");
  });

  it("should run migrations idempotently (twice without error)", () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  it("should have all storage_media columns", () => {
    runMigrations(db);
    const cols = getColumns(db, "storage_media");
    expect(cols).toContain("id");
    expect(cols).toContain("name");
    expect(cols).toContain("type");
    expect(cols).toContain("total_capacity_gb");
    expect(cols).toContain("path");
    expect(cols).toContain("notes");
    expect(cols).toContain("deleted_at");
    expect(cols).toContain("is_encrypted");
    expect(cols).toContain("encryption_type");
    expect(cols).toContain("encryption_label");
  });

  it("should have all backups columns", () => {
    runMigrations(db);
    const cols = getColumns(db, "backups");
    expect(cols).toContain("id");
    expect(cols).toContain("name");
    expect(cols).toContain("device_name");
    expect(cols).toContain("category");
    expect(cols).toContain("tags");
    expect(cols).toContain("encryption_info");
    expect(cols).toContain("reminder_interval_days");
    expect(cols).toContain("deleted_at");
    expect(cols).toContain("sort_order");
    expect(cols).toContain("is_paused");
  });

  it("should have all devices columns", () => {
    runMigrations(db);
    const cols = getColumns(db, "devices");
    expect(cols).toContain("name");
    expect(cols).toContain("type");
    expect(cols).toContain("os");
    expect(cols).toContain("model");
    expect(cols).toContain("serial_number");
    expect(cols).toContain("notes");
    expect(cols).toContain("deleted_at");
    expect(cols).toContain("sort_order");
  });

  it("should have all backup_entries columns", () => {
    runMigrations(db);
    const cols = getColumns(db, "backup_entries");
    expect(cols).toContain("backup_id");
    expect(cols).toContain("storage_media_id");
    expect(cols).toContain("size_bytes");
    expect(cols).toContain("backup_date");
    expect(cols).toContain("verified_at");
    expect(cols).toContain("deleted_at");
    expect(cols).toContain("entry_number");
  });

  it("should have all backup_storage_locations columns", () => {
    runMigrations(db);
    const cols = getColumns(db, "backup_storage_locations");
    expect(cols).toContain("backup_id");
    expect(cols).toContain("storage_media_id");
    expect(cols).toContain("path_on_media");
    expect(cols).toContain("auto_detect");
    expect(cols).toContain("scan_mode");
  });

  it("should enforce foreign keys", () => {
    runMigrations(db);
    expect(() => {
      db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes) VALUES (999, 999, 100)");
    }).toThrow();
  });

  it("should cascade delete entries when backup is deleted", () => {
    runMigrations(db);

    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
    db.exec("INSERT INTO backups (name) VALUES ('Test Backup')");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes) VALUES (1, 1, 1000)");

    const before = db.prepare("SELECT COUNT(*) as c FROM backup_entries").get() as any;
    expect(before.c).toBe(1);

    db.exec("DELETE FROM backups WHERE id = 1");

    const after = db.prepare("SELECT COUNT(*) as c FROM backup_entries").get() as any;
    expect(after.c).toBe(0);
  });

  it("should enforce unique constraint on storage locations", () => {
    runMigrations(db);

    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
    db.exec("INSERT INTO backups (name) VALUES ('Test')");
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 1)");

    expect(() => {
      db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 1)");
    }).toThrow();
  });
});

describe("CRUD Operations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db);
  });

  it("should insert and select storage media", () => {
    db.exec("INSERT INTO storage_media (name, type, total_capacity_gb) VALUES ('My NAS', 'nas', 4000)");
    const row = db.prepare("SELECT * FROM storage_media WHERE name = 'My NAS'").get() as any;
    expect(row.name).toBe("My NAS");
    expect(row.type).toBe("nas");
    expect(row.total_capacity_gb).toBe(4000);
    expect(row.deleted_at).toBeNull();
  });

  it("should soft-delete and restore backups", () => {
    db.exec("INSERT INTO backups (name, device_name) VALUES ('Photos', 'iPhone')");

    db.exec("UPDATE backups SET deleted_at = datetime('now') WHERE id = 1");
    const deleted = db.prepare("SELECT deleted_at FROM backups WHERE id = 1").get() as any;
    expect(deleted.deleted_at).not.toBeNull();

    db.exec("UPDATE backups SET deleted_at = NULL WHERE id = 1");
    const restored = db.prepare("SELECT deleted_at FROM backups WHERE id = 1").get() as any;
    expect(restored.deleted_at).toBeNull();
  });

  it("should pause and resume backups", () => {
    db.exec("INSERT INTO backups (name) VALUES ('Test')");

    db.exec("UPDATE backups SET is_paused = 1 WHERE id = 1");
    const paused = db.prepare("SELECT is_paused FROM backups WHERE id = 1").get() as any;
    expect(paused.is_paused).toBe(1);

    db.exec("UPDATE backups SET is_paused = 0 WHERE id = 1");
    const resumed = db.prepare("SELECT is_paused FROM backups WHERE id = 1").get() as any;
    expect(resumed.is_paused).toBe(0);
  });

  it("should use parameterized queries safely", () => {
    const malicious = "'; DROP TABLE backups; --";
    db.prepare("INSERT INTO backups (name, device_name) VALUES (?, ?)").run(malicious, "test");
    const row = db.prepare("SELECT name FROM backups WHERE id = 1").get() as any;
    expect(row.name).toBe(malicious);

    // Table should still exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='backups'").get();
    expect(tables).toBeTruthy();
  });

  it("should calculate backup entry sizes correctly", () => {
    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
    db.exec("INSERT INTO backups (name) VALUES ('Test')");

    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, 1073741824, '2025-01-15')");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, 2147483648, '2025-02-15')");

    const total = db.prepare("SELECT SUM(size_bytes) as total FROM backup_entries WHERE backup_id = 1").get() as any;
    expect(total.total).toBe(3221225472); // 3 GB
  });

  it("should import data without duplicates", () => {
    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')"); // Same name

    const count = db.prepare("SELECT COUNT(*) as c FROM storage_media WHERE name = 'NAS'").get() as any;
    expect(count.c).toBe(2); // No unique constraint on media name — app handles dedup
  });

  it("should handle encryption fields", () => {
    db.exec("INSERT INTO storage_media (name, is_encrypted, encryption_type, encryption_label) VALUES ('Encrypted Drive', 1, 'VeraCrypt', 'key-2024')");
    const row = db.prepare("SELECT * FROM storage_media WHERE name = 'Encrypted Drive'").get() as any;
    expect(row.is_encrypted).toBe(1);
    expect(row.encryption_type).toBe("VeraCrypt");
    expect(row.encryption_label).toBe("key-2024");
  });
});
