import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDbSchema } from "../../../src/tools/feature/getDbSchema.js";

const INSTALL_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<XMLDB PATH="mod/quiz/db" VERSION="2024010100">
  <TABLES>
    <TABLE NAME="quiz" COMMENT="Quizzes available to students.">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="name" TYPE="char" LENGTH="255" NOTNULL="true"/>
      </FIELDS>
      <KEYS>
        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>
      </KEYS>
    </TABLE>
    <TABLE NAME="quiz_attempts" COMMENT="Attempts.">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="quiz" TYPE="int" LENGTH="10" NOTNULL="true"/>
      </FIELDS>
    </TABLE>
  </TABLES>
</XMLDB>`;

describe("getDbSchema", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "schema-")));
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await writeFile(join(root, "mod", "quiz", "db", "install.xml"), INSTALL_XML);
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the matching TABLE definition", async () => {
    const out = await getDbSchema.run({ tableName: "quiz" });
    expect(out.file).toBe("mod/quiz/db/install.xml");
    expect(out.fields.map((f) => f.name)).toEqual(["id", "name"]);
    expect(out.keys?.[0].name).toBe("primary");
  });

  it("throws when the table is not found", async () => {
    await expect(getDbSchema.run({ tableName: "nonexistent" })).rejects.toThrow(/not found/i);
  });
});
