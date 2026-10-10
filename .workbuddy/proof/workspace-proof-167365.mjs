/**
 * Workspace-mismatch red-light proof for PR #167585 / issue #167365.
 *
 * Scenario: a second agent ("worker") with its own workspace via agents.list.
 * The tools.effective handler resolves the lease workspace as
 *   spawnedWorkspaceDir ?? resolveAgentWorkspaceDir(cfg, agentId)
 * so the worker's lease workspace differs from the Gateway lending registry's
 * workspace. resolveLendingGatewayRegistry() then refuses to lend
 * (workspaceDir mismatch, see prepared-model-runtime.inbound-registry.ts) and
 * the lease builds a scoped prepared snapshot containing only provider/memory/
 * harness owners. The tool-only plugin (e2e-tools-plugin) then survives
 * inventory assembly ONLY through this PR's snapshot promotion fix.
 *
 * Expected BEFORE (pre-fix dist): worker turn tool table omits e2e tools and
 *   the tool call is rejected ("Tool e2e_ping not found"); the worker's
 *   tools.effective inventory OMITS e2e_ping/e2e_echo (the issue symptom).
 * Expected AFTER (fixed dist): tools present in both, marker flows back.
 *
 * Usage: EXPECT=after node workspace-proof-167365.mjs   (default: before)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  startE2eModelMock,
  createFixture,
  MARKER_TOOL_RESULT,
  MARKER_FINAL,
} from "./fixture-167365.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const OPENCLAW_MJS = path.join(repoRoot, "openclaw.mjs");
const NODE_BIN = process.execPath;
const GW_TOKEN = "e2e-gw-token-167365";
const EXPECT = process.env.EXPECT === "after" ? "after" : "before";
const RESTART = process.env.RESTART === "1";
// SRC=1: run the gateway from the source tree via tsx (diagnostic mode).
const SRC = process.env.SRC === "1";
const WORKER = "worker";

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "ok" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise((resolve) => {
      const sock = net.connect({ host: "127.0.0.1", port }, () => {
        sock.destroy();
        resolve(true);
      });
      sock.on("error", () => resolve(false));
      sock.setTimeout(1500, () => {
        sock.destroy();
        resolve(false);
      });
    });
    if (open) return true;
    await wait(500);
  }
  return false;
}

function runCmd(args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [OPENCLAW_MJS, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const completionsSeen = (mock) => mock.seen.filter((s) => s.route.includes("/chat/completions"));

const main = async () => {
  const mock = await startE2eModelMock();
  console.log(`mock model server on ${mock.baseUrl}`);

  const gatewayPort = 19900 + Math.floor(Math.random() * 200);
  const fixture = createFixture({
    baseUrl: mock.baseUrl,
    label: `gws167365`,
    // No static manifest catalog: the session model must resolve ONLY through
    // the plugin's prepareDynamicModel hook, otherwise tools.effective's
    // static model resolution short-circuits and never builds the scoped lease.
    providerCatalog: "none",
    extraConfig: {
      models: {
        providers: {
          // Schema requires custom providers to declare models, so declare a
          // DECOY id; the session model (e2e-model) is intentionally absent
          // from every static catalog.
          "e2e-provider": {
            baseUrl: mock.baseUrl,
            apiKey: "e2e-test-key",
            api: "openai-completions",
            models: [{ id: "e2e-decoy-model", name: "E2E Decoy", input: ["text"] }],
          },
        },
      },
      gateway: {
        mode: "local",
        port: gatewayPort,
        bind: "loopback",
        auth: { mode: "token", token: GW_TOKEN },
      },
    },
  });
  // Second agent with its OWN workspace (differs from agents.defaults.workspace
  // -> differs from the Gateway lending registry's workspace).
  const workerWorkspace = path.join(fixture.root, "ws-worker");
  fs.mkdirSync(workerWorkspace, { recursive: true });
  fixture.config.agents.entries = { [WORKER]: { workspace: workerWorkspace } };
  fs.writeFileSync(fixture.configPath, JSON.stringify(fixture.config, null, 2), "utf8");
  console.log(`fixture root: ${fixture.root}`);
  console.log(`worker workspace: ${workerWorkspace}`);

  const env = {
    ...process.env,
    OPENCLAW_CONFIG_PATH: fixture.configPath,
    OPENCLAW_STATE_DIR: fixture.stateDir,
    PATH: `/Users/hope/.nvm/versions/node/v26.5.1/bin:${process.env.PATH ?? ""}`,
  };

  console.log(`starting shipped gateway on port ${gatewayPort} ...`);
  const startGateway = (tag) => {
    const out = path.join(fixture.root, `gateway-${tag}-stdout.log`);
    const err = path.join(fixture.root, `gateway-${tag}-stderr.log`);
    const stdoutFd = fs.openSync(out, "a");
    const stderrFd = fs.openSync(err, "a");
    const gatewayArgs = SRC
      ? [
          "--import",
          "./scripts/tsx.mjs",
          "src/entry.ts",
          "gateway",
          "--port",
          String(gatewayPort),
          "--allow-unconfigured",
        ]
      : [OPENCLAW_MJS, "gateway", "--port", String(gatewayPort), "--allow-unconfigured"];
    const child = spawn(NODE_BIN, gatewayArgs, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", stdoutFd, stderrFd],
      detached: false,
    });
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);
    return { child, out, err };
  };
  const stopGateway = async (child) => {
    try {
      child.kill("SIGTERM");
      await wait(2000);
      if (child.exitCode === null) child.kill("SIGKILL");
    } catch {}
    await wait(1500);
  };

  let { child: gateway, out: gwOut, err: gwErr } = startGateway("1");
  const gwReady = await waitForPort(gatewayPort, 90_000);
  if (!gwReady) {
    check("gateway became ready", false, `see ${gwErr}`);
    console.log(fs.readFileSync(gwErr, "utf8").slice(-3000));
    mock.server.close();
    process.exit(1);
  }
  check("gateway became ready", true, `127.0.0.1:${gatewayPort}`);

  try {
    // 1. Prime the worker session with one real Gateway-first agent turn.
    //    The mock serves tool_call e2e_ping on completions turn 0 and a final
    //    text that reports whether the tool result marker came back.
    console.log(`priming ${WORKER} agent session via Gateway-first turn ...`);
    const prime = await runCmd(
      [
        "agent",
        "--agent",
        WORKER,
        "--json",
        "--timeout",
        "180",
        "-m",
        "Use the e2e_ping tool now, then reply with the literal tool result marker.",
      ],
      env,
      240_000,
    );
    fs.writeFileSync(path.join(fixture.root, "prime-stdout.txt"), prime.stdout, "utf8");
    fs.writeFileSync(path.join(fixture.root, "prime-stderr.txt"), prime.stderr, "utf8");
    check("[1] priming worker turn exit 0", prime.code === 0, `exit=${prime.code}`);

    let primeEnvelope = null;
    try {
      primeEnvelope = JSON.parse(prime.stdout);
    } catch {}
    const primeFinal = String(primeEnvelope?.final ?? "");
    console.log(
      `    prime status=${primeEnvelope?.status ?? "?"} final: ${primeFinal.slice(0, 140)}`,
    );
    console.log(`    toolSummary: ${JSON.stringify(primeEnvelope?.toolSummary ?? null)}`);

    // The priming turn publishes its workspace-scoped registry generation into
    // the process-wide gateway request scope, which would let the subsequent
    // lease borrow a matching full registry. RESTART=1 clears that: the cold
    // gateway's startup registry is bound to the MAIN workspace, so the
    // worker's lease (agents.entries workspace) can no longer borrow and must
    // build a scoped generation — exactly the defect surface.
    let leaseWindow = "warm (turn-published registry in scope)";
    if (RESTART) {
      console.log("restarting gateway (cold lending window for the worker workspace) ...");
      await stopGateway(gateway);
      const second = startGateway("2");
      const ready2 = await waitForPort(gatewayPort, 90_000);
      if (!ready2) {
        check("restarted gateway became ready", false, `see ${second.err}`);
        console.log(fs.readFileSync(second.err, "utf8").slice(-3000));
        mock.server.close();
        process.exit(1);
      }
      gateway = second.child;
      gwOut = second.out;
      gwErr = second.err;
      leaseWindow = "cold restart (startup registry = main workspace)";
      check("[1b] restarted gateway became ready", true);
    }
    console.log(`    lease window: ${leaseWindow}`);

    // 2. Dump what the model actually saw.
    const comps = completionsSeen(mock);
    const dump = comps.map((s, i) => ({
      turn: i,
      toolCount: s.toolNames.length,
      e2eTools: s.toolNames.filter((t) => t.startsWith("e2e")),
      hasMarkerInConversation: s.body.includes(MARKER_TOOL_RESULT),
    }));
    fs.writeFileSync(
      path.join(fixture.root, "mock-completions.json"),
      JSON.stringify(dump, null, 2),
      "utf8",
    );
    console.log(`    completions requests: ${comps.length} ${JSON.stringify(dump)}`);

    const turn0 = comps[0]?.toolNames ?? [];
    const turn1Body = comps[1]?.body ?? "";
    if (EXPECT === "before") {
      check(
        "[2] BEFORE: worker turn tool table OMITS e2e_ping (scoped narrowing reached a shipped turn)",
        !turn0.includes("e2e_ping"),
        turn0.includes("e2e_ping")
          ? "unexpectedly advertised"
          : `turn0 tools=${turn0.length}, e2e omitted`,
      );
      check(
        "[3] BEFORE: e2e_ping tool call REJECTED (marker never reached conversation)",
        !turn1Body.includes(MARKER_TOOL_RESULT),
        turn1Body.includes(MARKER_TOOL_RESULT)
          ? "unexpectedly executed"
          : `final: ${primeFinal.slice(0, 120)}`,
      );
    } else {
      check(
        "[2] AFTER: worker turn tool table includes e2e_ping",
        turn0.includes("e2e_ping"),
        `turn0 tools=${turn0.length}`,
      );
      check(
        "[3] AFTER: e2e_ping executed, marker flowed back into conversation",
        turn1Body.includes(MARKER_TOOL_RESULT),
        turn1Body.includes(MARKER_TOOL_RESULT)
          ? "tool result reached the model conversation"
          : `final: ${primeFinal.slice(0, 120)}`,
      );
    }

    // 3. The issue's own reproduction command for the WORKER session, whose
    //    lease workspace (agents.list[].workspace) mismatches the Gateway's
    //    lending registry workspace. A restarted gateway finishes agent
    //    database inspection after the listener binds, so retry while it
    //    reports inspection-pending.
    console.log("running: openclaw gateway call tools.effective (worker session) ...");
    let res = null;
    for (let attempt = 1; attempt <= 20; attempt++) {
      res = await runCmd(
        [
          "gateway",
          "call",
          "tools.effective",
          "--params",
          JSON.stringify({ sessionKey: `agent:${WORKER}:main` }),
          "--token",
          GW_TOKEN,
          "--port",
          String(gatewayPort),
          "--json",
          "--timeout",
          "60000",
        ],
        env,
        90_000,
      );
      if (
        res.code === 0 ||
        !/inspection-pending|UNAVAILABLE|has not completed startup/i.test(res.stdout)
      ) {
        break;
      }
      console.log(`    attempt ${attempt}: agent inspection pending, retrying ...`);
      await wait(3000);
    }
    fs.writeFileSync(path.join(fixture.root, "call-stdout.txt"), res.stdout, "utf8");
    fs.writeFileSync(path.join(fixture.root, "call-stderr.txt"), res.stderr, "utf8");

    let payload = null;
    try {
      payload = JSON.parse(res.stdout);
    } catch {
      const lines = res.stdout.split("\n").filter((l) => l.trim().startsWith("{"));
      for (const line of lines.reverse()) {
        try {
          payload = JSON.parse(line);
          break;
        } catch {}
      }
    }

    check(
      "[4] gateway call exit 0",
      res.code === 0,
      `exit=${res.code} stderr=${res.stderr.slice(0, 160)}`,
    );
    const inv = payload?.value ?? payload;
    check(
      "[5] tools.effective returned a payload",
      Boolean(inv && Array.isArray(inv.groups)),
      inv ? `agentId=${inv.agentId}` : `stdout: ${res.stdout.slice(0, 240)}`,
    );

    const allToolIds = [];
    for (const g of inv?.groups ?? []) {
      for (const t of g.tools ?? []) allToolIds.push(`${g.id}/${t.id ?? t.name}`);
    }
    const has = (id) => allToolIds.some((entry) => entry.endsWith(`/${id}`));
    console.log(`    inventory tools (${allToolIds.length})`);

    if (EXPECT === "before") {
      check(
        "[6] BEFORE: inventory OMITS e2e_ping (defect reproduced, workspace-mismatch lease)",
        !has("e2e_ping"),
        has("e2e_ping") ? "unexpectedly present" : "omitted as expected",
      );
      check(
        "[7] BEFORE: inventory OMITS e2e_echo",
        !has("e2e_echo"),
        has("e2e_echo") ? "unexpectedly present" : "omitted as expected",
      );
    } else {
      check(
        "[6] AFTER: inventory includes e2e_ping",
        has("e2e_ping"),
        has("e2e_ping") ? "" : "OMITTED — fix not effective on this path",
      );
      check(
        "[7] AFTER: inventory includes e2e_echo",
        has("e2e_echo"),
        has("e2e_echo") ? "" : "OMITTED — fix not effective on this path",
      );
    }

    // 4. False "unknown entries" warning for the allowlisted plugin tools.
    const gwLog = fs.readFileSync(gwErr, "utf8") + fs.readFileSync(gwOut, "utf8");
    fs.writeFileSync(path.join(fixture.root, "gateway-log-combined.txt"), gwLog, "utf8");
    const unknownLines = gwLog
      .split("\n")
      .filter((l) => /unknown entries/i.test(l) && /e2e_ping|e2e_echo/.test(l));
    if (EXPECT === "before") {
      check(
        '[8] BEFORE: false "unknown entries" warning logged',
        unknownLines.length > 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 240) : "no matching warning",
      );
    } else {
      check(
        '[8] AFTER: no false "unknown entries" warning',
        unknownLines.length === 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 240) : "clean",
      );
    }
  } finally {
    try {
      gateway.kill("SIGTERM");
      await wait(1500);
      if (gateway.exitCode === null) gateway.kill("SIGKILL");
    } catch {}
    mock.server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} checks passed (EXPECT=${EXPECT}) ===`);
  process.exit(passed === results.length ? 0 : 1);
};

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(2);
});
