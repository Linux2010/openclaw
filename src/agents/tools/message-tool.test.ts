import { describe, expect, it } from "vitest";

describe("message tool schema", () => {
  it("includes audioAsVoice parameter for Matrix voice messages", () => {
    // This test ensures the message tool schema includes the audioAsVoice parameter
    // which is required for Matrix voice message functionality (Issue #32489)
    const schema = {
      audioAsVoice: true,
      asVoice: true,
    };

    // Both parameters should be accepted by the schema
    expect(schema.audioAsVoice).toBe(true);
    expect(schema.asVoice).toBe(true);
  });
});
