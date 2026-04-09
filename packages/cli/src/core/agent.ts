import type { AgentInfo } from '@ckpt/shared';

export function detectAgent(): AgentInfo {
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    return {
      tool: 'claude-code',
      sessionId: process.env.CLAUDE_CODE_SESSION_ID,
    };
  }
  if (process.env.CURSOR_SESSION) {
    return { tool: 'cursor' };
  }
  if (process.env.GITHUB_COPILOT) {
    return { tool: 'copilot' };
  }
  return { tool: 'manual' };
}
