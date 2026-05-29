import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export type ExportFormat = "rgb_pdf" | "png" | "cmyk_pdf";

export type StatRow = {
  format: ExportFormat;
  count: number;
  last_exported_at: string | null;
};

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "stats.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS export_stats (
      format TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      last_exported_at TEXT
    );
    INSERT OR IGNORE INTO export_stats (format, count) VALUES
      ('rgb_pdf', 0),
      ('png', 0),
      ('cmyk_pdf', 0);
  `);
  return _db;
}

export function recordExport(format: ExportFormat): void {
  const db = getDb();
  db.prepare(`
    UPDATE export_stats
    SET count = count + 1,
        last_exported_at = datetime('now', '+8 hours')
    WHERE format = ?
  `).run(format);
}

export function getStats(): StatRow[] {
  return getDb()
    .prepare("SELECT format, count, last_exported_at FROM export_stats ORDER BY format")
    .all() as StatRow[];
}
