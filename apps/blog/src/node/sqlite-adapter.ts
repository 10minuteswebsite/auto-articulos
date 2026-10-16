// Adaptador de node:sqlite a la interfaz Db. Solo para pruebas y servidor local.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db, Stmt } from "../db";

type SqlValue = string | number | null;
const norm = (p: unknown[] = []) => p.map((v) => (v === undefined ? null : v)) as SqlValue[];

export function sqliteAdapter(file = ":memory:"): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA foreign_keys = ON;");
  const migrationsDir = join(__dirname, "..", "..", "migrations");
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith(".sql")).sort()) {
    raw.exec(readFileSync(join(migrationsDir, f), "utf8"));
  }
  return {
    raw,
    async all<T>(sql: string, params?: unknown[]) {
      return raw.prepare(sql).all(...norm(params)) as T[];
    },
    async first<T>(sql: string, params?: unknown[]) {
      return (raw.prepare(sql).get(...norm(params)) as T | undefined) ?? null;
    },
    async run(sql: string, params?: unknown[]) {
      raw.prepare(sql).run(...norm(params));
    },
    async batch(statements: Stmt[]) {
      raw.exec("BEGIN");
      try {
        for (const s of statements) raw.prepare(s.sql).run(...norm(s.params));
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
