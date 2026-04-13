import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CardState } from "@/lib/types/card";

const DB_NAME = "card-studio";
const DB_VERSION = 1;

export type HistoryEntry = {
  id: string;
  createdAt: number;
  label: string;
  state: CardState;
  /** 落地页粘贴原文，便于「载入到欢迎」 */
  pasteRaw?: string;
};

interface CardStudioDB extends DBSchema {
  kv: {
    key: string;
    value: unknown;
  };
  history: {
    key: string;
    value: HistoryEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<CardStudioDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CardStudioDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CardStudioDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("kv")) {
          database.createObjectStore("kv");
        }
        if (!database.objectStoreNames.contains("history")) {
          database.createObjectStore("history", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

const DRAFT_KEY = "draft";

export async function loadDraft(): Promise<CardState | undefined> {
  const db = await getDb();
  const v = await db.get("kv", DRAFT_KEY);
  return v as CardState | undefined;
}

export async function saveDraft(state: CardState): Promise<void> {
  const db = await getDb();
  await db.put("kv", state, DRAFT_KEY);
}

export const MAX_HISTORY = 20;

export async function listHistory(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const all = await db.getAll("history");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  const list = await listHistory();
  const next = [entry, ...list.filter((e) => e.id !== entry.id)]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_HISTORY);
  const tx = db.transaction("history", "readwrite");
  await tx.store.clear();
  for (const e of next) {
    await tx.store.put(e);
  }
  await tx.done;
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("history", id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("history", "readwrite");
  await tx.store.clear();
  await tx.done;
}

export function newHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
