import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { resolveComponentPath } from "../../lib/moodle.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  component: z.string().min(1).describe("Moodle component name, e.g. mod_quiz."),
  root: rootSchema,
});

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

export const checkPrivacyProvider: ToolDefinition<typeof inputSchema> = {
  name: "check_privacy_provider",
  description:
    "Verify a Moodle component has a privacy provider where required. Detects new DB tables in install.xml and flags missing classes/privacy/provider.php.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const componentDir = resolveComponentPath(root, input.component);

    const installXml = join(componentDir, "db", "install.xml");
    const hasInstallXml = await fileExists(installXml);
    let tables: string[] = [];
    if (hasInstallXml) {
      const xml = await readFile(installXml, "utf8");
      const matches = xml.matchAll(/<TABLE\s+NAME="([^"]+)"/g);
      tables = [...matches].map((m) => m[1]);
    }

    const providerPath = join(componentDir, "classes", "privacy", "provider.php");
    const hasProvider = existsSync(providerPath);

    let providerType: "null_provider" | "request_provider" | "metadata_only" | "unknown" | "none" = "none";
    let metadataDeclared: string[] = [];
    if (hasProvider) {
      const src = await readFile(providerPath, "utf8");
      if (src.includes("\\core_privacy\\local\\metadata\\null_provider")) {
        providerType = "null_provider";
      } else if (src.includes("\\core_privacy\\local\\request\\plugin\\provider")) {
        providerType = "request_provider";
      } else if (src.includes("\\core_privacy\\local\\metadata\\provider")) {
        providerType = "metadata_only";
      } else {
        providerType = "unknown";
      }
      const tableDecls = src.matchAll(/add_database_table\s*\(\s*['"]([^'"]+)['"]/g);
      metadataDeclared = [...tableDecls].map((m) => m[1]);
    }

    const tablesMissingMetadata = tables.filter((t) => !metadataDeclared.includes(t));
    const needsProvider = tables.length > 0;
    const ok =
      (!needsProvider && !hasProvider) ||
      (hasProvider && providerType === "null_provider" && tables.length === 0) ||
      (hasProvider && providerType !== "none" && tablesMissingMetadata.length === 0);

    return {
      component: input.component,
      tables,
      hasProvider,
      providerType,
      metadataDeclared,
      tablesMissingMetadata,
      ok,
      summary: ok
        ? "Privacy provider state matches the component's data footprint."
        : !hasProvider && needsProvider
          ? `Component declares ${tables.length} table(s) in install.xml but has no classes/privacy/provider.php.`
          : tablesMissingMetadata.length > 0
            ? `Provider missing add_database_table for: ${tablesMissingMetadata.join(", ")}.`
            : "Provider state needs manual review.",
    };
  },
};
