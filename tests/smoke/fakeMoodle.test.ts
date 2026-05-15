import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { searchMoodleCodebase } from "../../src/tools/codebase/searchMoodleCodebase.js";
import { listComponentFiles } from "../../src/tools/codebase/listComponentFiles.js";
import { getDbSchema } from "../../src/tools/feature/getDbSchema.js";

const here = dirname(fileURLToPath(import.meta.url));
const fakeRoot = resolve(here, "..", "fixtures", "fake-moodle");

describe("fake-moodle smoke tests", () => {
  const original = process.env.MOODLE_ROOT;

  beforeAll(() => {
    process.env.MOODLE_ROOT = fakeRoot;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = original;
  });

  it("search_moodle_codebase finds fake_get_records", async () => {
    const out = await searchMoodleCodebase.run({ query: "fake_get_records", filePattern: "*.php" });
    const files = out.results.map((r) => r.file);
    expect(files).toEqual(expect.arrayContaining(["lib/datalib.php"]));
  });

  it("list_component_files returns mod_quiz files", async () => {
    const out = await listComponentFiles.run({ component: "mod_quiz" });
    const paths = out.results.map((r) => r.path);
    expect(paths).toEqual(expect.arrayContaining(["mod/quiz/lib.php", "mod/quiz/db/install.xml"]));
  });

  it("get_db_schema returns the quiz table", async () => {
    const out = await getDbSchema.run({ tableName: "quiz" });
    expect(out.fields.map((f) => f.name)).toEqual(["id", "name"]);
  });
});
