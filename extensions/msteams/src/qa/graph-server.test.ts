import { describe, expect, it } from "vitest";
import { startMSTeamsQaGraphServer } from "./graph-server.js";

describe("Microsoft Teams QA Graph server", () => {
  it("serves a parent message and two replies pages with an absolute nextLink", async () => {
    const server = await startMSTeamsQaGraphServer();
    try {
      const parent = await fetch(`${server.baseUrl}v1.0/teams/fixture/channels/fixture/messages/fixture`);
      expect(await parent.json()).toMatchObject({ id: "qa-parent" });

      const first = await fetch(
        `${server.baseUrl}v1.0/teams/fixture/channels/fixture/messages/fixture/replies?$top=50`,
      );
      const firstPage = (await first.json()) as {
        "@odata.nextLink": string;
        value: Array<{ body?: { content?: string }; id?: string }>;
      };
      expect(firstPage.value).toHaveLength(50);
      expect(firstPage.value[0]).toMatchObject({ id: "reply-001", body: { content: "reply-001" } });
      expect(firstPage["@odata.nextLink"]).toBe(
        `${server.baseUrl}v1.0/teams/fixture/channels/fixture/messages/fixture/replies?$skiptoken=qa-page-2`,
      );

      const second = await fetch(firstPage["@odata.nextLink"]);
      const secondPage = (await second.json()) as { value: Array<{ id?: string }> };
      expect(secondPage.value).toHaveLength(10);
      const successWindow = [...firstPage.value, ...secondPage.value].slice(-50);
      expect(successWindow[0]?.id).toBe("reply-011");
      expect(successWindow.at(-1)?.id).toBe("reply-060");
      expect(successWindow.some((reply) => reply.id === "reply-010")).toBe(false);
      expect(server.readLedger()).toEqual({
        nextLinkFollowed: true,
        pageCounts: [1, 50, 10],
        statuses: [200, 200, 200],
      });
    } finally {
      await server.close();
    }
  });

  it("records a second-page 503 without request content or identifiers", async () => {
    const server = await startMSTeamsQaGraphServer();
    try {
      server.setSecondPageMode("503");
      const first = await fetch(
        `${server.baseUrl}v1.0/teams/fixture/channels/fixture/messages/fixture/replies`,
      );
      const firstPage = (await first.json()) as { "@odata.nextLink": string };
      const second = await fetch(firstPage["@odata.nextLink"]);
      expect(second.status).toBe(503);
      expect(server.readLedger()).toEqual({
        nextLinkFollowed: true,
        pageCounts: [50],
        statuses: [200, 503],
      });
      expect(JSON.stringify(server.readLedger())).not.toContain("fixture");
    } finally {
      await server.close();
    }
  });
});
