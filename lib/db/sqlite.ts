import { createClient } from "@libsql/client";

export type ExportFormat = "rgb_pdf" | "png" | "cmyk_pdf";

export type StatRow = {
  format: ExportFormat;
  count: number;
  last_exported_at: string | null;
};

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    return createClient({ url, authToken });
  }

  // local fallback for development
  return createClient({ url: "file:data/stats.db" });
}

async function ensureTable() {
  const db = getClient();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS export_stats (
      format TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      last_exported_at TEXT
    )`,
    `INSERT OR IGNORE INTO export_stats (format, count) VALUES ('rgb_pdf', 0)`,
    `INSERT OR IGNORE INTO export_stats (format, count) VALUES ('png', 0)`,
    `INSERT OR IGNORE INTO export_stats (format, count) VALUES ('cmyk_pdf', 0)`,
  ], "write");
  return db;
}

export async function recordExport(format: ExportFormat): Promise<void> {
  const db = await ensureTable();
  await db.execute({
    sql: `UPDATE export_stats
          SET count = count + 1,
              last_exported_at = datetime('now', 'localtime')
          WHERE format = ?`,
    args: [format],
  });
}

export async function getStats(): Promise<StatRow[]> {
  const db = await ensureTable();
  const result = await db.execute(
    "SELECT format, count, last_exported_at FROM export_stats ORDER BY format"
  );
  return result.rows as unknown as StatRow[];
}
