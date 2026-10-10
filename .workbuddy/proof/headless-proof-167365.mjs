import { spawn } from "node:child_process";
import fs from "node:fs";
/**
 * Shipped headless proof for PR #167585 (fixes #167365).
 *
 * Runs the SHIPPED dist CLI (`openclaw agent exec`) against a fixture with:
 *  - provider-owner plugin (e2e-provider-plugin): owns the selected model, which
 *    creates the runtime-owner-scoped prepared generation that triggered #167365.
 *  - tool-only plugin (e2e-tools-plugin): contracts.tools = [e2e_ping, e2e_echo];
 *    its tools must survive effective tool inventory assembly (the fixed path).
 *
 * A loopback OpenAI-compatible mock (SSE) completes the agent turn:
 *  - completion #1: scripted tool_call e2e_ping
 *  - completion #2: final text echoing whether the tool result marker came back
 *
 * Verdict PASS requires:
 *  1. envelope status ok
 *  2. completion #1 advertised BOTH e2e_ping and e2e_echo in the tools array
 *  3. completion #2 carried the exact tool result marker (tool truly executed)
 *  4. final text contains the proof marker; toolSummary.calls >= 1
 *
 * Usage: node headless-proof-167365.mjs [AFTER|BEFORE]
 *   AFTER  = expect tools present + executed (fix active)
 *   BEFORE = expect tools missing from completion #1 (red light)
 */
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

const REPO = "/Users/hope/ai-project/openclaw";
const NODE = "/Users/hope/.nvm/versions/node/v26.5.1/bin/node";
const MARKER_TOOL_RESULT = "pong-e2e-167365";
const MARKER_FINAL = "E2E-167365-PROOF";
const label = process.argv[2] === "BEFORE" ? "BEFORE" : "AFTER";

// ---------------------------------------------------------------- mock server
const seen = []; // per-completion capture: { route, toolNames, body }
const server = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let payload = {};
    try {
      payload = JSON.parse(body);
    } catch {}
    const toolNames = (payload.tools ?? []).map((t) => t?.function?.name).filter(Boolean);
    seen.push({ route: `${req.method} ${req.url}`, toolNames, body });
    const turn = seen.length - 1;
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
      chunks.push(
        chunk({
          role: "assistant",
          content: `${MARKER_FINAL} ${echo}`,
        }),
        chunk({}, "stop"),
      );
    }
    for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
    res.end("data: [DONE]\n\n");
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/v1`;

// ------------------------------------------------------------- fixture layout
const root = fs.mkdtempSync(path.join(os.tmpdir(), `openclaw-headless-${label.toLowerCase()}-`));
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
      // DYNAMIC=1: no manifest catalog at all — the model resolves ONLY through
      // prepareDynamicModel, which forces the embedded runner to build a scoped
      // prepared runtime (no Gateway registry to borrow in headless exec).
      ...(process.env.DYNAMIC === "1"
        ? {}
        : {
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
          }),
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

// config: pin model + plugins; workspace is a scratch dir
writeFile(
  configPath,
  JSON.stringify(
    {
      agents: {
        defaults: {
          model: { primary: "e2e-provider/e2e-model" },
          workspace: workspaceDir,
        },
      },
      tools: {
        toolSearch: false,
        profile: "coding",
        alsoAllow: ["e2e_ping", "e2e_echo"],
      },
      models: {
        providers: {
          "e2e-provider": {
            baseUrl,
            apiKey: "e2e-test-key",
            api: "openai-completions",
            // DYNAMIC=1: decoy model id only — the session model (e2e-model)
            // must be absent from every static catalog so the runner builds
            // the runtime-owner-scoped prepared generation.
            models:
              process.env.DYNAMIC === "1"
                ? [{ id: "e2e-decoy-model", name: "E2E Decoy", input: ["text"] }]
                : [{ id: "e2e-model", name: "E2E Model", input: ["text"] }],
          },
        },
      },
      plugins: {
        load: { paths: [providerDir, toolsDir] },
        entries: {
          "e2e-provider-plugin": { enabled: true },
          "e2e-tools-plugin": { enabled: true },
        },
      },
    },
    null,
    2,
  ),
);

// ---------------------------------------------- seed auth profile (non-interactive)
// NOTE: `models auth paste-api-key` is blocked on hosts with an installed Gateway
// service (state-store divergence guard refuses isolated stores). The credential
// is supplied inline via config models.providers[].apiKey instead, which the auth
// resolver accepts through resolveUsableCustomProviderApiKey.
const seed = { status: "skipped (config inline apiKey)" };
console.log(`auth seed: ${seed.status}`);

// ------------------------------------------------- spawn the SHIPPED headless CLI
const argv = [
  path.join(REPO, "openclaw.mjs"),
  "agent",
  "exec",
  "--config",
  configPath,
  "--state-dir",
  stateDir,
  "--json",
  "--timeout",
  "180",
  "Call the e2e_ping tool once and report its exact result text.",
];
const child = spawn(NODE, argv, {
  cwd: REPO,
  env: {
    ...process.env,
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_NO_DAEMON: "1",
  },
});
let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => (stdout += d));
child.stderr.on("data", (d) => (stderr += d));
const exitCode = await new Promise((resolve) => child.on("close", resolve));

// ------------------------------------------------------------------- verdict
let envelope = null;
try {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start >= 0 && end > start) envelope = JSON.parse(stdout.slice(start, end + 1));
} catch {}

const first = seen[0] ?? { toolNames: [] };
const second = seen[1] ?? { body: "" };
const checks = {
  "exit code 0": exitCode === 0,
  "envelope status ok": envelope?.status === "ok",
  "completion#1 advertised e2e_ping": first.toolNames.includes("e2e_ping"),
  "completion#1 advertised e2e_echo": first.toolNames.includes("e2e_echo"),
  "completion#2 carried tool result marker": second.body.includes(MARKER_TOOL_RESULT),
  "final text contains proof marker": (envelope?.final ?? "").includes(MARKER_FINAL),
  "toolSummary.calls >= 1": (envelope?.toolSummary?.calls ?? 0) >= 1,
};
const passed = Object.values(checks).every(Boolean);
const redLight = !first.toolNames.includes("e2e_ping") && !first.toolNames.includes("e2e_echo");

const verdict =
  label === "AFTER"
    ? passed
      ? "PASS"
      : "FAIL"
    : redLight
      ? "PASS (expected red light reproduced)"
      : "FAIL (tools unexpectedly present in BEFORE)";

console.log("=".repeat(72));
console.log(`HEADLESS SHIPPED PROOF #167365 — ${label}`);
console.log("=".repeat(72));
console.log(`fixture root   : ${root}`);
console.log(`mock server    : ${baseUrl}`);
console.log(`cli exit code  : ${exitCode}`);
console.log(
  `runtime markers: provider=${fs.existsSync(path.join(root, "provider-runtime-loaded.txt"))} tools=${fs.existsSync(path.join(root, "tools-plugin-runtime-loaded.txt"))}`,
);
console.log(`verdict        : ${verdict}`);
console.log("-".repeat(72));
console.log("checks:");
for (const [name, ok] of Object.entries(checks)) {
  console.log(`  [${ok ? "x" : " "}] ${name}`);
}
console.log("-".repeat(72));
console.log("completions observed by mock server:");
seen.forEach((r, i) => {
  console.log(
    `  #${i + 1} ${r.route} tools=[${r.toolNames.join(", ")}] markerInMessages=${r.body.includes(MARKER_TOOL_RESULT)}`,
  );
});
console.log("-".repeat(72));
for (const [i, r] of seen.entries()) {
  let msgs = [];
  try {
    msgs = JSON.parse(r.body).messages ?? [];
  } catch {}
  const toolMsgs = msgs.filter((m) => m.role === "tool");
  if (toolMsgs.length > 0) {
    console.log(`completion #${i + 1} tool messages:`);
    for (const m of toolMsgs) {
      console.log(`  ${JSON.stringify(m).slice(0, 600)}`);
    }
  }
}
console.log("-".repeat(72));
if (envelope) {
  const brief = {
    ok: envelope.ok,
    status: envelope.status,
    final: envelope.final,
    toolSummary: envelope.toolSummary,
    model: envelope.model,
    provider: envelope.provider,
    error: envelope.error,
  };
  console.log("envelope (trimmed):");
  console.log(JSON.stringify(brief, null, 2));
} else {
  console.log("envelope: NOT PARSED");
  console.log(`stdout (${stdout.length} bytes): ${stdout.slice(0, 800)}`);
}
if (stderr.trim()) {
  console.log("-".repeat(72));
  console.log(`stderr (tail):`);
  console.log(stderr.trim().split("\n").slice(-12).join("\n"));
}
server.close();
process.exit(verdict.startsWith("PASS") ? 0 : 1);
