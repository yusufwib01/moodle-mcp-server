import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildToolDispatchers, toJsonSchema } from "../../src/tools/register.js";

describe("buildToolDispatchers", () => {
  it("lists tools with their schemas", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    expect(dispatchers.list()).toEqual([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: expect.any(Object),
      },
    ]);
  });

  it("validates and dispatches a tool call", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    const result = await dispatchers.call("echo", { message: "hi" });
    expect(result).toEqual({ text: "hi" });
  });

  it("rejects unknown tools", async () => {
    const dispatchers = buildToolDispatchers([]);
    await expect(dispatchers.call("nope", {})).rejects.toThrow(/unknown tool/i);
  });

  it("rejects invalid input", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    await expect(dispatchers.call("echo", { message: 123 })).rejects.toThrow();
  });

  it("toJsonSchema converts a Zod schema", () => {
    const schema = toJsonSchema(z.object({ a: z.string() }));
    expect(schema.type).toBe("object");
  });
});
