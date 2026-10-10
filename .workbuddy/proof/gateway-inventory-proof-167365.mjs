/**
 * Inventory-path proof for PR #167585 / issue #167365.
 *
 * Reproduces the issue's own shipped reproduction command:
 *   openclaw gateway call tools.effective --params '{"sessionKey":"agent:main:main"}' --json
 * against a SHIPPED gateway daemon built from this checkout (dist/).
 *
 * Issue #167365 mirrored config: tools.profile "coding" + tools.alsoAllow
 * [e2e_ping, e2e_echo] + plugins.entries.e2e-tools-plugin.enabled true.
 *
 * Expected BEFORE (pre-fix dist): tools.effective inventory OMITS the
 *   tool-only plugin's tools (e2e_ping/e2e_echo) because the scoped lease
 *   snapshot narrows onlyPluginIds to provider/memory/harness owners; gateway
 *   log emits the false "unknown entries" warning.
 * Expected AFTER (fixed dist): e2e_ping/e2e_echo appear in the plugin group.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startE2eModelMock, createFixture } from "./fixture-167365.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const OPENCLAW_MJS = path.join(repoRoot, "openclaw.mjs");
const NODE_BIN = process.execPath;
const GW_TOKEN = "e2e-gw-token-167365";
// EXPECT=before -> assert the defect (tools omitted + false warning)
// EXPECT=after  -> assert the fix (tools present + no warning)
// RESTART=1     -> after priming the session, restart the gateway and call
//                  tools.effective from the cold gateway (no turn published
//                  its lending registry yet) to bypass gateway lending.
const EXPECT = process.env.EXPECT === "after" ? "after" : "before";
const RESTART = process.env.RESTART === "1";

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
    label: "ginv167365",
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
  const startGateway = async (tag) => {
    const gwOut = path.join(fixture.root, `gateway-${tag}-stdout.log`);
    const gwErr = path.join(fixture.root, `gateway-${tag}-stderr.log`);
    const gwStdout = fs.openSync(gwOut, "a");
    const gwStderr = fs.openSync(gwErr, "a");
    const child = spawn(
      NODE_BIN,
      [OPENCLAW_MJS, "gateway", "--port", String(gatewayPort), "--allow-unconfigured"],
      { cwd: repoRoot, env, stdio: ["ignore", gwStdout, gwStderr], detached: false },
    );
    fs.closeSync(gwStdout);
    fs.closeSync(gwStderr);
    const ready = await waitForPort(gatewayPort, 90_000);
    return { child, ready, gwOut, gwErr };
  };
  const stopGateway = async (child) => {
    try {
      child.kill("SIGTERM");
      await wait(2000);
      if (child.exitCode === null) child.kill("SIGKILL");
    } catch {}
    await wait(1500);
  };

  let gateway = null;
  let gwErr = path.join(fixture.root, "gateway-1-stderr.log");
  let gwOut = path.join(fixture.root, "gateway-1-stdout.log");
  const first = await startGateway("1");
  if (!first.ready) {
    check("gateway became ready", false, `see ${first.gwErr}`);
    console.log(fs.readFileSync(first.gwErr, "utf8").slice(-3000));
    mock.server.close();
    process.exit(1);
  }
  gateway = first.child;
  check("gateway became ready", true, `127.0.0.1:${gatewayPort}`);

  try {
    // Establish the agent session (agent:main:main) with one real Gateway-first
    // turn; the mock serves tool_call on turn 0 and a final text afterwards.
    console.log("priming agent session via Gateway-first turn ...");
    const prime = await runCmd(
      [
        "agent",
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
    check("[0] priming agent turn exit 0", prime.code === 0, `exit=${prime.code}`);

    if (RESTART) {
      console.log("restarting gateway (cold lending window) ...");
      await stopGateway(gateway);
      const second = await startGateway("2");
      if (!second.ready) {
        check("restarted gateway became ready", false, `see ${second.gwErr}`);
        console.log(fs.readFileSync(second.gwErr, "utf8").slice(-3000));
        process.exit(1);
      }
      gateway = second.child;
      gwErr = second.gwErr;
      gwOut = second.gwOut;
      check("restarted gateway became ready", true);
    }

    // The issue's own reproduction command, run against the shipped gateway.
    console.log("running: openclaw gateway call tools.effective ...");
    const res = await runCmd(
      [
        "gateway",
        "call",
        "tools.effective",
        "--params",
        JSON.stringify({ sessionKey: "agent:main:main" }),
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

    check("[1] gateway call exit 0", res.code === 0, `exit=${res.code}`);
    const inv = payload?.value ?? payload;
    check(
      "[2] tools.effective returned a payload",
      Boolean(inv && Array.isArray(inv.groups)),
      inv ? `profile=${inv.profile} agentId=${inv.agentId}` : `stdout: ${res.stdout.slice(0, 300)}`,
    );

    const allToolIds = [];
    for (const g of inv?.groups ?? []) {
      for (const t of g.tools ?? []) allToolIds.push(`${g.id}/${t.id ?? t.name}`);
    }
    const has = (id) => allToolIds.some((entry) => entry.endsWith(`/${id}`));
    console.log(`    inventory tools (${allToolIds.length}): ${allToolIds.join(", ")}`);

    // THE defect assertion (issue #167365): tool-only plugin tools omitted.
    if (EXPECT === "before") {
      check(
        "[3] BEFORE: e2e_ping OMITTED from effective inventory (defect reproduced)",
        !has("e2e_ping"),
        has("e2e_ping") ? "unexpectedly present — no defect on this build" : "omitted as expected",
      );
      check(
        "[4] BEFORE: e2e_echo OMITTED from effective inventory (defect reproduced)",
        !has("e2e_echo"),
        has("e2e_echo") ? "unexpectedly present" : "omitted as expected",
      );
    } else {
      check(
        "[3] AFTER: e2e_ping present in effective inventory",
        has("e2e_ping"),
        has("e2e_ping") ? "" : "OMITTED — fix not effective on this path",
      );
      check(
        "[4] AFTER: e2e_echo present in effective inventory",
        has("e2e_echo"),
        has("e2e_echo") ? "" : "OMITTED — fix not effective on this path",
      );
    }

    // gateway log: the false "unknown entries" warning from the allowlist check
    const gwLog = fs.readFileSync(gwErr, "utf8") + fs.readFileSync(gwOut, "utf8");
    fs.writeFileSync(path.join(fixture.root, "gateway-log-combined.txt"), gwLog, "utf8");
    const unknownLines = gwLog
      .split("\n")
      .filter((l) => /unknown entries/i.test(l) && /e2e_ping|e2e_echo/.test(l));
    if (EXPECT === "before") {
      check(
        '[5] BEFORE: false "unknown entries" warning logged for e2e tools',
        unknownLines.length > 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 260) : "no matching warning line",
      );
    } else {
      check(
        '[5] AFTER: no false "unknown entries" warning for e2e tools',
        unknownLines.length === 0,
        unknownLines.length ? unknownLines[0].trim().slice(0, 260) : "clean",
      );
    }
  } finally {
    if (gateway) await stopGateway(gateway);
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
