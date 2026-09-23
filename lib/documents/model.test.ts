import { describe, expect, it } from "vitest";
import {
  INGESTION_STAGES,
  IN_FLIGHT_STAGES,
  PROCESSABLE_STAGES,
  TERMINAL_STAGES,
  isReviewableStage,
  reviewActionLabel,
  stageLabel,
} from "./model";

/**
 * The invariant this file exists for: EVERY pipeline stage must offer the
 * analyst a route forward, or be explicitly in-flight or terminal.
 *
 * A4-d-2 added `awaiting_scope` and the picker that resolves it. Both action
 * cells — the review queue and the documents list — still tested
 * `stage === "needs_review"` as an inline literal, so a parked job rendered
 * with a badge, no Review link and no Process button. Visible, correctly
 * labelled, and completely unreachable: the picker existed and nothing
 * routed to it. Found in a browser, because nothing in the suite asked
 * whether every stage had an action.
 *
 * A test asserting "isReviewableStage covers awaiting_scope" would be
 * circular — it would only restate the fix. This asserts COMPLETENESS over
 * the stage enum instead, so the next stage anyone adds fails here until it
 * has been given a route.
 */

const ALL_STAGES = Object.keys(INGESTION_STAGES);

describe("every pipeline stage has a route forward", () => {
  it("classifies every stage as processable, reviewable, in-flight or terminal", () => {
    const stranded = ALL_STAGES.filter(
      (stage) =>
        !PROCESSABLE_STAGES.has(stage) &&
        !isReviewableStage(stage) &&
        !IN_FLIGHT_STAGES.has(stage) &&
        !TERMINAL_STAGES.has(stage),
    );
    expect(
      stranded,
      `these stages give the analyst no action and no explanation — a job ` +
        `parked in one of them looks broken: ${stranded.join(", ")}`,
    ).toEqual([]);
  });

  it("puts each stage in exactly one category", () => {
    for (const stage of ALL_STAGES) {
      const memberships = [
        PROCESSABLE_STAGES.has(stage),
        isReviewableStage(stage),
        IN_FLIGHT_STAGES.has(stage),
        TERMINAL_STAGES.has(stage),
      ].filter(Boolean).length;
      expect(memberships, `stage "${stage}" is in ${memberships} categories`).toBe(1);
    }
  });

  it("routes awaiting_scope to the picker, not to a dead end", () => {
    expect(isReviewableStage("awaiting_scope")).toBe(true);
    expect(isReviewableStage("needs_review")).toBe(true);
  });

  it("does not offer a review route for stages with nothing to review", () => {
    for (const stage of ["received", "approved", "extracting", "published", "rejected"]) {
      expect(isReviewableStage(stage)).toBe(false);
    }
  });

  it("asks for the right thing — the two reviewable stages differ", () => {
    // "Review" on a job with no staged lines would be a lie about what the
    // screen does next.
    expect(reviewActionLabel("awaiting_scope")).toBe("Choose scope");
    expect(reviewActionLabel("needs_review")).toBe("Review");
  });

  it("gives every stage a member-facing label", () => {
    for (const stage of ALL_STAGES) {
      expect(stageLabel(stage)).not.toBe(stage);
      expect(stageLabel(stage).length).toBeGreaterThan(0);
    }
  });

  it("tolerates an unknown stage rather than throwing", () => {
    expect(isReviewableStage(null)).toBe(false);
    expect(isReviewableStage(undefined)).toBe(false);
    expect(stageLabel("something_new")).toBe("something_new");
  });
});
