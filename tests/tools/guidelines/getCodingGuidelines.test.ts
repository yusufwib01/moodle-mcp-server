import { describe, it, expect } from "vitest";
import { getCodingGuidelines, listGuidelineTopics } from "../../../src/tools/guidelines/getCodingGuidelines.js";

describe("getCodingGuidelines", () => {
  it("returns the stub content for a known topic", async () => {
    const out = await getCodingGuidelines.run({ topic: "phpdoc" });
    expect(out.topic).toBe("phpdoc");
    expect(out.content).toContain("phpdoc");
  });

  it("lists known topics when no topic is given", async () => {
    const out = await getCodingGuidelines.run({});
    expect(out.topics).toEqual(expect.arrayContaining(["phpdoc", "db_queries"]));
  });

  it("errors on unknown topics via schema", () => {
    expect(() => getCodingGuidelines.inputSchema.parse({ topic: "nonsense" })).toThrow();
  });

  it("listGuidelineTopics is non-empty", () => {
    expect(listGuidelineTopics()).toContain("phpdoc");
  });
});
