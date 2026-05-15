import { describe, it, expect } from "vitest";
import { analyzePatch } from "../../../src/tools/feature/analyzePatch.js";

const SAMPLE_DIFF = `diff --git a/mod/quiz/lib.php b/mod/quiz/lib.php
index 1234567..abcdefg 100644
--- a/mod/quiz/lib.php
+++ b/mod/quiz/lib.php
@@ -10,7 +10,7 @@ function quiz_add_instance(stdClass $data): int {
-    return 0;
+    return $DB->insert_record('quiz', $data);
 }
diff --git a/mod/quiz/db/install.xml b/mod/quiz/db/install.xml
index 1111111..2222222 100644
--- a/mod/quiz/db/install.xml
+++ b/mod/quiz/db/install.xml
@@ -1,1 +1,2 @@
-<TABLE NAME="quiz">
+<TABLE NAME="quiz" COMMENT="Quizzes">
+<TABLE NAME="quiz_attempts">
diff --git a/lib/classes/external/user_api.php b/lib/classes/external/user_api.php
new file mode 100644
--- /dev/null
+++ b/lib/classes/external/user_api.php
@@ -0,0 +1,5 @@
+<?php
+namespace core;
+class user_api {}
diff --git a/blocks/html/lang/en/block_html.php b/blocks/html/lang/en/block_html.php
--- a/blocks/html/lang/en/block_html.php
+++ b/blocks/html/lang/en/block_html.php
@@ -1,1 +1,1 @@
-old
+new
`;

describe("analyzePatch", () => {
  it("extracts affected files and resolves components", async () => {
    const out = await analyzePatch.run({ diff: SAMPLE_DIFF });
    const files = out.files.map((f) => f.path).sort();
    expect(files).toEqual([
      "blocks/html/lang/en/block_html.php",
      "lib/classes/external/user_api.php",
      "mod/quiz/db/install.xml",
      "mod/quiz/lib.php",
    ]);
    expect(out.components.sort()).toEqual(["block_html", "core", "mod_quiz"].sort());
  });

  it("suggests checklists by file type", async () => {
    const out = await analyzePatch.run({ diff: SAMPLE_DIFF });
    expect(out.suggestedChecklists).toEqual(expect.arrayContaining(["db", "security"]));
  });

  it("rejects empty diff via schema", () => {
    expect(() => analyzePatch.inputSchema.parse({ diff: "" })).toThrow();
  });
});
