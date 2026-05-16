import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getComponentOwner, setComponentsJsonPathForTests } from "../../../src/tools/review/getComponentOwner.js";

describe("getComponentOwner", () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "owners-"));
    path = join(dir, "components.json");
    setComponentsJsonPathForTests(path);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    setComponentsJsonPathForTests(undefined);
  });

  it("returns notConfigured when json missing", async () => {
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notConfigured).toBe(true);
  });

  it("returns owner info when present", async () => {
    await writeFile(path, JSON.stringify({ components: { mod_quiz: { owner: "Tim", maintainer: "Hedgehog" } } }));
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notConfigured).toBeFalsy();
    expect(out.owner).toBe("Tim");
    expect(out.maintainer).toBe("Hedgehog");
  });

  it("returns notFound when component missing", async () => {
    await writeFile(path, JSON.stringify({ components: {} }));
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notFound).toBe(true);
  });
});
