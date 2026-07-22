import { normalizeLabel } from "./normalize";
import type { CandidateLine } from "./types";

/**
 * Amendment A4-b — mapping memory application (pure).
 *
 * account_mappings rows are analyst-CONFIRMED facts; they OVERRIDE
 * whatever the extractor (parser or model) proposed, at confidence 1.0.
 * This is what makes the pipeline more deterministic with every upload
 * (ADR-010): the model is only consulted for labels no analyst has
 * mapped yet.
 */

export type MappingEntry = { kpiKey: string; segment: string | null };

export function applyMappingMemory(
  lines: CandidateLine[],
  mappings: Map<string, MappingEntry>,
): { lines: CandidateLine[]; fromMemory: number } {
  let fromMemory = 0;
  const mapped = lines.map((line) => {
    const hit = mappings.get(normalizeLabel(line.sourceLabel));
    if (!hit) return line;
    fromMemory++;
    return {
      ...line,
      proposedKpiKey: hit.kpiKey,
      segment: hit.segment ?? line.segment,
      confidence: 1,
    };
  });
  return { lines: mapped, fromMemory };
}
