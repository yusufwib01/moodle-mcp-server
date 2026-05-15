#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getServerConfig } from "./config.js";
import { assertRipgrepInstalled } from "./lib/ripgrep.js";
import { buildToolDispatchers } from "./tools/register.js";
import { allTools } from "./tools/index.js";
import { allResources, listResources, readResource } from "./resources/index.js";

async function main(): Promise<void> {
  getServerConfig();
  await assertRipgrepInstalled();

  const dispatchers = buildToolDispatchers(allTools);

  const server = new Server(
    { name: "moodle-context", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: dispatchers.list(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await dispatchers.call(request.params.name, request.params.arguments);
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(allResources),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
    contents: await readResource(allResources, request.params.uri),
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[moodle-mcp-server] fatal:", err);
  process.exit(1);
});
