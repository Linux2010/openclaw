import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { resolveSessionDisplayModelRef } from "./sessions-display-model.js";

function configWithAliasPrimary(params: {
  canonicalModel: string;
  alias: string;
  agentPrimary?: string;
}): OpenClawConfig {
  return {
    agents: {
      defaults: {
        models: { [params.canonicalModel]: { alias: params.alias } },
        model: { primary: params.alias },
      },
      entries: {
        main: {
          name: "main",
          model: { primary: params.agentPrimary ?? params.alias },
        },
      },
    },
  } as unknown as OpenClawConfig;
}

describe("resolveSessionDisplayModelRef", () => {
  it("resolves a bare alias primary through the configured alias index (#177311)", () => {
    // A session with no persisted runtime model falls back to the display
    // defaults; a bare alias primary ("opus") used to be parsed as
    // { provider: "openai", model: "opus" } — a pair that does not exist in
    // the configuration — instead of the canonical model the runtime runs.
    const cfg = configWithAliasPrimary({
      canonicalModel: "anthropic/claude-opus-5-5",
      alias: "opus",
    });

    const ref = resolveSessionDisplayModelRef(cfg, { key: "agent:main:backlog:tsk-1" });

    expect(ref).toEqual({ provider: "anthropic", model: "claude-opus-5-5" });
  });

  it("resolves the agent-scoped alias primary for its own session rows", () => {
    const cfg = configWithAliasPrimary({
      canonicalModel: "anthropic/claude-opus-5-5",
      alias: "opus",
      agentPrimary: "opus",
    });

    const ref = resolveSessionDisplayModelRef(cfg, { key: "agent:main:backlog:tsk-2" });

    expect(ref).toEqual({ provider: "anthropic", model: "claude-opus-5-5" });
  });

  it("keeps the default fallback for an unconfigured bare primary", () => {
    const cfg = {
      agents: {
        defaults: {
          model: { primary: "totally-unknown-short-name" },
        },
      },
    } as unknown as OpenClawConfig;

    const ref = resolveSessionDisplayModelRef(cfg, { key: "agent:main:backlog:tsk-3" });

    // No alias exists for this name: the previous fallback behavior stands
    // (parse the raw primary against the default provider).
    expect(ref.provider).toBe("openai");
    expect(ref.model).toBe("totally-unknown-short-name");
  });
});
