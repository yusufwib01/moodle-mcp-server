import { describe, it, expect } from "vitest";
import { getFeatureScaffold } from "../../../src/tools/feature/getFeatureScaffold.js";

describe("getFeatureScaffold", () => {
  it("returns the file list for a mod plugin", async () => {
    const out = await getFeatureScaffold.run({ type: "mod", name: "widget" });
    const paths = out.files.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining([
      "mod/widget/version.php",
      "mod/widget/lib.php",
      "mod/widget/db/install.xml",
      "mod/widget/lang/en/widget.php",
    ]));
    expect(out.files[0].content).toContain("<?php");
  });

  it("rejects unknown plugin types via schema", () => {
    expect(() => getFeatureScaffold.inputSchema.parse({ type: "unknown", name: "x" })).toThrow();
  });

  it("rejects invalid plugin names via schema", () => {
    expect(() => getFeatureScaffold.inputSchema.parse({ type: "mod", name: "Bad-Name" })).toThrow();
  });
});
