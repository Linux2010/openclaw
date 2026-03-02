// Feishu Command Handler Fix for Issue #31275
// This file adds proper command handling to trigger session-memory hooks

import type { OpenClawConfig } from "../../../config/config.js";
import { DEFAULT_RESET_TRIGGERS } from "../../../config/sessions/types.js";
import { runBeforeReset } from "../../../hooks/runner.js";
import type { PluginHookAgentContext } from "../../../hooks/types.js";

/**
 * Check if message text is a reset command (/new or /reset)
 */
function isResetCommand(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return DEFAULT_RESET_TRIGGERS.some(trigger => 
    trimmed === trigger || trimmed.startsWith(`${trigger} `)
  );
}

/**
 * Handle Feishu command messages and trigger appropriate hooks
 */
export async function handleFeishuCommand(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  messageText: string;
  context: any;
}): Promise<boolean> {
  const { cfg, sessionKey, messageText, context } = params;
  
  // Check if this is a reset command
  if (isResetCommand(messageText)) {
    try {
      // Determine the action type
      const action = messageText.trim().toLowerCase().startsWith('/new') ? 'new' : 'reset';
      
      // Create hook context
      const hookContext: PluginHookAgentContext = {
        agentId: context.agentId || 'main',
        sessionKey,
        cfg,
      };
      
      // Trigger the before_reset hook
      await runBeforeReset(
        {
          type: 'command',
          action,
          timestamp: Date.now(),
          context: {
            ...context,
            commandSource: 'feishu',
            sessionEntry: context.sessionEntry,
            previousSessionEntry: context.previousSessionEntry,
          },
        },
        hookContext
      );
      
      console.log(`[feishu] Successfully triggered session-memory hook for ${action} command`);
      return true;
    } catch (error) {
      console.error('[feishu] Failed to trigger session-memory hook:', error);
      // Don't fail the command, just log the error
      return false;
    }
  }
  
  return false;
}