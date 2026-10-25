import { describe, expect, it } from "vitest";
import { scanXmlishToolCall, utf8ByteLengthWithinLimit } from "./grammar.js";

describe("scanXmlishToolCall", () => {
  it.each([`<function=${"x".repeat(121)}`, `<function=read><parameter=${"x".repeat(121)}`])(
    "rejects invalid or ambiguous executable forms: %s",
    (raw) => {
      expect(scanXmlishToolCall(raw).kind).toBe("invalid");
    },
  );

  it("excludes a partial function close from the payload cap", () => {
    const body = " ".repeat(255_999);
    const prefix = `<function=read>${body}</func`;
    const scan = scanXmlishToolCall(prefix);

    expect(scan.kind).toBe("prefix");
    if (scan.kind !== "prefix" || !scan.candidate?.payload) {
      return;
    }
    expect(
      utf8ByteLengthWithinLimit(
        prefix,
        scan.candidate.payload.start,
        scan.candidate.payload.end,
        256_000,
      ),
    ).toBe(255_999);
    expect(scanXmlishToolCall(`${prefix}tion>`).kind).toBe("complete");
  });
});

describe("scanXmlishToolCall with a Qwen-style tool_call envelope", () => {
  const wrapped =
    "<tool_call>\n<function=skills_read>\n<parameter=name>\nbriefing\n</parameter>\n</function>\n</tool_call>";

  it("parses a fully enveloped call as complete and consumes the envelope", () => {
    const scan = scanXmlishToolCall(wrapped);

    expect(scan.kind).toBe("complete");
    if (scan.kind !== "complete") {
      return;
    }
    expect(wrapped.slice(scan.name.start, scan.name.end)).toBe("skills_read");
    expect(wrapped.slice(scan.payload.start, scan.payload.end)).toBe(
      "\n<parameter=name>\nbriefing\n</parameter>\n",
    );
    expect(scan.end).toBe(wrapped.length);
  });

  it("keeps a missing envelope close in prefix for streaming", () => {
    const withoutClose = wrapped.replace(/\n<\/tool_call>$/u, "");
    expect(scanXmlishToolCall(withoutClose).kind).toBe("prefix");
    expect(scanXmlishToolCall(`${withoutClose}\n</tool_ca`).kind).toBe("prefix");
  });

  it("treats a partial envelope opener as prefix", () => {
    expect(scanXmlishToolCall("<tool_").kind).toBe("prefix");
    expect(scanXmlishToolCall("<tool_call>").kind).toBe("prefix");
    expect(scanXmlishToolCall("<tool_call>\n").kind).toBe("prefix");
  });

  it("rejects an envelope wrapping something that is not a function call", () => {
    expect(scanXmlishToolCall("<tool_call>\nplain text\n</tool_call>").kind).toBe("invalid");
  });

  it("still parses the bare function form without an envelope", () => {
    const bare = "<function=skills_read>\n<parameter=name>\nbriefing\n</parameter>\n</function>";
    const scan = scanXmlishToolCall(bare);

    expect(scan.kind).toBe("complete");
    if (scan.kind !== "complete") {
      return;
    }
    expect(wrapped.slice(wrapped.indexOf("<function"), wrapped.indexOf("</function>"))).toBe(
      bare.slice(0, bare.indexOf("</function>")),
    );
    expect(scan.end).toBe(bare.length);
  });
});
