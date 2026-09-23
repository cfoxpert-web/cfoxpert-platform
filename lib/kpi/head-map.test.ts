import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PROJECTION_HEADS } from "../ingestion/head-classify";
import { HEAD_MAP_V1, HEAD_MAP_VERSION, mappedKpiKeys } from "./head-map";

/**
 * A7-a — drift between the classifier and the SQL seed.
 *
 * SCOPE, STATED HONESTLY BECAUSE THE PREVIOUS VERSION OF THIS FILE WAS NOT.
 * Everything here reads migration TEXT. That is enough to catch drift
 * between the classifier's heads, the TypeScript declaration and the seed
 * statement — and it is NOT enough to say a migration is correct.
 *
 * An earlier assertion here claimed to check that every mapped head "points
 * at a kpi_definitions key some migration actually creates". It searched a
 * concatenation of every .sql file for the key and found it. Migration 0023
 * seeded head_kpi_map ABOVE the kpi_definitions rows its foreign key
 * references; the key was present in the text, sixteen lines further down,
 * so this file passed. The live database rejected the same migration with
 *   Key (kpi_key)=(cost_of_goods_sold) is not present in kpi_definitions.
 *
 * A text search has no model of execution order and no model of a database.
 * Existence and ordering are now proven by .github/workflows/db-verify.yml,
 * which applies every migration to a real Postgres 17 and asserts against
 * the state that results. THAT is the authority. This file is a fast
 * early-warning that runs in the unit suite; it is necessary, never
 * sufficient, and it must not grow assertions it cannot honestly make.
 */

const MIGRATIONS = path.join(__dirname, "..", "..", "supabase", "migrations");

/** One migration file, on its own. Ordering is only meaningful within a file. */
function readMigration(prefix: string): string {
  const name = fs
    .readdirSync(MIGRATIONS)
    .find((f) => f.startsWith(prefix) && f.endsWith(".sql"));
  if (!name) throw new Error(`No migration starting ${prefix}`);
  return fs.readFileSync(path.join(MIGRATIONS, name), "utf8");
}

function readMigrations(): string {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n");
}

/** Parse `(1, 'head', 'kpi_key')` tuples out of the head_kpi_map seed. */
function seededMap(sql: string, version: number): Record<string, string> {
  const insertAt = sql.indexOf("insert into public.head_kpi_map");
  if (insertAt === -1) throw new Error("head_kpi_map seed not found in migrations.");
  const block = sql.slice(insertAt, sql.indexOf(";", insertAt));
  const out: Record<string, string> = {};
  const tuple = /\(\s*(\d+)\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = tuple.exec(block)) !== null) {
    if (Number(m[1]) !== version) continue;
    const head = m[2];
    const kpi = m[3];
    if (head && kpi) out[head] = kpi;
  }
  return out;
}

/** Every kpi_definitions key any migration seeds. */
function seededKpiKeys(sql: string): Set<string> {
  const keys = new Set<string>();
  const re = /\(\s*'([a-z0-9_]+)'\s*,\s*'[^']*'\s*,\s*'(?:INR|%|days|x|ratio)'/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m[1]) keys.add(m[1]);
  }
  return keys;
}

describe("every head the classifier can emit is mapped", () => {
  it("is enforced by the TYPE, not merely by this test", () => {
    // HEAD_MAP_V1 is Record<ProjectionHead, string> — total by construction.
    // Adding a head to PROJECTION_HEADS without mapping it is a COMPILE
    // error, so this assertion documents the guarantee rather than being
    // the only thing providing it.
    const mapped = Object.keys(HEAD_MAP_V1).sort();
    expect(mapped).toEqual([...PROJECTION_HEADS].sort());
  });

  it("maps no head to an empty or whitespace key", () => {
    for (const [head, key] of Object.entries(HEAD_MAP_V1)) {
      expect(key.trim(), `head "${head}" maps to an empty key`).not.toBe("");
    }
  });
});

describe("the SQL seed agrees with the TypeScript declaration", () => {
  const sql = readMigrations();

  it("seeds exactly the heads the classifier declares", () => {
    // Three surfaces have to agree: PROJECTION_HEADS, HEAD_MAP_V1, and the
    // migration. Two of them agreeing is what produced the stockChange bug.
    expect(seededMap(sql, HEAD_MAP_VERSION)).toEqual(HEAD_MAP_V1);
  });

  it("seeds the kpi_definitions BEFORE the head_kpi_map rows that reference them", () => {
    // The specific ordering bug that reached production. Still a text
    // check — it proves this one statement pair is ordered, not that the
    // migration applies. db-verify.yml proves the latter.
    //
    // Reads 0023 ALONE. The first version of this assertion searched every
    // migration concatenated, where `insert into public.kpi_definitions`
    // also appears in 0007 and 0009 — so it matched an unrelated file and
    // passed even with 0023 deliberately broken. That is the same mistake
    // twice in one sitting, which is the argument for the database being
    // the authority rather than any amount of cleverness applied to text.
    const migration = readMigration("0023");
    const defsAt = migration.indexOf("insert into public.kpi_definitions");
    const mapAt = migration.indexOf("insert into public.head_kpi_map");
    expect(defsAt).toBeGreaterThan(-1);
    expect(mapAt).toBeGreaterThan(-1);
    expect(
      defsAt,
      "head_kpi_map is seeded before the kpi_definitions it references — " +
        "this fails against a real database with a foreign key violation",
    ).toBeLessThan(mapAt);
  });

  it("declares the unclassified_value KPI the rollup needs to disclose gaps", () => {
    // Text-level only: that it is WRITTEN. That it EXISTS in a migrated
    // database is asserted by supabase/ci/assertions.sql.
    expect(seededKpiKeys(sql).has("unclassified_value")).toBe(true);
  });
});
