import type { PluginHookRunner } from "openclaw/plugin-sdk";
import { DEFAULT_RESET_TRIGGERS } from "../../../config/sessions/types.js";
import { resolveAgentIdFromSessionKey } from "../../../routing/session-key.js";

export async function handleFeishuCommand(
  messageText: string,
  sessionKey: string,
  hookRunner: PluginHookRunner,
  context: {
    cfg: any;
    sessionEntry: any;
    previousSessionEntry?: any;
    commandSource: string;
    timestamp: number;
  }
): Promise<boolean> {
  // Check if message is a reset command
  const trimmed = messageText.trim().toLowerCase();
  const isResetCommand = DEFAULT_RESET_TRIGGERS.some(trigger =>
    trimmed === trigger || trimmed.startsWith(`${trigger} `)
  );

  if (isResetCommand) {
    // Extract the actual command (without arguments)
    const command = trimmed.split(' ')[0].replace('/', '');
    
    // Validate command type
    if (command !== "new" && command !== "reset") {
      return false;
    }

    // Trigger the before_reset hook
    await hookRunner.runBeforeReset(
      {
        type: "command",
        action: command,
        context: {
          ...context,
          commandSource: "feishu"
        }
      },
      {
        agentId: resolveAgentIdFromSessionKey(sessionKey),
        sessionKey
      }
    );

    return true; // Command was handled
  }

  return false; // Not a command we handle
}