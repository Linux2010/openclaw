import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  awaitGateBeforeSettlement,
  createDeferred,
  withinTest,
} from "../../../test/helpers/promise.js";
import { resolveSessionLane } from "../../agents/embedded-agent-runner/lanes.js";
import type { RunEmbeddedAgentParams } from "../../agents/embedded-agent-runner/run/params.js";
import { SESSION_TOTAL_TOKENS_VERSION, type SessionEntry } from "../../config/sessions/types.js";
import { enqueueCommandInLane } from "../../process/command-queue.js";
import { useSessionStoreTempDirs } from "../../test-utils/session-state-cleanup.js";
import { makeIsolatedAgentJobFixture, makeIsolatedAgentParamsFixture } from "./job-fixtures.js";
import {
  loadRunCronIsolatedAgentTurn,
  loadSessionEntryMock,
  mockRunCronFallbackPassthrough,
  patchSessionEntryMock,
  resetRunCronIsolatedAgentTurnHarness,
  resolveCronSessionMock,
  runEmbeddedAgentMock,
} from "./run.test-harness.js";

const runCronIsolatedAgentTurn = await loadRunCronIsolatedAgentTurn();
const accessor = await vi.importActual<typeof import("../../config/sessions/session-accessor.js")>(
  "../../config/sessions/session-accessor.js",
);
const actualSession = await vi.importActual<typeof import("./session.js")>("./session.js");

describe("session-bound cron lane admission", () => {
  const sessionDirs = useSessionStoreTempDirs(afterAll, "openclaw-cron-session-lane-");

  beforeEach(() => {
    resetRunCronIsolatedAgentTurnHarness();
    mockRunCronFallbackPassthrough();
    resolveCronSessionMock.mockImplementation(actualSession.prepareCronSession);
    loadSessionEntryMock.mockImplementation(actualSession.loadCronSessionEntryLatest);
    patchSessionEntryMock.mockImplementation(accessor.patchSessionEntryCore);
  });

  it.for([
    { name: "legacy row", stale: false, cancel: false, settle: false },
    { name: "stale row", stale: true, cancel: false, settle: false },
    { name: "cancelled legacy row", stale: false, cancel: true, settle: false },
    { name: "settling compaction", stale: false, cancel: false, settle: true },
  ])(
    "preserves an occupied session's generation for a $name",
    async ({ stale, cancel, settle }, { signal }) => {
      const target = {
        agentId: "main",
        sessionKey: "agent:main:cron-admission",
        sessionId: "occupied-session",
        storePath: path.join(sessionDirs.make(), "openclaw-agent.sqlite"),
      };
      const updatedAt = Date.now() - (stale ? 120 * 60_000 : 0);
      const initialEntry: SessionEntry = {
        sessionId: target.sessionId,
        updatedAt,
        sessionStartedAt: updatedAt,
        lastInteractionAt: updatedAt,
        ...(stale ? { lifecycleRevision: "occupied-generation" } : {}),
      };
      await accessor.replaceSessionEntry(target, initialEntry);
      const accounting = {
        compactionCount: 1,
        totalTokens: 256,
        totalTokensFresh: true,
        totalTokensVersion: SESSION_TOTAL_TOKENS_VERSION,
      };
      if (settle) {
        resolveCronSessionMock.mockImplementation(async (params) => {
          const prepared = await actualSession.prepareCronSession(params);
          await accessor.patchSessionEntryCore(target, () => accounting);
          return prepared;
        });
      }
      const lane = resolveSessionLane(target.sessionKey);
      const occupied = createDeferred();
      const release = createDeferred();
      const waiting = createDeferred();
      const blocker = enqueueCommandInLane(lane, async () => {
        occupied.resolve();
        await release.promise;
      });
      await occupied.promise;
      runEmbeddedAgentMock.mockImplementation((params: RunEmbeddedAgentParams) =>
        enqueueCommandInLane(
          lane,
          async () => ({
            payloads: [{ text: "Scheduled turn completed" }],
            meta: { agentMeta: {} },
          }),
          {
            abortSignal: params.abortSignal,
            onQueued: () => params.onLaneWait?.({ waiting: true, waitMs: 0, queuedAhead: 1 }),
          },
        ),
      );
      const controller = new AbortController();
      const run = runCronIsolatedAgentTurn(
        makeIsolatedAgentParamsFixture({
          agentId: target.agentId,
          sessionKey: target.sessionKey,
          job: makeIsolatedAgentJobFixture({
            sessionTarget: `session:${target.sessionKey}`,
            delivery: { mode: "none" },
          }),
          cfg: { session: { store: target.storePath, reset: { mode: "idle", idleMinutes: 60 } } },
          abortSignal: controller.signal,
          onLaneWait: (info?: { waiting?: boolean }) => {
            if (info?.waiting) {
              waiting.resolve();
            }
          },
        }),
      );
      try {
        await withinTest(
          awaitGateBeforeSettlement(
            waiting.promise,
            run,
            "Cron finished before waiting for the session",
          ),
          signal,
        );
        expect(accessor.loadSessionEntry(target)?.lifecycleRevision).toBe(
          initialEntry.lifecycleRevision,
        );
        expect(runEmbeddedAgentMock).not.toHaveBeenCalled();
        if (cancel) {
          controller.abort(new Error("Scheduled turn cancelled"));
          await expect(run).rejects.toThrow("Scheduled turn cancelled");
          expect(accessor.loadSessionEntry(target)?.lifecycleRevision).toBeUndefined();
        } else {
          release.resolve();
          await expect(withinTest(run, signal)).resolves.toMatchObject({ status: "ok" });
          const committed = accessor.loadSessionEntry(target);
          expect(committed?.lifecycleRevision).toEqual(expect.any(String));
          expect(committed?.lifecycleRevision).not.toBe(initialEntry.lifecycleRevision);
          expect(committed?.sessionId).toBe(target.sessionId);
          if (settle) {
            expect(committed).toMatchObject(accounting);
          }
        }
      } finally {
        controller.abort();
        release.resolve();
        await Promise.allSettled([blocker, run]);
      }
    },
  );
});
