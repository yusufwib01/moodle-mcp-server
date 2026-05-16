import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  description: z.string().min(3).describe("Issue summary or description text to classify."),
});

interface Suggestion {
  outcome: string;
  cannedResponse: string | null;
  reason: string;
  confidence: "high" | "medium" | "low";
}

const RULES: Array<{
  test: (s: string) => boolean;
  outcome: string;
  cannedResponse: ((s: string) => string | null) | string | null;
  reason: string;
  confidence: Suggestion["confidence"];
}> = [
  {
    test: (s) => /\b(third[- ]?party|contrib|plugin maintainer)\b/i.test(s),
    outcome: "Move to CONTRIB or close as Not a bug",
    cannedResponse: "contributed_plugin",
    reason: "Mentions third-party / contrib plugin — issue belongs to plugin maintainer, not Moodle core.",
    confidence: "high",
  },
  {
    test: (s) => /\b(duplicate of|already (reported|tracked|filed)|same as MDL-)\b/i.test(s),
    outcome: "Close as Duplicate",
    cannedResponse: "duplicate",
    reason: "Indicates an existing tracker issue — close as duplicate and link the original.",
    confidence: "high",
  },
  {
    test: (s) => /\b(how do I|how can I|how to|please help|i need help|tutorial)\b/i.test(s),
    outcome: "Close as Not a bug (support request)",
    cannedResponse: "support_request",
    reason: "Reads as a how-to / support question rather than a defect.",
    confidence: "high",
  },
  {
    test: (s) => /\b(translation|lang(?:uage)? string|amos|wrong word)\b/i.test(s),
    outcome: "Close as Deferred (translation)",
    cannedResponse: (s: string) => (/\ben\b/i.test(s) ? "en_fix" : "translation_request"),
    reason: "Language / translation request — handled outside the tracker (AMOS workflow).",
    confidence: "high",
  },
  {
    test: (s) => /\b(moodle\s*(1\.|2\.[0-7]|3\.[0-9]|4\.[0-4])|unsupported version|end of life)\b/i.test(s),
    outcome: "Close as Not a bug / Fixed (unsupported version)",
    cannedResponse: "unsupported_version",
    reason: "References a Moodle release that is past security support.",
    confidence: "medium",
  },
  {
    test: (s) => /\b(security|xss|csrf|sql injection|privilege escalation|auth bypass)\b/i.test(s),
    outcome: "Set security level + Triaged",
    cannedResponse: "triaged_security",
    reason: "Security-sensitive language — escalate immediately, raise the issue security level.",
    confidence: "high",
  },
  {
    test: (s) => /\b(cannot reproduce|can'?t reproduce|need(s)? steps|please provide)\b/i.test(s),
    outcome: "Triaging in progress (need more info)",
    cannedResponse: "need_more_info",
    reason: "Reproduction blocked — request more info from reporter.",
    confidence: "medium",
  },
  {
    test: (s) => /\b(usability|confusing UI|hard to find|user[- ]experience)\b/i.test(s),
    outcome: "Triaged with Usability component",
    cannedResponse: null,
    reason: "Likely usability concern — add the Usability component and keep open.",
    confidence: "medium",
  },
  {
    test: (s) => /\b(already possible|workaround:|you can already)\b/i.test(s),
    outcome: "Close as Not a bug (already possible)",
    cannedResponse: "already_possible",
    reason: "Functionality already exists — close with a pointer to docs.",
    confidence: "medium",
  },
];

export const suggestTriageOutcome: ToolDefinition<typeof inputSchema> = {
  name: "suggest_triage_outcome",
  description:
    "Heuristically classify a Moodle tracker issue description and suggest an outcome + matching canned response. Pattern matching only — final call is the triager's. Confidence: high (clear match), medium (partial), low (default).",
  inputSchema,
  async run(input) {
    const matches: Suggestion[] = [];
    for (const rule of RULES) {
      if (rule.test(input.description)) {
        const cannedResponse =
          typeof rule.cannedResponse === "function" ? rule.cannedResponse(input.description) : rule.cannedResponse;
        matches.push({
          outcome: rule.outcome,
          cannedResponse,
          reason: rule.reason,
          confidence: rule.confidence,
        });
      }
    }
    if (matches.length === 0) {
      matches.push({
        outcome: "Investigate further — no heuristic match",
        cannedResponse: null,
        reason:
          "No screening pattern matched. Walk through the triage checklist manually (get_triage_checklist).",
        confidence: "low",
      });
    }
    return {
      description: input.description,
      suggestions: matches,
      primary: matches[0],
      note: "Heuristic only. Always confirm with the full triage checklist before closing or escalating.",
    };
  },
};
