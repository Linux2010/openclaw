// Execution-gate evidence for #183085: expanding the plain-text promotion
// matcher to deferred catalog names must not bypass tool execution
// authority. A promoted call for a tool that is not in the attempt's
// promotion set (denied, revoked after a catalog refresh, or simply not
// hydrated) is never converted into a structured tool call, so it can never
// reach a tool implementation; the wrapped text stays visible text.

import { describe, expect, it } from "vitest";
import { createFakeStream, type FakeWrappedStream } from "./attempt-stream.test-helpers.js";
import { wrapStreamFnPromoteStandaloneTextToolCalls } from "./attempt-tool-call-text-promotion.js";
import {
  assistantMessage,
  collectPromotionEvents,
  messageContent,
  record,
} from "./attempt-tool-call-text-promotion.test-support.js";

const envelopedCall = (toolName: string) =>
  `<tool_call>\n<function=${toolName}>\n<parameter=name>\nbriefing\n</parameter>\n</function>\n</tool_call>`;

async function wrapWithNames(
  params: Parameters<typeof createFakeStream>[0],
  toolNames: readonly string[],
): Promise<FakeWrappedStream> {
  const wrapped = wrapStreamFnPromoteStandaloneTextToolCalls(
    (() => createFakeStream(params)) as never,
    new Set(toolNames),
  );
  return (await wrapped({} as never, {} as never, {} as never)) as FakeWrappedStream;
}

const envelopeParams = (toolName: string) => {
  const text = envelopedCall(toolName);
  const createMessage = () => assistantMessage([{ type: "text", text }]);
  return {
    events: [
      { type: "text_delta", contentIndex: 0, delta: text },
      { type: "done", reason: "stop", message: createMessage() },
    ],
    resultMessage: createMessage(),
  } as Parameters<typeof createFakeStream>[0];
};

describe("plain-text promotion execution gate", () => {
  it("promotes a call for an allowed deferred tool into a structured tool call", async () => {
    const stream = await wrapWithNames(envelopeParams("skills_read"), ["skills_read"]);

    const events = await collectPromotionEvents(stream);
    const result = record(await stream.result(), "result message");

    const toolCalls = messageContent(result).filter((block) => block.type === "toolCall");
    expect(toolCalls).toHaveLength(1);
    expect(record(toolCalls[0], "promoted tool call")).toMatchObject({
      name: "skills_read",
      arguments: { name: "briefing" },
    });
    expect(events.some((event) => String(event.type).startsWith("toolcall_"))).toBe(true);
  });

  it("never promotes a call for a denied or unknown tool", async () => {
    // `skills_read` is deferred in the catalog but denied for this attempt:
    // it is absent from the promotion set the matcher is built from.
    const stream = await wrapWithNames(envelopeParams("skills_read"), ["exec", "read"]);

    const events = await collectPromotionEvents(stream);
    const result = record(await stream.result(), "result message");

    expect(events.some((event) => String(event.type).startsWith("toolcall_"))).toBe(false);
    expect(messageContent(result)).toEqual([{ type: "text", text: envelopedCall("skills_read") }]);
  });

  it("stops promoting a tool revoked by a catalog refresh before the next attempt", async () => {
    // attempt-stream rebuilds the promotion set from the live and capability
    // catalogs on every attempt, so a revocation between attempts produces a
    // matcher that no longer contains the name.
    const revokedSet = ["skills_read", "exec"];
    const refreshedSet = ["exec"];
    const params = envelopeParams("skills_read");

    const beforeRevocation = await wrapWithNames(params, revokedSet);
    expect(
      messageContent(record(await beforeRevocation.result(), "result message")).some(
        (block) => block.type === "toolCall",
      ),
    ).toBe(true);

    const afterRevocation = await wrapWithNames(params, refreshedSet);
    const events = await collectPromotionEvents(afterRevocation);
    const result = record(await afterRevocation.result(), "result message");

    expect(events.some((event) => String(event.type).startsWith("toolcall_"))).toBe(false);
    expect(messageContent(result)).toEqual([{ type: "text", text: envelopedCall("skills_read") }]);
  });
});
