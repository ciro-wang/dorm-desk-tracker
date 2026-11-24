import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDemoTables, type DemoTables } from "@/lib/demo/data";

/*
 * A read-only stand-in for the Supabase client, backed by lib/demo/data. It implements just the
 * query methods the loaders in lib/data/load.ts use. Anything that writes throws.
 */

type Row = Record<string, unknown>;

const readOnly = () => {
  throw new Error("The demo is read-only");
};

class DemoQuery implements PromiseLike<{ data: Row[]; error: null }> {
  private filters: ((r: Row) => boolean)[] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private window: [number, number] | null = null;

  constructor(private rows: Row[]) {}

  select() {
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push((r) => r[col] === value);
    return this;
  }
  neq(col: string, value: unknown) {
    // PostgREST spells the empty array "{}".
    this.filters.push((r) => (Array.isArray(r[col]) && value === "{}" ? (r[col] as unknown[]).length > 0 : r[col] !== value));
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }
  gte(col: string, value: string | number) {
    this.filters.push((r) => (r[col] as string | number) >= value);
    return this;
  }
  contains(col: string, values: unknown[]) {
    this.filters.push((r) => values.every((v) => (r[col] as unknown[]).includes(v)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sorts.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  range(from: number, to: number) {
    this.window = [from, to];
    return this;
  }

  insert = readOnly;
  update = readOnly;
  upsert = readOnly;
  delete = readOnly;

  then<A = { data: Row[]; error: null }, B = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    let out = this.rows.filter((r) => this.filters.every((f) => f(r)));
    out = [...out].sort((a, b) => {
      for (const { col, asc } of this.sorts) {
        const x = a[col] as string | number;
        const y = b[col] as string | number;
        if (x !== y) return (x < y ? -1 : 1) * (asc ? 1 : -1);
      }
      return 0;
    });
    if (this.window) out = out.slice(this.window[0], this.window[1] + 1);
    return Promise.resolve({ data: out, error: null }).then(onfulfilled, onrejected);
  }
}

export const DEMO_USER = { id: "00000000-0000-4000-8000-000000000000", email: "demo@example.com" };

export function createDemoClient(now: Date, tables: DemoTables = buildDemoTables(now)): SupabaseClient {
  const client = {
    from: (table: string) => new DemoQuery(tables[table] ?? []),
    rpc: readOnly,
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      signInWithPassword: readOnly,
      signOut: readOnly,
    },
  };
  return client as unknown as SupabaseClient;
}
