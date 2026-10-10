/**
 * Source-level inventory probe for #167365: calls the exact plugin tool
 * resolution entry the embedded runner uses, against the shared fixture config,
 * and prints the resolved tool names.
 */
import { createFixture, startE2eModelMock } from "./fixture-167365.mjs";

const REPO = "/Users/hope/ai-project/openclaw";

const mock = await startE2eModelMock();
const fixture = createFixture({ baseUrl: mock.baseUrl, label: "probe" });
console.log(`fixture: ${fixture.root}`);

process.env.OPENCLAW_CONFIG_PATH = fixture.configPath;
process.env.OPENCLAW_STATE_DIR = fixture.stateDir;

const { setRuntimeConfigSnapshot } = await import(`${REPO}/src/config/config.js`);
setRuntimeConfigSnapshot(fixture.config);

const { resolveOpenClawPluginToolsForOptions } = await import(
  `${REPO}/src/agents/openclaw-plugin-tools.js`
);

try {
  const tools = resolveOpenClawPluginToolsForOptions({
    options: {
      config: fixture.config,
      workspaceDir: fixture.workspaceDir,
      agentId: "main",
    },
    resolvedConfig: fixture.config,
  });
  const names = tools.map((t) => t.name);
  console.log(`resolved ${names.length} plugin tools:`);
  console.log(names.join(", "));
  console.log(
    `e2e_ping present: ${names.includes("e2e_ping")} | e2e_echo present: ${names.includes("e2e_echo")}`,
  );
} catch (error) {
  console.log("probe failed:");
  console.log(error?.stack ?? String(error));
} finally {
  mock.server.close();
}
process.exit(0);
