import { describe, it, expect } from "vitest";
import { suggestTriageOutcome } from "../../../src/tools/triage/suggestTriageOutcome.js";

describe("suggestTriageOutcome", () => {
  it("flags third-party plugin reports", async () => {
    const out = await suggestTriageOutcome.run({
      description: "This is caused by a third-party plugin called Foo bar.",
    });
    expect(out.primary.outcome).toContain("CONTRIB");
    expect(out.primary.cannedResponse).toBe("contributed_plugin");
    expect(out.primary.confidence).toBe("high");
  });

  it("flags how-to questions as support requests", async () => {
    const out = await suggestTriageOutcome.run({
      description: "How do I enable the calendar block on the dashboard?",
    });
    expect(out.primary.cannedResponse).toBe("support_request");
  });

  it("flags security-sensitive language", async () => {
    const out = await suggestTriageOutcome.run({
      description: "Possible XSS via course summary; needs review.",
    });
    expect(out.primary.cannedResponse).toBe("triaged_security");
  });

  it("falls through to investigate when nothing matches", async () => {
    const out = await suggestTriageOutcome.run({
      description: "Quiz randomization produces inconsistent question order across attempts.",
    });
    expect(out.primary.confidence).toBe("low");
  });
});
