import type { PluginHookRunner } from "openclaw/plugin-sdk";
import { DEFAULT_RESET_TRIGGERS } from "../../../config/sessions/types.js";

/**
 * Handle Feishu commands and trigger appropriate hooks
 */
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
  
  // Check if it's a reset command (new or reset)
  const isResetCommand = DEFAULT_RESET_TRIGGERS.some(trigger => 
    trimmed === trigger || trimmed.startsWith(`${trigger} `)
  );
  
  if (isResetCommand) {
    // Extract the actual command (without arguments)
    const command = trimmed.split(' ')[0];
    const action = command.replace('/', '');
    
    // Validate that action is either "new" or "reset"
    if (action !== "new" && action !== "reset") {
      return false;
    }
    
    // Extract agentId from sessionKey (format: agent:<agentId>:<rest>)
    const agentIdMatch = sessionKey.match(/^agent:([^:]+):/);
    const agentId = agentIdMatch ? agentIdMatch[1] : "main";
    
    // Trigger the before_reset hook
    await hookRunner.runBeforeReset(
      {
        type: "command",
        action: action as "new" | "reset",
        context: {
          ...context,
          commandSource: "feishu"
        }
      },
      {
        agentId: agentId,
        sessionKey
      }
    );
    
    return true; // Command was handled
  }
  
  return false; // Not a command we handle
}