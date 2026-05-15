import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";
import { listComponentFiles } from "./codebase/listComponentFiles.js";
import { searchFunctionDefinition } from "./codebase/searchFunctionDefinition.js";
import { traceCallPath } from "./codebase/traceCallPath.js";
import { getHooks } from "./codebase/getHooks.js";
import { getCodingGuidelines } from "./guidelines/getCodingGuidelines.js";
import { getDeprecationRules } from "./guidelines/getDeprecationRules.js";
import { getUpgradeNoteFormat } from "./guidelines/getUpgradeNoteFormat.js";
import { getFeatureScaffold } from "./feature/getFeatureScaffold.js";
import { findSimilarFeature } from "./feature/findSimilarFeature.js";
import { getDbSchema } from "./feature/getDbSchema.js";
import { getApiUsageExamples } from "./feature/getApiUsageExamples.js";
import { getBugContext } from "./feature/getBugContext.js";

export const allTools: ToolDefinition[] = [
  searchMoodleCodebase,
  readMoodleFile,
  listComponentFiles,
  searchFunctionDefinition,
  traceCallPath,
  getHooks,
  getCodingGuidelines,
  getDeprecationRules,
  getUpgradeNoteFormat,
  getFeatureScaffold,
  findSimilarFeature,
  getDbSchema,
  getApiUsageExamples,
  getBugContext,
];
