import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";

export const allTools: ToolDefinition[] = [searchMoodleCodebase, readMoodleFile];
