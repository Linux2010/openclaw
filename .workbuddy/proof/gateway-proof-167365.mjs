/**
 * Gateway-path proof for PR #167585 / issue #167365.
 *
 * Runs the SHIPPED dist through the modified path:
 *   shipped gateway (daemon)  ->  `openclaw agent` (Gateway-first turn)
 *     -> gateway agent-run admission (scoped runtimePluginSelections)
 *     -> prepared model runtime lease  ->  plugin tool discovery
 *
 * Issue #167365 scenario mirrored in fixture config:
 *   tools.profile "coding" + tools.alsoAllow [e2e_ping, e2e_echo]
 *   + plugins.entries.e2e-tools-plugin.enabled true
 *
 * Expected AFTER (fixed): e2e tools advertised to the model, tool executed,
 *   marker "pong-e2e-167365" flows back, final reply contains E2E-167365-PROOF.
 * Expected BEFORE (pre-fix): e2e tools missing from the scoped inventory
 *   (tool-only plugin never loaded), tool call rejected ("not found"),
 *   no marker in final reply.
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
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const main = async () => {
  // 1. mock model server
  const mock = await startE2eModelMock();
  console.log(`mock model server on ${mock.baseUrl}`);

  // 2. fixture (issue-mirrored config) + gateway section
  const gatewayPort = 19700 + Math.floor(Math.random() * 200);
  const fixture = createFixture({
    baseUrl: mock.baseUrl,
    label: "gw167365",
    extraConfig: {
      // Inline provider credential (same shape the embedded exec proof proved
      // works via resolveUsableCustomProviderApiKey).
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
        auth: { mode: "token", token: "e2e-gw-token-167365" },
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

  // 3. shipped gateway daemon (background)
  console.log(`starting shipped gateway on port ${gatewayPort} ...`);
  const gwOut = path.join(fixture.root, "gateway-stdout.log");
  const gwErr = path.join(fixture.root, "gateway-stderr.log");
  const gwStdout = fs.openSync(gwOut, "a");
  const gwStderr = fs.openSync(gwErr, "a");
  const gateway = spawn(
    NODE_BIN,
    [
      OPENCLAW_MJS,
      "gateway",
      // config/state/auth all come from OPENCLAW_CONFIG_PATH / OPENCLAW_STATE_DIR
      // in env (gateway.auth.token is shared with the CLI side).
      "--port",
      String(gatewayPort),
      "--allow-unconfigured",
    ],
    { cwd: repoRoot, env, stdio: ["ignore", gwStdout, gwStderr], detached: false },
  );
  fs.closeSync(gwStdout);
  fs.closeSync(gwStderr);

  const gwReady = await waitForPort(gatewayPort, 90_000);
  if (!gwReady) {
    check("gateway became ready", false, `see ${gwErr}`);
    console.log(fs.readFileSync(gwErr, "utf8").slice(-4000));
    mock.server.close();
    process.exit(1);
  }
  check("gateway became ready", true, `127.0.0.1:${gatewayPort}`);

  try {
    // 4. Gateway-first agent turn (the modified path)
    console.log("running Gateway-first agent turn ...");
    const prompt = "Use the e2e_ping tool now, then reply with the literal tool result marker.";
    const res = await runCmd(["agent", "--json", "--timeout", "180", "-m", prompt], env, 240_000);
    fs.writeFileSync(path.join(fixture.root, "agent-stdout.txt"), res.stdout, "utf8");
    fs.writeFileSync(path.join(fixture.root, "agent-stderr.txt"), res.stderr, "utf8");

    // parse envelope (stdout may contain non-JSON banners; take last {...} block)
    let envelope = null;
    const lines = res.stdout.split("\n").filter((l) => l.trim().startsWith("{"));
    for (const line of lines.reverse()) {
      try {
        envelope = JSON.parse(line);
        break;
      } catch {}
    }

    // 5. checks
    check("[1] agent CLI exit 0", res.code === 0, `exit=${res.code}`);
    check(
      "[2] envelope ok/status",
      Boolean(envelope && envelope.ok === true),
      envelope ? `status=${envelope.status}` : "no envelope parsed",
    );

    const turn0Tools = mock.seen[0]?.toolNames ?? [];
    check(
      "[3] model turn#1 advertised e2e_ping",
      turn0Tools.includes("e2e_ping"),
      `tools(${turn0Tools.length}): ${turn0Tools.filter((t) => t.startsWith("e2e")).join(",") || "(no e2e tools)"}`,
    );
    check(
      "[4] model turn#1 advertised e2e_echo",
      turn0Tools.includes("e2e_echo"),
      turn0Tools.includes("e2e_echo") ? "" : "missing",
    );

    const completion2 = mock.seen[1]?.body ?? "";
    check(
      "[5] tool result marker flowed back (tool executed)",
      completion2.includes(MARKER_TOOL_RESULT),
      completion2.includes(MARKER_TOOL_RESULT)
        ? `found ${MARKER_TOOL_RESULT}`
        : "no marker — tool never executed",
    );

    const finalText = String(
      envelope?.final ?? envelope?.payloads?.map((p) => p.text).join(" ") ?? "",
    );
    check(
      "[6] final reply carries proof marker",
      finalText.includes(MARKER_FINAL) && finalText.includes(MARKER_TOOL_RESULT),
      finalText.slice(0, 200),
    );

    check(
      "[7] no unresolved error in envelope",
      Boolean(envelope && !envelope.error),
      envelope?.error ? JSON.stringify(envelope.error).slice(0, 200) : "",
    );

    // diagnostics: unknown-entries warning from gateway logs
    const gwLog = fs.readFileSync(gwErr, "utf8") + fs.readFileSync(gwOut, "utf8");
    const unknownEntries = gwLog.split("\n").filter((l) => /unknown entries/i.test(l));
    if (unknownEntries.length) {
      console.log("--- gateway log unknown-entries lines (defect symptom) ---");
      for (const l of unknownEntries.slice(0, 5)) console.log("  " + l.trim().slice(0, 300));
    } else {
      console.log("--- no unknown-entries warning in gateway logs ---");
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
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  process.exit(passed === results.length ? 0 : 1);
};

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(2);
});
