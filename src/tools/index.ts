import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";

export const allTools: ToolDefinition[] = [searchMoodleCodebase];
