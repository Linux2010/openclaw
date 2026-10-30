// Brief wording for #186990: the repair brief must carry the failure-alert
// delivery outcome instead of a bare "No failure alert was sent.", so a
// channel-less gateway surfaces why the operator alert is missing.
import { describe, expect, it } from "vitest";
import type { CronJob } from "../types.js";
import { buildCronFailureRepairBrief } from "./failure-repair-brief.js";

function jobFixture(): CronJob {
  return {
    id: "cron-fixture",
    name: "Nightly watch",
    payload: { kind: "agentTurn", message: "watch the thing" },
    schedule: { kind: "cron", expr: "0 7-19 * * *", tz: "UTC" },
    owner: { sessionKey: "session:main" },
    state: {},
  } as unknown as CronJob;
}

describe("buildCronFailureRepairBrief alert-delivery wording", () => {
  it("keeps the bare sentence when no delivery attempt is recorded", () => {
    const brief = buildCronFailureRepairBrief({
      job: jobFixture(),
      consecutiveErrors: 2,
    });

    expect(brief).toContain("No failure alert was sent.");
    expect(brief).not.toContain("delivery attempt");
  });

  it("states the recorded delivery failure and its reason", () => {
    const brief = buildCronFailureRepairBrief({
      job: jobFixture(),
      consecutiveErrors: 2,
      alertDelivery: {
        delivered: false,
        status: "not-delivered",
        error: "Channel is required (no configured channels detected).",
      },
    });

    expect(brief).toContain(
      "No failure alert was sent (last failure-alert delivery attempt: not-delivered: Channel is required (no configured channels detected).).",
    );
  });

  it("reports a delivered alert instead of claiming none was sent", () => {
    const brief = buildCronFailureRepairBrief({
      job: jobFixture(),
      consecutiveErrors: 2,
      alertDelivery: { delivered: true, status: "delivered" },
    });

    expect(brief).toContain("The failure alert was delivered.");
    expect(brief).not.toContain("No failure alert was sent");
  });

  it("names the per-turn guard for the terminal one-shot variant with delivery state", () => {
    const brief = buildCronFailureRepairBrief({
      job: jobFixture(),
      consecutiveErrors: 1,
      terminal: true,
      alertDelivery: { delivered: false, status: "unknown" },
    });

    expect(brief).toContain(
      "No failure alert was sent (last failure-alert delivery attempt: unknown).",
    );
    expect(brief).toContain("failed and will not run again (now disabled).");
  });

  it("still counts consecutive failures in the recurring variant", () => {
    const brief = buildCronFailureRepairBrief({
      job: jobFixture(),
      consecutiveErrors: 3,
    });

    expect(brief).toContain("failed 3 consecutive runs");
  });
});
