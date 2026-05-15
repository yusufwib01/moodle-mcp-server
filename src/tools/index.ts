import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";
import { listComponentFiles } from "./codebase/listComponentFiles.js";
import { searchFunctionDefinition } from "./codebase/searchFunctionDefinition.js";
import { traceCallPath } from "./codebase/traceCallPath.js";
import { getHooks } from "./codebase/getHooks.js";
import { findCapability } from "./codebase/findCapability.js";
import { findLangString } from "./codebase/findLangString.js";
import { getCodingGuidelines } from "./guidelines/getCodingGuidelines.js";
import { getDeprecationRules } from "./guidelines/getDeprecationRules.js";
import { getUpgradeNoteFormat } from "./guidelines/getUpgradeNoteFormat.js";
import { getFeatureScaffold } from "./feature/getFeatureScaffold.js";
import { findSimilarFeature } from "./feature/findSimilarFeature.js";
import { getDbSchema } from "./feature/getDbSchema.js";
import { getApiUsageExamples } from "./feature/getApiUsageExamples.js";
import { getBugContext } from "./feature/getBugContext.js";
import { analyzePatch } from "./feature/analyzePatch.js";
import { getBackportTargets } from "./feature/getBackportTargets.js";
import { getReviewChecklist } from "./clr/getReviewChecklist.js";
import { checkDeprecationUsage } from "./clr/checkDeprecationUsage.js";
import { getComponentOwner } from "./clr/getComponentOwner.js";
import { findSimilarImplementations } from "./clr/findSimilarImplementations.js";
import { checkPhpdocCompleteness } from "./clr/checkPhpdocCompleteness.js";
import { checkPrivacyProvider } from "./clr/checkPrivacyProvider.js";
import { getReviewContext } from "./jira/getReviewContext.js";
import { getIntegrationWorkflowHelpers } from "./jira/getIntegrationWorkflowHelpers.js";

export const allTools: ToolDefinition[] = [
  searchMoodleCodebase,
  readMoodleFile,
  listComponentFiles,
  searchFunctionDefinition,
  traceCallPath,
  getHooks,
  findCapability,
  findLangString,
  getCodingGuidelines,
  getDeprecationRules,
  getUpgradeNoteFormat,
  getFeatureScaffold,
  findSimilarFeature,
  getDbSchema,
  getApiUsageExamples,
  getBugContext,
  analyzePatch,
  getBackportTargets,
  getReviewChecklist,
  checkDeprecationUsage,
  getComponentOwner,
  findSimilarImplementations,
  checkPhpdocCompleteness,
  checkPrivacyProvider,
  getReviewContext,
  getIntegrationWorkflowHelpers,
];
