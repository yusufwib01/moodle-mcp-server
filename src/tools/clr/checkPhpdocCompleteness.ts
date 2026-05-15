import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  filePath: z.string().min(1).describe("Path to a PHP file, relative to MOODLE_ROOT."),
  root: rootSchema,
});

interface Finding {
  name: string;
  line: number;
  kind: "function" | "method";
  reason: string;
}

const FUNCTION_RE = /^\s*(public\s+|protected\s+|private\s+|static\s+|abstract\s+|final\s+)*function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;

function isPrecededByPhpdoc(lines: string[], idx: number): boolean {
  for (let i = idx - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    if (trimmed.endsWith("*/")) return true;
    return false;
  }
  return false;
}

function detectKind(line: string): "function" | "method" {
  return /\b(public|protected|private|static|abstract|final)\b/.test(line) ? "method" : "function";
}

export const checkPhpdocCompleteness: ToolDefinition<typeof inputSchema> = {
  name: "check_phpdoc_completeness",
  description:
    "Scan a PHP file and list every function/method that does not have a preceding PHPDoc block. Useful for peer review and CLR documentation checks.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    const s = await stat(absolute);
    if (!s.isFile()) throw new Error(`Not a regular file: ${input.filePath}`);
    const source = await readFile(absolute, "utf8");
    const lines = source.split("\n");
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(FUNCTION_RE);
      if (!m) continue;
      if (isPrecededByPhpdoc(lines, i)) continue;
      findings.push({
        name: m[2],
        line: i + 1,
        kind: detectKind(lines[i]),
        reason: "no PHPDoc block immediately precedes the declaration",
      });
    }
    return {
      filePath: input.filePath,
      findings,
      summary:
        findings.length === 0
          ? "All functions/methods have a preceding PHPDoc block."
          : `${findings.length} function(s)/method(s) missing PHPDoc.`,
    };
  },
};
