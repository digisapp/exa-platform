import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Guardrail against the bug class that caused the 2026-06 coin-drain: a
 * `SECURITY DEFINER` function that writes coin balances was exposed to
 * `authenticated`/`anon` via PostgREST without an `auth.uid()` ownership check,
 * letting any logged-in user spend another actor's coins.
 *
 * Invariant enforced here: every `SECURITY DEFINER` function that writes
 * `coin_balance` must EITHER have its EXECUTE revoked from authenticated/anon
 * (called only via the service-role client) OR bind `auth.uid()` internally
 * (safe to expose, since the caller can only act on their own row).
 *
 * If you add a new money function and this test fails, do one of:
 *   - add it to a `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` (and
 *     call it from routes with the service-role client), or
 *   - add an `auth.uid()` ownership check to the function body (if it is meant
 *     to be called directly by the end user, like withdrawals).
 */

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

function loadAllMigrations(): string {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")).join("\n");
}

function analyze(sql: string) {
  // Each CREATE [OR REPLACE] FUNCTION chunk spans until the next one.
  const chunks = sql.split(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
  const moneyWriters = new Map<string, { hasAuthUid: boolean }>();
  for (const chunk of chunks) {
    const m = chunk.match(/^\s+(?:public\.)?([a-z0-9_]+)\s*\(/i);
    if (!m) continue;
    const name = m[1];
    const isDefiner = /SECURITY\s+DEFINER/i.test(chunk);
    const writesBalance = /coin_balance\s*=/i.test(chunk);
    if (!isDefiner || !writesBalance) continue;
    const entry = moneyWriters.get(name) ?? { hasAuthUid: false };
    if (/auth\.uid\(\)/i.test(chunk)) entry.hasAuthUid = true;
    moneyWriters.set(name, entry);
  }

  // Names whose EXECUTE is revoked: explicit REVOKE statements, plus names
  // listed in a `proname IN (...)` revoke loop. Revokes are cumulative across
  // migrations (the final state), so a union over all files is correct.
  const revoked = new Set<string>();
  let mm: RegExpExecArray | null;
  const reExplicit = /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)/gi;
  while ((mm = reExplicit.exec(sql))) revoked.add(mm[1]);
  const reInList = /proname\s+IN\s*\(([^)]*)\)/gi;
  while ((mm = reInList.exec(sql))) {
    for (const q of mm[1].match(/'([a-z0-9_]+)'/gi) ?? []) {
      revoked.add(q.replace(/'/g, ""));
    }
  }

  const unprotected = [...moneyWriters.entries()]
    .filter(([name, v]) => !revoked.has(name) && !v.hasAuthUid)
    .map(([name]) => name)
    .sort();

  return { count: moneyWriters.size, unprotected };
}

describe("money RPC lockdown guardrail", () => {
  it("every SECURITY DEFINER coin-balance writer is revoked or checks auth.uid()", () => {
    const { count, unprotected } = analyze(loadAllMigrations());
    // Sanity: the detector should find the known money functions, so a parser
    // regression can't make this test vacuously pass.
    expect(count).toBeGreaterThan(10);
    expect(
      unprotected,
      `Unprotected money function(s) — add a REVOKE (and call via the service ` +
        `client) or an auth.uid() ownership check: ${unprotected.join(", ")}`
    ).toEqual([]);
  });
});
