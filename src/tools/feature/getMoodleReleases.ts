import { z } from "zod";
import { getReleases, snapshotSupport } from "../../lib/moodleReleases.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "asOf must be YYYY-MM-DD.")
    .optional()
    .describe("Date to compute support state for. Defaults to today."),
});

export const getMoodleReleases: ToolDefinition<typeof inputSchema> = {
  name: "get_moodle_releases",
  description:
    "Return the Moodle release support matrix: every tracked release with dates, plus which are currently in general support / security-only / EOL / future. Snapshot date defaults to today; pass asOf=YYYY-MM-DD to ask 'what was supported on...'.",
  inputSchema,
  async run(input) {
    const today = input.asOf ? new Date(input.asOf) : new Date();
    const snap = snapshotSupport(today);
    return {
      asOf: today.toISOString().slice(0, 10),
      releases: getReleases(),
      generalSupport: snap.generalSupport.map((r) => r.version),
      securityOnly: snap.securityOnly.map((r) => r.version),
      future: snap.future.map((r) => r.version),
      eol: snap.eol.map((r) => r.version),
      source: "https://moodledev.io/general/releases",
    };
  },
};
