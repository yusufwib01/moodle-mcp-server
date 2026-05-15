import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPrivacyProvider } from "../../../src/tools/clr/checkPrivacyProvider.js";

describe("checkPrivacyProvider", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "privacy-")));
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("flags components with tables but no provider", async () => {
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "db", "install.xml"),
      `<XMLDB><TABLES><TABLE NAME="quiz"></TABLE><TABLE NAME="quiz_attempts"></TABLE></TABLES></XMLDB>`,
    );
    const out = await checkPrivacyProvider.run({ component: "mod_quiz" });
    expect(out.hasProvider).toBe(false);
    expect(out.tables).toEqual(["quiz", "quiz_attempts"]);
    expect(out.ok).toBe(false);
  });

  it("passes when provider declares all tables", async () => {
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await mkdir(join(root, "mod", "quiz", "classes", "privacy"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "db", "install.xml"),
      `<XMLDB><TABLES><TABLE NAME="quiz"></TABLE></TABLES></XMLDB>`,
    );
    await writeFile(
      join(root, "mod", "quiz", "classes", "privacy", "provider.php"),
      `<?php
class provider implements \\core_privacy\\local\\metadata\\provider, \\core_privacy\\local\\request\\plugin\\provider {
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table('quiz', [], 'privacy:metadata:quiz');
        return $collection;
    }
}`,
    );
    const out = await checkPrivacyProvider.run({ component: "mod_quiz" });
    expect(out.hasProvider).toBe(true);
    expect(out.providerType).toBe("request_provider");
    expect(out.tablesMissingMetadata).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it("flags tables missing from provider metadata", async () => {
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await mkdir(join(root, "mod", "quiz", "classes", "privacy"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "db", "install.xml"),
      `<XMLDB><TABLES><TABLE NAME="quiz"></TABLE><TABLE NAME="quiz_attempts"></TABLE></TABLES></XMLDB>`,
    );
    await writeFile(
      join(root, "mod", "quiz", "classes", "privacy", "provider.php"),
      `<?php
class provider implements \\core_privacy\\local\\metadata\\provider {
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table('quiz', [], 'privacy:metadata:quiz');
        return $collection;
    }
}`,
    );
    const out = await checkPrivacyProvider.run({ component: "mod_quiz" });
    expect(out.tablesMissingMetadata).toEqual(["quiz_attempts"]);
    expect(out.ok).toBe(false);
  });
});
