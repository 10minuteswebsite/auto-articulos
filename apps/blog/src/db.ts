// Interfaz mínima de base de datos. La implementan D1 (producción, Cloudflare)
// y node:sqlite (pruebas y servidor local), para que el MISMO código y el
// MISMO esquema SQL corran en ambos lados.

export interface Stmt {
  sql: string;
  params?: unknown[];
}

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
  /** Todas las sentencias en una sola transacción (todo o nada). */
  batch(statements: Stmt[]): Promise<void>;
}

/** Adaptador para Cloudflare D1 (tipado mínimo para no depender de @cloudflare/workers-types). */
interface D1Like {
  prepare(sql: string): {
    bind(...p: unknown[]): {
      all(): Promise<{ results: unknown[] }>;
      first(): Promise<unknown>;
      run(): Promise<unknown>;
    };
  };
  batch(stmts: unknown[]): Promise<unknown>;
}

export function d1Adapter(d1: D1Like): Db {
  const bind = (s: Stmt) => d1.prepare(s.sql).bind(...(s.params ?? []));
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      return (await bind({ sql, params }).all()).results as T[];
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return ((await bind({ sql, params }).first()) as T | null) ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      await bind({ sql, params }).run();
    },
    async batch(statements: Stmt[]) {
      await d1.batch(statements.map(bind));
    },
  };
}
