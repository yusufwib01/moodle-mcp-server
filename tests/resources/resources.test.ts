import { describe, it, expect } from "vitest";
import { allResources, listResources, readResource } from "../../src/resources/index.js";

describe("resources", () => {
  it("exposes the three Moodle guidelines URIs", () => {
    const uris = listResources(allResources).map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        "moodle://guidelines/coding-style",
        "moodle://guidelines/review-checklist",
        "moodle://guidelines/deprecation",
      ]),
    );
  });

  it("reads a resource", async () => {
    const out = await readResource(allResources, "moodle://guidelines/deprecation");
    expect(out[0].mimeType).toBe("text/markdown");
    expect(out[0].text).toContain("Deprecation");
  });

  it("rejects unknown URIs", async () => {
    await expect(readResource(allResources, "moodle://nope")).rejects.toThrow();
  });
});
