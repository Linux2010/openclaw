// Execution-gate evidence for #183085: expanding the plain-text promotion
// matcher to deferred catalog names must not bypass tool execution
// authority. The name set the matcher resolves against must be observed
// live: applyPromptToolPolicy and refreshTools clear and refill the catalog
// name sets during an attempt, so promotion must resolve at the boundary
// instead of a copied snapshot. End-to-end promotion, denial, and refusal
// coverage lives in the production-catalog cases of
// attempt.tool-search-run-plan.test.ts.

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

describe("plain-text promotion execution gate", () => {
  it("reads the live name set at the promotion boundary", async () => {
    const liveNames = new Set(["write"]);
    const text = envelopedCall("write");
    const createMessage = () => assistantMessage([{ type: "text", text }]);
    const params = {
      events: [
        { type: "text_delta", contentIndex: 0, delta: text },
        { type: "done", reason: "stop", message: createMessage() },
      ],
      resultMessage: createMessage(),
    } as Parameters<typeof createFakeStream>[0];
    const wrapped = wrapStreamFnPromoteStandaloneTextToolCalls(
      (() => createFakeStream(params)) as never,
      () => liveNames,
    );

    const beforeRemoval = (await wrapped(
      {} as never,
      {} as never,
      {} as never,
    )) as FakeWrappedStream;
    expect(
      messageContent(record(await beforeRemoval.result(), "result message")).some(
        (block) => record(block, "content block").type === "toolCall",
      ),
    ).toBe(true);

    // Policy removes the name mid-attempt.
    liveNames.delete("write");

    const afterRemoval = (await wrapped(
      {} as never,
      {} as never,
      {} as never,
    )) as FakeWrappedStream;
    const events = await collectPromotionEvents(afterRemoval);
    const result = record(await afterRemoval.result(), "result message");

    expect(events.some((event) => String(event.type).startsWith("toolcall_"))).toBe(false);
    expect(messageContent(result)).toEqual([{ type: "text", text }]);
  });
});
