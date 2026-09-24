import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ADR-022 — RLS is a boundary, never a selector.
 *
 * Row Level Security answers "may this viewer see this row". It does NOT
 * answer "is this row the organization I am currently looking at". Reading
 * an org-scoped table without an explicit `organization_id` filter and then
 * attributing the result to one organization is a category error, and this
 * codebase has now made it twice:
 *
 *   M11 — org resolution read `organization_members` without filtering
 *   `user_id`, because RLS shows teammates' rows by design. Caught in live
 *   testing.
 *
 *   A7-a-2 — the dashboard read `health_scores` with no `organization_id`
 *   filter and rendered the latest row as the viewed client's Business
 *   Health Score. The three rows in that table are PUBLIC LEAD
 *   self-assessments with `organization_id IS NULL` — rows RLS cannot scope
 *   by membership, because there is no membership to check. A stranger's
 *   questionnaire result displayed as a client's health score.
 *
 * WHAT THIS TEST CHECKS, STATED EXACTLY (ADR-021's discipline): it reads
 * SOURCE, so it can prove that every org-scoped list-read either filters
 * `organization_id`, fetches a single row by primary key, or carries a
 * written `rls-scope:` justification. It CANNOT prove the filter passes the
 * right id, and it does not claim to. Its value is that a new unfiltered
 * read cannot be added silently — someone has to write down why.
 */

/** Tables carrying an `organization_id` column, from the migrations. */
const ORG_SCOPED_TABLES = [
  "account_mappings",
  "client_documents",
  "client_reports",
  "health_check_submissions",
  "health_scores",
  "ingestion_jobs",
  "kpi_periods",
  "leads",
  "recommendations",
  "statement_lines",
];

const ROOTS = ["lib", "app", "components"];
const ROOT_DIR = path.join(__dirname, "..");

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
  };
  for (const root of ROOTS) walk(path.join(ROOT_DIR, root));
  return out;
}

type Finding = { file: string; line: number; table: string };

function unjustifiedReads(): Finding[] {
  const findings: Finding[] = [];
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, "utf8");
    const re = /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src)) !== null) {
      const table = match[1];
      if (!table || !ORG_SCOPED_TABLES.includes(table)) continue;

      // The statement: from `.from(` to the end of the awaited expression.
      const statement = src.slice(match.index, match.index + 900).split(/;\s*\n/)[0] ?? "";
      if (/\.eq\(\s*["'`]organization_id["'`]/.test(statement)) continue; // scoped
      if (/\.eq\(\s*["'`]id["'`]/.test(statement)) continue;              // single row by PK
      if (/\.insert\(|\.update\(/.test(statement)) continue;              // a write

      // A deliberate cross-org read must SAY SO, within the preceding lines.
      const before = src.slice(Math.max(0, match.index - 600), match.index);
      if (/rls-scope:/.test(before)) continue;

      findings.push({
        file: path.relative(ROOT_DIR, file),
        line: src.slice(0, match.index).split("\n").length,
        table,
      });
    }
  }
  return findings;
}

describe("org-scoped tables are never read on RLS alone", () => {
  it("has no unfiltered, unjustified read of an org-scoped table", () => {
    const findings = unjustifiedReads();
    const detail = findings
      .map((f) => `  ${f.file}:${f.line} reads "${f.table}" with no organization_id filter`)
      .join("\n");
    expect(
      findings,
      findings.length === 0
        ? ""
        : `RLS scopes what a viewer MAY see, not which organization they are ` +
            `LOOKING AT. Add .eq("organization_id", …), fetch by primary key, or ` +
            `write an "rls-scope:" comment explaining why a cross-org read is ` +
            `correct here (ADR-022):\n${detail}`,
    ).toEqual([]);
  });

  it("recognises a filtered read, a keyed read and a justified read", () => {
    // Guards the CHECK itself: if the matcher silently stopped matching,
    // the suite above would pass by finding nothing at all.
    const all = sourceFiles()
      .map((f) => fs.readFileSync(f, "utf8"))
      .join("\n");
    expect(all).toMatch(/\.from\("health_scores"\)/);
    expect(all).toMatch(/\.eq\("organization_id", org\.id\)/);
    expect(all).toMatch(/rls-scope:/);
  });

  it("covers every org-scoped table the migrations declare", () => {
    // If a migration adds an organization_id column to a new table, this
    // list must grow with it — otherwise the rule silently stops applying.
    const migrations = fs
      .readdirSync(path.join(ROOT_DIR, "supabase", "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .map((f) => fs.readFileSync(path.join(ROOT_DIR, "supabase", "migrations", f), "utf8"))
      .join("\n");

    const declared = new Set<string>();
    const re = /create table public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(migrations)) !== null) {
      const [, name, body] = m;
      if (name && body && /organization_id uuid/.test(body)) declared.add(name);
    }
    // organizations/organization_members/feature_flag* are the tenancy
    // tables themselves, not org-scoped DATA; they are excluded by design.
    const missing = [...declared].filter(
      (t) =>
        !ORG_SCOPED_TABLES.includes(t) &&
        !["organizations", "organization_members", "feature_flag_overrides", "feature_flags"].includes(t),
    );
    expect(
      missing,
      `these tables have an organization_id column but are not covered by the rule: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
