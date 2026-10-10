/**
 * In-process scoped-generation red/green proof for PR #167585 / issue #167365.
 *
 * Runs the REAL resolver (src/plugins/tools.ts resolvePluginTools) with a REAL
 * scoped prepared runtime and the REAL missing-owner loader (loadPluginRegistryHandle
 * -> loadOpenClawPlugins): no vi.mock anywhere. Mirrors the production shape the
 * unit test in src/plugins/tools.scoped-generation.test.ts covers:
 *   1. load the full metadata snapshot through the real snapshot owner,
 *   2. project it down to the selected runtime owner (provider plugin),
 *   3. call resolvePluginTools with that scoped snapshot as preparedRuntime,
 *   4. the missing tool-only owner must be cold-loaded through the real loader.
 *
 * TOOLS_MODULE env var selects the resolver build:
 *   fixed  -> <repo>/src/plugins/tools.ts (this branch)
 *   prefix -> same path on a tree where tools.ts is reverted to main.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "/Users/hope/ai-project/openclaw";
const PROOF = path.join(REPO, ".workbuddy/proof");
const { startE2eModelMock, createFixture } = await import(path.join(PROOF, "fixture-167365.mjs"));

const BUILD = process.env.TOOLS_BUILD ?? "fixed";
const toolsModule = process.env.TOOLS_MODULE;
if (!toolsModule) {
  console.error("TOOLS_MODULE env var is required");
  process.exit(2);
}

console.log(`=== in-process scoped-generation proof (build=${BUILD}) ===`);
console.log(`resolver module: ${toolsModule}`);

const mock = await startE2eModelMock();
console.log(`mock model server on ${mock.baseUrl}/v1`);

const fx = createFixture({
  baseUrl: mock.baseUrl,
  label: `inproc167365-${BUILD}`,
  providerCatalog: "static",
});
process.env.OPENCLAW_STATE_DIR = fx.stateDir;
const cfg = JSON.parse(fs.readFileSync(fx.configPath, "utf8"));
const workspaceDir = fx.workspaceDir;
console.log(`fixture root: ${fx.root}`);
console.log(`plugins.load.paths: ${JSON.stringify(cfg.plugins.load.paths)}`);
console.log(`tools.alsoAllow: ${JSON.stringify(cfg.tools.alsoAllow)}`);

const logger = {
  info: (...a) => console.log("[logger.info]", ...a),
  warn: (...a) => console.log("[logger.warn]", ...a),
  error: (...a) => console.log("[logger.error]", ...a),
  debug: (...a) => console.log("[logger.debug]", ...a),
};

const { adoptProcessPluginCache, createPluginCache } = await import(
  path.join(REPO, "src/plugins/plugin-cache.ts")
);
adoptProcessPluginCache(createPluginCache());

const { loadManifestMetadataSnapshot } = await import(
  path.join(REPO, "src/plugins/manifest-contract-eligibility.ts")
);
const { projectPluginMetadataSnapshot } = await import(
  path.join(REPO, "src/plugins/plugin-metadata-snapshot.ts")
);
const { loadPluginRegistryHandle } = await import(path.join(REPO, "src/plugins/loader.ts"));
const snapshotSupport = await import(
  path.join(REPO, "src/plugins/current-plugin-metadata.test-support.ts")
);

// 1. Full metadata snapshot through the real snapshot owner (real manifest
//    discovery over the fixture's two plugin dirs).
const fullSnapshot = loadManifestMetadataSnapshot({ config: cfg, workspaceDir, env: process.env });
const fullIds = fullSnapshot.plugins.map((p) => p.id);
console.log(`[1] full metadata snapshot plugins (${fullIds.length}): ${JSON.stringify(fullIds)}`);
if (!fullIds.includes("e2e-provider-plugin") || !fullIds.includes("e2e-tools-plugin")) {
  console.error("[FAIL] fixture plugins missing from full snapshot");
  process.exit(1);
}

// 2. Production narrowing: project the generation down to the selected runtime
//    owner (the provider plugin that owns the session model).
const scopedSnapshot = projectPluginMetadataSnapshot(fullSnapshot, ["e2e-provider-plugin"]);
const scopedIds = scopedSnapshot.plugins.map((p) => p.id);
console.log(`[2] scoped generation plugins: ${JSON.stringify(scopedIds)}`);
if (scopedIds.includes("e2e-tools-plugin")) {
  console.error("[FAIL] tool-only plugin unexpectedly inside scoped generation");
  process.exit(1);
}
snapshotSupport.setCurrentPluginMetadataSnapshot(scopedSnapshot, {
  config: cfg,
  env: process.env,
  workspaceDir,
});

// Real runtime-owner registry (provider owner only), loaded by the real loader.
const runtimeRegistry = loadPluginRegistryHandle({
  config: cfg,
  activationSourceConfig: cfg,
  workspaceDir,
  env: process.env,
  logger,
  onlyPluginIds: ["e2e-provider-plugin"],
  toolDiscovery: true,
  activate: false,
});
const runtimeIds = (runtimeRegistry.plugins ?? []).map((p) => p.id);
console.log(`[3] runtime-owner registry (real loader): ${JSON.stringify(runtimeIds)}`);

const loadContext = {
  rawConfig: cfg,
  config: cfg,
  activationSourceConfig: cfg,
  autoEnabledReasons: {},
  workspaceDir,
  env: process.env,
  logger,
  manifestRegistry: scopedSnapshot.manifestRegistry,
  metadataSnapshot: scopedSnapshot,
  installRecords: {},
};

// 4. Real resolver with the scoped prepared runtime.
const { resolvePluginTools } = await import(toolsModule);
let toolNames = [];
try {
  const resolved = resolvePluginTools({
    context: { config: cfg, workspaceDir, logger },
    toolAllowlist: ["e2e_ping", "e2e_echo"],
    allowGatewaySubagentBinding: true,
    runtimeRegistry,
    preparedRuntime: {
      loadContext,
      metadataSnapshot: scopedSnapshot,
      registry: runtimeRegistry,
    },
  });
  toolNames = (resolved ?? []).map((t) => t.name).toSorted();
} catch (error) {
  console.error(`[FAIL] resolvePluginTools threw: ${error?.stack ?? error}`);
  process.exit(1);
}

console.log(`[4] resolved plugin tools (${toolNames.length}): ${JSON.stringify(toolNames)}`);

const hasPing = toolNames.includes("e2e_ping");
const hasEcho = toolNames.includes("e2e_echo");
let failed = false;
if (BUILD === "fixed") {
  console.log(
    `[${hasPing ? "ok" : "FAIL"}] FIXED: e2e_ping ${hasPing ? "PRESENT in" : "OMITTED from"} resolved tools`,
  );
  console.log(
    `[${hasEcho ? "ok" : "FAIL"}] FIXED: e2e_echo ${hasEcho ? "PRESENT in" : "OMITTED from"} resolved tools`,
  );
  failed = !hasPing || !hasEcho;
} else {
  console.log(
    `[${!hasPing ? "ok" : "FAIL"}] PRE-FIX (defect #167365): e2e_ping ${hasPing ? "unexpectedly PRESENT" : "OMITTED from resolved tools"}`,
  );
  console.log(
    `[${!hasEcho ? "ok" : "FAIL"}] PRE-FIX (defect #167365): e2e_echo ${hasEcho ? "unexpectedly PRESENT" : "OMITTED from resolved tools"}`,
  );
  failed = hasPing || hasEcho;
}
console.log(
  failed ? `=== verdict: FAIL (build=${BUILD}) ===` : `=== verdict: PASS (build=${BUILD}) ===`,
);
process.exit(failed ? 1 : 0);
