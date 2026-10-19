import { describe, expect, it } from "vitest";
import type { createMatrixEventContextResolver } from "./event-context.js";
import { resolveMatrixInboundContext } from "./handler-context.js";
import type { MatrixIngressContent } from "./handler-ingress-content.js";
import type { MatrixHandlerRuntimeConfig } from "./handler-types.js";
import type { MatrixRawEvent } from "./types.js";

type MatrixEventContext = Awaited<ReturnType<ReturnType<typeof createMatrixEventContextResolver>>>;

type CapturedBuildContext = {
  route: { parentSessionKey?: string | undefined };
  supplemental: {
    thread?: { starterBody?: string | undefined } | undefined;
  };
};

const ROOM_SESSION_KEY = "agent:main:matrix:room:room1";
const THREAD_SESSION_KEY = "agent:main:matrix:room:room1:thread:$thread1";

function makeFixtures(options?: { threadId?: string; threadRootId?: string; matchedBy?: string }) {
  const buildContextCalls: CapturedBuildContext[] = [];
  const handler = {
    accountId: "acct",
    runtime: {},
    logVerboseMessage: () => {},
    groupPolicy: "allowlist",
    getRoomInfo: async () => undefined,
    historyLimit: 0,
    resolveStorePath: () => "/tmp/store.json",
    createChannelInboundEnvelopeBuilder: () => () => "envelope",
    finalizeInboundContext: (ctx: unknown) => ctx,
    core: {
      channel: {
        inbound: {
          buildContext: (payload: CapturedBuildContext) => {
            buildContextCalls.push(payload);
            return { To: "room:room1" };
          },
        },
        reactions: {
          shouldAckReaction: () => false,
        },
      },
    },
  } as unknown as MatrixHandlerRuntimeConfig;

  const ingress = {
    cfg: {},
    resolveMessageIngress: async () => ({}),
    route: {
      agentId: "main",
      accountId: "acct",
      sessionKey: options?.threadId ? THREAD_SESSION_KEY : ROOM_SESSION_KEY,
      mainSessionKey: ROOM_SESSION_KEY,
      matchedBy: options?.matchedBy ?? "default",
    },
    isDirectMessage: false,
    isRoom: true,
    effectiveRoomUsers: [],
    effectiveGroupAllowFrom: [],
    threadRootId: options?.threadRootId,
    thread: { threadId: options?.threadId },
    senderName: "@alice:example.org",
    bodyText: "hello",
    roomConfig: undefined,
    messageId: undefined,
    inboundHistory: undefined,
    wasMentioned: false,
    effectiveWasMentioned: false,
    shouldBypassMention: false,
    canDetectMention: false,
    shouldRequireMention: false,
    commandAuthorized: true,
    hasExplicitSessionBinding: false,
  } as unknown as MatrixIngressContent;

  const event = {
    type: "m.room.message",
    sender: "@alice:example.org",
    origin_server_ts: 1,
    event_id: "$evt1",
    content: { msgtype: "m.text", body: "hello" },
  } as unknown as MatrixRawEvent;

  return { handler, ingress, event, buildContextCalls };
}

async function resolveInboundContext(
  fixtures: ReturnType<typeof makeFixtures>,
  resolveThreadContext?: () => Promise<MatrixEventContext>,
) {
  return resolveMatrixInboundContext({
    handler: fixtures.handler,
    ingress: fixtures.ingress,
    roomId: "!room1:example.org",
    event: fixtures.event,
    resolveThreadContext: resolveThreadContext ?? (async () => ({})),
    resolveReplyContext: async () => ({}),
    senderId: "@alice:example.org",
    sharedDmContextNoticeRooms: new Set<string>(),
  });
}

describe("resolveMatrixInboundContext route parentSessionKey", () => {
  it("does not request a room transcript fork for thread targets", async () => {
    const fixtures = makeFixtures({ threadId: "$thread1" });
    await resolveInboundContext(fixtures);

    expect(fixtures.buildContextCalls).toHaveLength(1);
    expect(fixtures.buildContextCalls[0]?.route.parentSessionKey).toBeUndefined();
  });

  it("keeps the shared DM binding exemption fork-free", async () => {
    const fixtures = makeFixtures({ threadId: "$thread1", matchedBy: "binding.channel" });
    await resolveInboundContext(fixtures);

    expect(fixtures.buildContextCalls[0]?.route.parentSessionKey).toBeUndefined();
  });

  it("does not set a parent session key for non-thread messages", async () => {
    const fixtures = makeFixtures();
    await resolveInboundContext(fixtures);

    expect(fixtures.buildContextCalls[0]?.route.parentSessionKey).toBeUndefined();
  });

  it("still surfaces the thread root as supplemental context", async () => {
    const fixtures = makeFixtures({ threadId: "$thread1", threadRootId: "$root1" });
    await resolveInboundContext(fixtures, async () => ({
      threadStarterBody: "Starter message",
    }));

    expect(fixtures.buildContextCalls[0]?.supplemental.thread?.starterBody).toBe("Starter message");
  });
});
