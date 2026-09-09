import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PROJECTION_HEADS } from "../ingestion/head-classify";
import { HEAD_MAP_V1, HEAD_MAP_VERSION, mappedKpiKeys } from "./head-map";

/**
 * A7-a — closing the bug CLASS, not just the bug.
 *
 * `stockChange` was left unmapped in migration 0023's first draft. Unmapped
 * heads fall through to `unclassified`, so opening and closing stock were
 * both counted as unclassified AND removed from cost of goods sold: gross
 * profit broke and the unclassified figure was wrong, in one test run.
 *
 * That was found by luck — the golden test happened to cover it. These
 * assertions make it impossible rather than unlikely, on all three surfaces
 * the fact has to be true on at once: the classifier's heads, the TypeScript
 * declaration, and the SQL that seeds the database.
 */

const MIGRATIONS = path.join(__dirname, "..", "..", "supabase", "migrations");

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

  it("maps every head to a KPI some migration actually creates", () => {
    // Guards the other direction: a head mapped to a KPI key that does not
    // exist would fail at publish with a foreign-key error, in production,
    // on a client's document.
    const defined = seededKpiKeys(sql);
    for (const key of mappedKpiKeys()) {
      expect(defined.has(key), `kpi_definitions has no row for "${key}"`).toBe(true);
    }
  });

  it("creates the unclassified_value KPI the rollup needs to disclose gaps", () => {
    expect(seededKpiKeys(sql).has("unclassified_value")).toBe(true);
  });
});
