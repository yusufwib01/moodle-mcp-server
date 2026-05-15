import { describe, it, expect } from "vitest";
import { getUpgradeNoteFormat } from "../../../src/tools/guidelines/getUpgradeNoteFormat.js";

describe("getUpgradeNoteFormat", () => {
  it("returns the stub content", async () => {
    const out = await getUpgradeNoteFormat.run({});
    expect(out.content).toContain("upgrade");
  });
});
