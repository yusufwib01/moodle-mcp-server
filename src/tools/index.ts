import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";
import { listComponentFiles } from "./codebase/listComponentFiles.js";
import { searchFunctionDefinition } from "./codebase/searchFunctionDefinition.js";
import { traceCallPath } from "./codebase/traceCallPath.js";
import { getHooks } from "./codebase/getHooks.js";

export const allTools: ToolDefinition[] = [
  searchMoodleCodebase,
  readMoodleFile,
  listComponentFiles,
  searchFunctionDefinition,
  traceCallPath,
  getHooks,
];
