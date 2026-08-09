import { once } from "node:events";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type MSTeamsQaGraphLedger = {
  nextLinkFollowed: boolean;
  pageCounts: number[];
  statuses: number[];
};

export type MSTeamsQaGraphSecondPageMode = "ok" | "503";

type ServerOptions = {
  secondPage?: MSTeamsQaGraphSecondPageMode;
};

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export async function startMSTeamsQaGraphServer(options: ServerOptions = {}) {
  let secondPageMode = options.secondPage ?? "ok";
  const ledger: MSTeamsQaGraphLedger = {
    nextLinkFollowed: false,
    pageCounts: [],
    statuses: [],
  };
  const repliesFirstPage = Array.from({ length: 50 }, (_, index) => ({
    body: { content: `reply-${String(index + 1).padStart(3, "0")}`, contentType: "text" },
    createdDateTime: `2026-08-01T00:${String(index).padStart(2, "0")}:00Z`,
    from: { user: { displayName: "QA Graph Fixture", id: "qa-fixture-sender" } },
    id: `reply-${String(index + 1).padStart(3, "0")}`,
  }));
  const repliesSecondPage = Array.from({ length: 10 }, (_, index) => ({
    body: { content: `reply-${String(index + 51).padStart(3, "0")}`, contentType: "text" },
    createdDateTime: `2026-08-01T01:${String(index).padStart(2, "0")}:00Z`,
    from: { user: { displayName: "QA Graph Fixture", id: "qa-fixture-sender" } },
    id: `reply-${String(index + 51).padStart(3, "0")}`,
  }));
  let baseUrl = "";
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", baseUrl);
    const isReplies = /\/messages\/[^/]+\/replies$/u.test(url.pathname);
    if (request.method !== "GET") {
      ledger.statuses.push(404);
      sendJson(response, 404, { error: "not found" });
      return;
    }
    if (isReplies && url.searchParams.get("$skiptoken") === "qa-page-2") {
      ledger.nextLinkFollowed = true;
      if (secondPageMode === "503") {
        ledger.statuses.push(503);
        sendJson(response, 503, { error: "service unavailable" });
        return;
      }
      ledger.pageCounts.push(repliesSecondPage.length);
      ledger.statuses.push(200);
      sendJson(response, 200, { value: repliesSecondPage });
      return;
    }
    if (isReplies) {
      ledger.pageCounts.push(repliesFirstPage.length);
      ledger.statuses.push(200);
      sendJson(response, 200, {
        "@odata.nextLink": `${baseUrl}${url.pathname.slice(1)}?$skiptoken=qa-page-2`,
        value: repliesFirstPage,
      });
      return;
    }
    if (/\/messages\/[^/]+$/u.test(url.pathname)) {
      ledger.pageCounts.push(1);
      ledger.statuses.push(200);
      sendJson(response, 200, {
        body: { content: "QA parent message", contentType: "text" },
        createdDateTime: "2026-08-01T00:00:00Z",
        from: { user: { displayName: "QA Graph Fixture", id: "qa-fixture-sender" } },
        id: "qa-parent",
      });
      return;
    }
    ledger.statuses.push(404);
    sendJson(response, 404, { error: "not found" });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/`;
  const readLedger = (): MSTeamsQaGraphLedger => ({
    nextLinkFollowed: ledger.nextLinkFollowed,
    pageCounts: [...ledger.pageCounts],
    statuses: [...ledger.statuses],
  });
  return {
    baseUrl,
    readLedger,
    setSecondPageMode(mode: MSTeamsQaGraphSecondPageMode) {
      secondPageMode = mode;
      ledger.nextLinkFollowed = false;
      ledger.pageCounts.length = 0;
      ledger.statuses.length = 0;
    },
    async close() {
      server.close();
      await once(server, "close");
    },
  };
}
