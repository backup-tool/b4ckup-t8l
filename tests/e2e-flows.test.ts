import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";

/**
 * E2E-style tests that simulate the complete user flows
 * using real SQLite queries (same as the app uses).
 */

function setupDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");

  // Create all tables (same as app)
  db.exec(`CREATE TABLE storage_media (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other', total_capacity_gb REAL, path TEXT, notes TEXT, deleted_at TEXT DEFAULT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), is_encrypted INTEGER DEFAULT 0, encryption_type TEXT, encryption_label TEXT)`);
  db.exec(`CREATE TABLE devices (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, type TEXT DEFAULT 'other', os TEXT, model TEXT, serial_number TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT DEFAULT NULL, sort_order INTEGER DEFAULT 0)`);
  db.exec(`CREATE TABLE backups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, device_name TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'other', tags TEXT, notes TEXT, encryption_info TEXT, reminder_interval_days INTEGER DEFAULT 30, watch_path TEXT, auto_detect INTEGER NOT NULL DEFAULT 0, deleted_at TEXT DEFAULT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), sort_order INTEGER DEFAULT 0, is_paused INTEGER DEFAULT 0)`);
  db.exec(`CREATE TABLE backup_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, backup_id INTEGER NOT NULL, storage_media_id INTEGER NOT NULL, size_bytes INTEGER NOT NULL DEFAULT 0, backup_date TEXT NOT NULL DEFAULT (datetime('now')), verified_at TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT DEFAULT NULL, entry_number INTEGER DEFAULT NULL, FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE, FOREIGN KEY (storage_media_id) REFERENCES storage_media(id) ON DELETE CASCADE)`);
  db.exec(`CREATE TABLE backup_storage_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, backup_id INTEGER NOT NULL, storage_media_id INTEGER NOT NULL, path_on_media TEXT, auto_detect INTEGER NOT NULL DEFAULT 0, scan_mode TEXT DEFAULT 'subdirectories', FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE, FOREIGN KEY (storage_media_id) REFERENCES storage_media(id) ON DELETE CASCADE, UNIQUE(backup_id, storage_media_id))`);

  return db;
}

describe("Flow: Create backup and log entries", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  it("should complete the full backup creation flow", () => {
    // 1. Create a device
    db.exec("INSERT INTO devices (name, type, os) VALUES ('iPhone 14', 'phone', 'iOS 17')");

    // 2. Create a storage medium
    db.exec("INSERT INTO storage_media (name, type, total_capacity_gb, path) VALUES ('Synology NAS', 'nas', 4000, '/Volumes/NAS')");

    // 3. Create a backup
    db.exec("INSERT INTO backups (name, device_name, category, reminder_interval_days) VALUES ('iPhone Photos', 'iPhone 14', 'photos', 30)");

    // 4. Add storage location
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id, path_on_media) VALUES (1, 1, '/Backups/iPhone/Photos')");

    // 5. Log backup entries
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date, entry_number) VALUES (1, 1, 32212254720, '2025-01-15', 1)");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date, entry_number) VALUES (1, 1, 35433480192, '2025-02-15', 2)");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date, entry_number) VALUES (1, 1, 38654705664, '2025-03-15', 3)");

    // Verify: backup exists with correct data
    const backup = db.prepare("SELECT * FROM backups WHERE id = 1").get() as any;
    expect(backup.name).toBe("iPhone Photos");
    expect(backup.device_name).toBe("iPhone 14");
    expect(backup.category).toBe("photos");

    // Verify: 3 entries exist
    const entries = db.prepare("SELECT * FROM backup_entries WHERE backup_id = 1 ORDER BY backup_date").all();
    expect(entries).toHaveLength(3);

    // Verify: latest entry is largest
    const latest = db.prepare("SELECT * FROM backup_entries WHERE backup_id = 1 ORDER BY backup_date DESC LIMIT 1").get() as any;
    expect(latest.size_bytes).toBe(38654705664); // ~36 GB
    expect(latest.entry_number).toBe(3);

    // Verify: storage location linked
    const locs = db.prepare("SELECT * FROM backup_storage_locations WHERE backup_id = 1").all();
    expect(locs).toHaveLength(1);
  });
});

describe("Flow: Backup status calculation", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
  });

  it("should calculate OK status for recent backup", () => {
    db.exec("INSERT INTO backups (name, reminder_interval_days) VALUES ('Recent', 30)");
    db.exec(`INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, 1000, date('now', '-5 days'))`);

    const entry = db.prepare(`
      SELECT be.backup_date, b.reminder_interval_days
      FROM backup_entries be JOIN backups b ON b.id = be.backup_id
      WHERE be.backup_id = 1 ORDER BY be.backup_date DESC LIMIT 1
    `).get() as any;

    const daysSince = Math.floor((Date.now() - new Date(entry.backup_date).getTime()) / (86400000));
    const status = daysSince <= entry.reminder_interval_days ? "ok" : daysSince <= entry.reminder_interval_days * 2 ? "warning" : "critical";
    expect(status).toBe("ok");
  });

  it("should calculate CRITICAL status for very old backup", () => {
    db.exec("INSERT INTO backups (name, reminder_interval_days) VALUES ('Old', 30)");
    db.exec(`INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, 1000, date('now', '-90 days'))`);

    const entry = db.prepare(`
      SELECT be.backup_date, b.reminder_interval_days
      FROM backup_entries be JOIN backups b ON b.id = be.backup_id
      WHERE be.backup_id = 1 ORDER BY be.backup_date DESC LIMIT 1
    `).get() as any;

    const daysSince = Math.floor((Date.now() - new Date(entry.backup_date).getTime()) / (86400000));
    const status = daysSince <= entry.reminder_interval_days ? "ok" : daysSince <= entry.reminder_interval_days * 2 ? "warning" : "critical";
    expect(status).toBe("critical");
  });

  it("should return PAUSED status for paused backups", () => {
    db.exec("INSERT INTO backups (name, is_paused) VALUES ('Paused', 1)");
    const backup = db.prepare("SELECT is_paused FROM backups WHERE id = 1").get() as any;
    expect(backup.is_paused).toBe(1);
  });
});

describe("Flow: Soft delete and trash", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
    db.exec("INSERT INTO storage_media (name) VALUES ('NAS')");
    db.exec("INSERT INTO backups (name) VALUES ('Test')");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes) VALUES (1, 1, 1000)");
  });

  it("should soft-delete backup without removing data", () => {
    db.exec("UPDATE backups SET deleted_at = datetime('now') WHERE id = 1");

    // Backup still exists in DB
    const all = db.prepare("SELECT * FROM backups").all();
    expect(all).toHaveLength(1);

    // But filtered out when querying active
    const active = db.prepare("SELECT * FROM backups WHERE deleted_at IS NULL").all();
    expect(active).toHaveLength(0);

    // Entries still exist
    const entries = db.prepare("SELECT * FROM backup_entries WHERE backup_id = 1").all();
    expect(entries).toHaveLength(1);
  });

  it("should restore soft-deleted backup", () => {
    db.exec("UPDATE backups SET deleted_at = datetime('now') WHERE id = 1");
    db.exec("UPDATE backups SET deleted_at = NULL WHERE id = 1");

    const active = db.prepare("SELECT * FROM backups WHERE deleted_at IS NULL").all();
    expect(active).toHaveLength(1);
  });

  it("should permanently delete with cascade", () => {
    db.exec("DELETE FROM backups WHERE id = 1");

    const backups = db.prepare("SELECT * FROM backups").all();
    expect(backups).toHaveLength(0);

    const entries = db.prepare("SELECT * FROM backup_entries").all();
    expect(entries).toHaveLength(0);
  });
});

describe("Flow: Data export and import", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  it("should export and re-import data correctly", () => {
    // Create test data
    db.exec("INSERT INTO storage_media (name, type) VALUES ('NAS', 'nas')");
    db.exec("INSERT INTO devices (name, type) VALUES ('iPhone', 'phone')");
    db.exec("INSERT INTO backups (name, device_name, category) VALUES ('Photos', 'iPhone', 'photos')");
    db.exec("INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, 5000000000, '2025-06-01')");

    // Export
    const media = db.prepare("SELECT * FROM storage_media WHERE deleted_at IS NULL").all();
    const devices = db.prepare("SELECT * FROM devices WHERE deleted_at IS NULL").all();
    const backups = db.prepare("SELECT * FROM backups WHERE deleted_at IS NULL").all();
    const entries = db.prepare("SELECT * FROM backup_entries WHERE deleted_at IS NULL").all();

    // Create fresh DB and import
    const db2 = setupDb();

    // Import media
    for (const m of media as any[]) {
      db2.exec(`INSERT INTO storage_media (name, type) VALUES ('${m.name}', '${m.type}')`);
    }
    // Import devices
    for (const d of devices as any[]) {
      db2.exec(`INSERT INTO devices (name, type) VALUES ('${d.name}', '${d.type}')`);
    }
    // Import backups
    for (const b of backups as any[]) {
      db2.exec(`INSERT INTO backups (name, device_name, category) VALUES ('${b.name}', '${b.device_name}', '${b.category}')`);
    }
    // Import entries
    for (const e of entries as any[]) {
      db2.exec(`INSERT INTO backup_entries (backup_id, storage_media_id, size_bytes, backup_date) VALUES (1, 1, ${e.size_bytes}, '${e.backup_date}')`);
    }

    // Verify import
    const importedMedia = db2.prepare("SELECT COUNT(*) as c FROM storage_media").get() as any;
    expect(importedMedia.c).toBe(1);

    const importedEntries = db2.prepare("SELECT * FROM backup_entries").all() as any[];
    expect(importedEntries).toHaveLength(1);
    expect(importedEntries[0].size_bytes).toBe(5000000000);
  });
});

describe("Flow: 3-2-1 Rule validation", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupDb();
  });

  it("should pass 3-2-1 rule with proper setup", () => {
    // 3 storage media of 2 different types, 1 offsite (cloud)
    db.exec("INSERT INTO storage_media (name, type) VALUES ('NAS', 'nas')");
    db.exec("INSERT INTO storage_media (name, type) VALUES ('External HDD', 'external_drive')");
    db.exec("INSERT INTO storage_media (name, type) VALUES ('iCloud', 'cloud')");

    db.exec("INSERT INTO backups (name) VALUES ('Important Data')");

    // Link all 3 to the backup
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 1)");
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 2)");
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 3)");

    const locs = db.prepare(`
      SELECT sm.type FROM backup_storage_locations bsl
      JOIN storage_media sm ON sm.id = bsl.storage_media_id
      WHERE bsl.backup_id = 1
    `).all() as any[];

    const copies = locs.length;
    const mediaTypes = new Set(locs.map(l => l.type)).size;
    const hasOffsite = locs.some(l => l.type === "cloud" || l.type === "nas");

    expect(copies).toBeGreaterThanOrEqual(3);
    expect(mediaTypes).toBeGreaterThanOrEqual(2);
    expect(hasOffsite).toBe(true);
  });

  it("should fail 3-2-1 rule with single medium", () => {
    db.exec("INSERT INTO storage_media (name, type) VALUES ('USB', 'usb_stick')");
    db.exec("INSERT INTO backups (name) VALUES ('Data')");
    db.exec("INSERT INTO backup_storage_locations (backup_id, storage_media_id) VALUES (1, 1)");

    const locs = db.prepare(`
      SELECT sm.type FROM backup_storage_locations bsl
      JOIN storage_media sm ON sm.id = bsl.storage_media_id
      WHERE bsl.backup_id = 1
    `).all() as any[];

    const copies = locs.length;
    const mediaTypes = new Set(locs.map(l => l.type)).size;
    const passes = copies >= 3 && mediaTypes >= 2;

    expect(passes).toBe(false);
  });
});
