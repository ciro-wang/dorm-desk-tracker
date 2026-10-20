import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(__dirname, "../supabase/migrations");
const sql = (() => {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(path.join(dir, f), "utf8"))
      .join("\n")
      .toLowerCase();
  } catch {
    return "";
  }
})();

const tables = [...sql.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_]+)/g)].map((m) => m[1]);

describe("migrations", () => {
  it("define the core tables", () => {
    for (const t of ["merchants", "pickup_stores", "products", "listings", "price_logs", "news_items", "alert_state", "alert_log", "job_runs"]) {
      expect(tables).toContain(t);
    }
  });

  it("enable row level security on every table", () => {
    for (const t of tables) {
      expect(sql, t).toMatch(new RegExp(`alter table (?:public\\.)?${t} enable row level security`));
    }
  });

  it("give every table an authenticated-only policy", () => {
    for (const t of tables) {
      expect(sql, t).toMatch(new RegExp(`create policy [^;]+ on (?:public\\.)?${t}[^;]+to authenticated`));
    }
  });

  it("define the history views", () => {
    for (const v of ["latest_price_logs", "latest_ok_price_logs", "listing_daily_best", "product_daily_best"]) {
      expect(sql).toMatch(new RegExp(`create (?:or replace )?view (?:public\\.)?${v}`));
    }
  });

  it("make every view run with the caller's permissions so RLS applies", () => {
    const views = [...sql.matchAll(/create (?:or replace )?view (?:public\.)?([a-z_]+)([^;]*?) as/g)];
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) expect(v[2], v[1]).toContain("security_invoker = true");
  });

  it("store when downtown pickup disappeared, for the pickup alert re-arm", () => {
    expect(sql).toMatch(/alter table (?:public\.)?alert_state add column (?:if not exists )?pickup_gone_since timestamptz/);
  });

  it("limit every table to the owner listed in app_owner, not any signed-in user", () => {
    expect(tables).toContain("app_owner");
    for (const t of tables) {
      const creates = [...sql.matchAll(new RegExp(`create policy ([a-z_]+) on (?:public\\.)?${t}\\b([^;]*);`, "g"))];
      const ownerOnly = creates.filter((c) => !/using \(true\)/.test(c[2]));
      expect(ownerOnly.length, t).toBeGreaterThan(0);
      for (const c of creates.filter((x) => /using \(true\)/.test(x[2]))) {
        const drop = sql.indexOf(`drop policy ${c[1]} on public.${t};`, c.index);
        expect(drop, `${t}.${c[1]} must be dropped later`).toBeGreaterThan(c.index!);
      }
    }
  });

  it("never grant policies to anon or public", () => {
    expect(sql).not.toMatch(/create policy [^;]+to (anon|public)\b/);
  });
});
