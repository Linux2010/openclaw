import fs from "node:fs";
/**
 * Shared fixture builder for PR #167585 / issue #167365 proofs.
 * Creates a provider-owner plugin (runtime owner for the selected model) plus a
 * tool-only plugin (contracts.tools) whose tools must survive effective tool
 * inventory assembly, wired through one pinned config file.
 */
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

export const MARKER_TOOL_RESULT = "pong-e2e-167365";
export const MARKER_FINAL = "E2E-167365-PROOF";

/** Loopback OpenAI-compatible mock: completion turn 1 -> tool_call e2e_ping, turn 2 -> final text.
 *  Non-completion probes (GET /v1/models) are answered but not counted as turns. */
export async function startE2eModelMock() {
  const seen = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (!(req.method === "POST" && (req.url ?? "").includes("/chat/completions"))) {
        // model catalog probe
        seen.push({ route: `${req.method} ${req.url}`, toolNames: [], body });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ object: "list", data: [] }));
        return;
      }
      let payload = {};
      try {
        payload = JSON.parse(body);
      } catch {}
      const toolNames = (payload.tools ?? []).map((t) => t?.function?.name).filter(Boolean);
      seen.push({ route: `${req.method} ${req.url}`, toolNames, body });
      const turn = seen.filter((s) => s.route.includes("/chat/completions")).length - 1;
      const chunk = (delta, finishReason = null) => ({
        id: "chatcmpl-e2e-167365",
        object: "chat.completion.chunk",
        created: 1,
        model: "e2e-model",
        choices: [{ index: 0, delta, logprobs: null, finish_reason: finishReason }],
      });
      res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8" });
      const chunks = [];
      if (turn === 0) {
        chunks.push(
          chunk({
            tool_calls: [
              {
                id: "call_e2e_1",
                type: "function",
                function: { name: "e2e_ping", arguments: "{}" },
              },
            ],
          }),
          chunk({}, "tool_calls"),
        );
      } else {
        const executed = body.includes(MARKER_TOOL_RESULT);
        const echo = executed
          ? `tool result marker received: ${MARKER_TOOL_RESULT}`
          : "no tool result marker in conversation";
        chunks.push(chunk({ role: "assistant", content: `${MARKER_FINAL} ${echo}` }));
        chunks.push(chunk({}, "stop"));
      }
      for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return { port, baseUrl: `http://127.0.0.1:${port}/v1`, seen, server };
}

/** Materialize the two-plugin fixture and its pinned config. */
export function createFixture(params) {
  const {
    baseUrl,
    label = "fixture",
    extraConfig = {},
    // "static" (default): manifest declares discovery:"static" + models, so the
    //   model resolves without any lease. "none": no manifest catalog at all —
    //   the model resolves ONLY through prepareDynamicModel, which is what
    //   forces tools.effective's inventory lease to actually build.
    providerCatalog = "static",
  } = params;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `openclaw-e2e-${label}-`));
  const workspaceDir = path.join(root, "workspace");
  const stateDir = path.join(root, "state");
  const providerDir = path.join(root, "e2e-provider-plugin");
  const toolsDir = path.join(root, "e2e-tools-plugin");
  const configPath = path.join(root, "openclaw.json");
  for (const dir of [workspaceDir, stateDir, providerDir, toolsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const writeFile = (p, content) => fs.writeFileSync(p, content, "utf8");

  // provider-owner plugin: owns the selected model (runtime owner -> scoped generation)
  writeFile(
    path.join(providerDir, "package.json"),
    JSON.stringify(
      { name: "@e2e/provider-plugin", version: "1.0.0", openclaw: { extensions: ["./index.cjs"] } },
      null,
      2,
    ),
  );
  writeFile(
    path.join(providerDir, "openclaw.plugin.json"),
    JSON.stringify(
      {
        id: "e2e-provider-plugin",
        name: "E2E Provider Plugin",
        configSchema: { type: "object" },
        channels: [],
        providers: ["e2e-provider"],
        ...(providerCatalog === "static"
          ? {
              modelCatalog: {
                providers: {
                  "e2e-provider": {
                    discovery: "static",
                    api: "openai-completions",
                    baseUrl,
                    models: [{ id: "e2e-model", name: "E2E Model", input: ["text"] }],
                  },
                },
              },
            }
          : {}),
      },
      null,
      2,
    ),
  );
  writeFile(
    path.join(providerDir, "index.cjs"),
    `module.exports = {
  id: "e2e-provider-plugin",
  register(api) {
    require("node:fs").writeFileSync(${JSON.stringify(path.join(root, "provider-runtime-loaded.txt"))}, "loaded", "utf8");
    api.registerProvider({
      id: "e2e-provider",
      label: "E2E Provider",
      auth: [],
      async prepareSyntheticAuth() {
        return { apiKey: "e2e-test-key", source: "e2e-fixture", mode: "api-key" };
      },
      async prepareDynamicModel(ctx) {
        if (ctx.modelId !== "e2e-model") return undefined;
        return {
          id: ctx.modelId,
          name: "E2E Model",
          provider: ctx.provider,
          api: "openai-completions",
          baseUrl: ${JSON.stringify(baseUrl)},
          reasoning: false,
          input: ["text"],
          contextWindow: 8192,
          maxTokens: 1024,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        };
      },
    });
  },
};
`,
  );

  // tool-only plugin: the plugin whose tools must survive inventory assembly
  writeFile(
    path.join(toolsDir, "package.json"),
    JSON.stringify(
      { name: "@e2e/tools-plugin", version: "1.0.0", openclaw: { extensions: ["./index.cjs"] } },
      null,
      2,
    ),
  );
  writeFile(
    path.join(toolsDir, "openclaw.plugin.json"),
    JSON.stringify(
      {
        id: "e2e-tools-plugin",
        name: "E2E Tools Plugin",
        configSchema: { type: "object" },
        channels: [],
        providers: [],
        contracts: { tools: ["e2e_ping", "e2e_echo"] },
      },
      null,
      2,
    ),
  );
  writeFile(
    path.join(toolsDir, "index.cjs"),
    `module.exports = {
  id: "e2e-tools-plugin",
  register(api) {
    require("node:fs").writeFileSync(${JSON.stringify(path.join(root, "tools-plugin-runtime-loaded.txt"))}, "loaded", "utf8");
    api.registerTool({
      name: "e2e_ping",
      description: "Return a deterministic ping marker for e2e proof 167365.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => ({ content: [{ type: "text", text: "pong-e2e-167365" }] }),
    });
    api.registerTool({
      name: "e2e_echo",
      description: "Echo back the provided text.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        additionalProperties: false,
      },
      execute: async (params) => ({
        content: [{ type: "text", text: String(params?.text ?? "") }],
      }),
    });
  },
};
`,
  );

  const config = {
    agents: {
      defaults: {
        model: { primary: "e2e-provider/e2e-model" },
        workspace: workspaceDir,
      },
    },
    // Mirrors issue #167365's operator config: the coding profile with the
    // plugin tools explicitly granted via alsoAllow (the docs-recommended flow).
    tools: {
      toolSearch: false,
      profile: "coding",
      alsoAllow: ["e2e_ping", "e2e_echo"],
    },
    plugins: {
      load: { paths: [providerDir, toolsDir] },
      entries: {
        "e2e-provider-plugin": { enabled: true },
        "e2e-tools-plugin": { enabled: true },
      },
    },
    ...extraConfig,
  };
  writeFile(configPath, JSON.stringify(config, null, 2));
  return { root, workspaceDir, stateDir, providerDir, toolsDir, configPath, config };
}
