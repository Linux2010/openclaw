/**
 * Cron-process proof for PR #167585 / issue #167365.
 *
 * Runs the SHIPPED dist through the cron isolated-agent path:
 *   shipped gateway  ->  `openclaw cron add --session isolated`
 *     ->  `openclaw cron run <id> --wait --expect-final`
 *     ->  cron isolated-agent run (independent runtime-lease context;
 *         cannot borrow the Gateway registry, so the prepared model runtime
 *         snapshot stays scoped to provider/memory/harness owners)
 *     ->  embedded agent turn tool assembly (the modified path:
 *         resolveOpenClawPluginToolsForOptions with preparedModelRuntime)
 *
 * Issue #167365 mirrored config: tools.profile "coding" + tools.alsoAllow
 * [e2e_ping, e2e_echo] + plugins.entries.e2e-tools-plugin.enabled true.
 *
 * Expected BEFORE (pre-fix dist): the tool-only plugin's tools are omitted
 *   from the turn's tool table (tool_call rejected "not found"), and the
 *   cron allowlist preflight logs the false "unknown entries" warning.
 * Expected AFTER (fixed dist): e2e_ping is advertised, executed, and the
 *   marker "pong-e2e-167365" flows back into the final reply.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARKER_TOOL_RESULT,
  MARKER_FINAL,
  startE2eModelMock,
  createFixture,
} from "./fixture-167365.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const OPENCLAW_MJS = path.join(repoRoot, "openclaw.mjs");
const NODE_BIN = process.execPath;
const GW_TOKEN = "e2e-gw-token-167365";
const EXPECT = process.env.EXPECT === "after" ? "after" : "before";

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

const main = async () => {
  const mock = await startE2eModelMock();
  console.log(`mock model server on ${mock.baseUrl}`);

  const gatewayPort = 19700 + Math.floor(Math.random() * 200);
  const fixture = createFixture({
    baseUrl: mock.baseUrl,
    label: "cron167365",
    extraConfig: {
      models: {
        providers: {
          "e2e-provider": {
            baseUrl: mock.baseUrl,
            apiKey: "e2e-test-key",
            api: "openai-completions",
            models: [{ id: "e2e-model", name: "E2E Model", input: ["text"] }],
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
  console.log(`fixture root: ${fixture.root}`);

  const env = {
    ...process.env,
    OPENCLAW_CONFIG_PATH: fixture.configPath,
    OPENCLAW_STATE_DIR: fixture.stateDir,
    PATH: `/Users/hope/.nvm/versions/node/v26.5.1/bin:${process.env.PATH ?? ""}`,
  };

  console.log(`starting shipped gateway on port ${gatewayPort} ...`);
  const gwOut = path.join(fixture.root, "gateway-stdout.log");
  const gwErr = path.join(fixture.root, "gateway-stderr.log");
  const gwStdout = fs.openSync(gwOut, "a");
  const gwStderr = fs.openSync(gwErr, "a");
  const gateway = spawn(
    NODE_BIN,
    [OPENCLAW_MJS, "gateway", "--port", String(gatewayPort), "--allow-unconfigured"],
    { cwd: repoRoot, env, stdio: ["ignore", gwStdout, gwStderr], detached: false },
  );
  fs.closeSync(gwStdout);
  fs.closeSync(gwStderr);

  if (!(await waitForPort(gatewayPort, 90_000))) {
    check("gateway became ready", false, `see ${gwErr}`);
    console.log(fs.readFileSync(gwErr, "utf8").slice(-3000));
    mock.server.close();
    process.exit(1);
  }
  check("gateway became ready", true, `127.0.0.1:${gatewayPort}`);

  let jobId = null;
  try {
    // 1. add the one-shot isolated agent job via the shipped CLI
    console.log("adding isolated agent cron job ...");
    const add = await runCmd(
      [
        "cron",
        "add",
        "--at",
        "10m",
        "--session",
        "isolated",
        "--name",
        `proof-167365-${Date.now()}`,
        "--message",
        "Use the e2e_ping tool now, then reply with the literal tool result marker.",
        "--timeout-seconds",
        "180",
        "--keep-after-run",
        "--json",
        "--port",
        String(gatewayPort),
        "--token",
        GW_TOKEN,
      ],
      env,
      60_000,
    );
    fs.writeFileSync(path.join(fixture.root, "cron-add-stdout.txt"), add.stdout, "utf8");
    let addPayload = null;
    try {
      addPayload = JSON.parse(add.stdout);
    } catch {}
    jobId = addPayload?.job?.id ?? addPayload?.id ?? null;
    check("[1] cron add accepted", add.code === 0 && Boolean(jobId), `jobId=${jobId}`);
    if (!jobId) {
      console.log(add.stdout.slice(0, 600));
      process.exit(1);
    }

    // 2. run it now (debug run) and wait for the isolated agent turn
    console.log("running cron job now (--wait --expect-final) ...");
    const run = await runCmd(
      [
        "cron",
        "run",
        jobId,
        "--wait",
        "--expect-final",
        "--json",
        "--timeout",
        "240000",
        "--port",
        String(gatewayPort),
        "--token",
        GW_TOKEN,
      ],
      env,
      300_000,
    );
    fs.writeFileSync(path.join(fixture.root, "cron-run-stdout.txt"), run.stdout, "utf8");
    fs.writeFileSync(path.join(fixture.root, "cron-run-stderr.txt"), run.stderr, "utf8");

    let runPayload = null;
    try {
      runPayload = JSON.parse(run.stdout);
    } catch {}
    check("[2] cron run exit 0", run.code === 0, `exit=${run.code}`);
    // The isolated run's final agent text lands in run.summary (status may
    // still be "error" only because no chat channel is configured for delivery).
    const finalTextStr = String(
      runPayload?.run?.summary ?? runPayload?.final ?? runPayload?.result?.final ?? "",
    );
    console.log(
      `    run status: ${runPayload?.status ?? "?"} summary: ${finalTextStr.slice(0, 200)}`,
    );

    // 3. tool advertisement: dump every model request the mock saw
    const completionsSeen = mock.seen.filter((s) => s.route.includes("/chat/completions"));
    const turn0Tools = completionsSeen[0]?.toolNames ?? [];
    const seenDump = mock.seen.map((s, i) => ({
      turn: i,
      route: s.route,
      toolNames: s.toolNames,
      e2eTools: s.toolNames.filter((t) => t.startsWith("e2e")),
      bodyHead: s.body.slice(0, 200),
    }));
    fs.writeFileSync(
      path.join(fixture.root, "mock-seen.json"),
      JSON.stringify(seenDump, null, 2),
      "utf8",
    );
    console.log(
      `    mock requests: ${mock.seen.length}; turn0 tools(${turn0Tools.length}): ${turn0Tools.slice(0, 12).join(",")}${turn0Tools.length > 12 ? " ..." : ""}`,
    );
    const beforeExpectedTools =
      EXPECT === "before" ? !turn0Tools.includes("e2e_ping") : turn0Tools.includes("e2e_ping");
    check(
      `[3] ${EXPECT.toUpperCase()}: turn#1 tool table e2e_ping ${
        EXPECT === "before" ? "OMITTED (defect)" : "ADVERTISED (fix)"
      }`,
      beforeExpectedTools,
      `tools(${turn0Tools.length}): e2e=[${turn0Tools.filter((t) => t.startsWith("e2e")).join(",") || "none"}]`,
    );

    // 4. tool execution + marker flow-back
    if (EXPECT === "after") {
      const completion2 = completionsSeen[1]?.body ?? "";
      check(
        "[4] AFTER: tool executed, marker flowed back",
        completion2.includes(MARKER_TOOL_RESULT),
        completion2.includes(MARKER_TOOL_RESULT) ? `found ${MARKER_TOOL_RESULT}` : "no marker",
      );
      check(
        "[5] AFTER: final reply carries proof marker",
        finalTextStr.includes(MARKER_FINAL) && finalTextStr.includes(MARKER_TOOL_RESULT),
        finalTextStr.slice(0, 200),
      );
    } else {
      check(
        "[4] BEFORE: tool call rejected (no marker in conversation)",
        !(completionsSeen[1]?.body ?? "").includes(MARKER_TOOL_RESULT),
        (completionsSeen[1]?.body ?? "").includes(MARKER_TOOL_RESULT)
          ? "unexpectedly executed"
          : "rejected as expected",
      );
    }

    // 5. gateway log: false "unknown entries" warning from the cron allowlist preflight
    const gwLog = fs.readFileSync(gwErr, "utf8") + fs.readFileSync(gwOut, "utf8");
    fs.writeFileSync(path.join(fixture.root, "gateway-log-combined.txt"), gwLog, "utf8");
    const unknownLines = gwLog
      .split("\n")
      .filter((l) => /unknown entries/i.test(l) && /e2e_ping|e2e_echo/.test(l));
    if (EXPECT === "before") {
      check(
        '[5] BEFORE: false "unknown entries" warning logged',
        unknownLines.length > 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 280) : "no matching warning",
      );
    } else {
      check(
        '[5] AFTER: no false "unknown entries" warning',
        unknownLines.length === 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 280) : "clean",
      );
    }

    // 6. cleanup the job
    await runCmd(
      ["cron", "rm", jobId, "--json", "--port", String(gatewayPort), "--token", GW_TOKEN],
      env,
      30_000,
    );
  } finally {
    try {
      gateway.kill("SIGTERM");
      await wait(1500);
      if (gateway.exitCode === null) gateway.kill("SIGKILL");
    } catch {}
    mock.server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  process.exit(passed === results.length ? 0 : 1);
};

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(2);
});
