// 在 handleFeishuMessage 函数中，在 try 块内，dispatch 之前添加以下代码：

import { handleFeishuCommand } from "./feishu-command-handler.js";

// ... existing code ...

// Handle commands before dispatching to agent
const commandHandled = await handleFeishuCommand(
  ctx.content,
  route.sessionKey,
  core.hooks,
  {
    cfg: effectiveCfg,
    sessionEntry: { sessionId: route.sessionKey, sessionFile: undefined },
    commandSource: "feishu",
    timestamp: Date.now()
  }
);

if (commandHandled) {
  log(`feishu[${account.accountId}]: command handled, skipping agent dispatch`);
  return;
}

// ... continue with existing agent dispatch logic ...