import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiGet, apiPost, apiUrl, healthCheck, ApiError, NetworkError } from './client.js';

const server = new McpServer({
  name: 'ckpt',
  version: '0.1.0',
});

function formatToolError(error: unknown): string {
  if (error instanceof NetworkError) {
    return `ckpt API is unreachable at ${apiUrl}. Check CKPT_API_URL and network connectivity.`;
  }
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return 'ckpt API error (will retry automatically on next call)';
    }
    return `Request rejected: ${error.message}`;
  }
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

server.tool(
  'ckpt_save_reasoning',
  'Save reasoning context for the current work',
  {
    reasoning: z.string().describe('The reasoning behind the changes'),
    commitHash: z.string().optional().describe('Git commit hash if available'),
    files: z.array(z.string()).optional().describe('List of affected file paths'),
    repoUrl: z.string().optional().describe('Repository URL'),
  },
  async ({ reasoning, commitHash, files, repoUrl }) => {
    try {
      const id = crypto.randomUUID();
      await apiPost('/api/v1/reasoning/sync', {
        records: [{
          id,
          reasoning,
          commitHash,
          files,
          repoUrl,
          timestamp: new Date().toISOString(),
          metadata: { source: 'mcp', agent: { tool: 'claude-code' } },
        }],
      });
      return { content: [{ type: 'text' as const, text: `Saved reasoning record ${id}` }] };
    } catch (error) {
      console.error('[ckpt_save_reasoning]', error);
      return { content: [{ type: 'text' as const, text: formatToolError(error) }], isError: true };
    }
  }
);

server.tool(
  'ckpt_get_context',
  'Get recent reasoning and checkpoints for a repository',
  {
    repoUrl: z.string().optional().describe('Repository URL to filter by'),
    limit: z.number().optional().default(10).describe('Max records to return'),
  },
  async ({ repoUrl, limit }) => {
    try {
      const params = new URLSearchParams();
      if (repoUrl) params.set('repo', repoUrl);
      if (limit) params.set('limit', String(limit));

      const data = await apiGet(`/api/v1/reasoning?${params}`) as { records: unknown[] };
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(data.records, null, 2),
        }],
      };
    } catch (error) {
      console.error('[ckpt_get_context]', error);
      return { content: [{ type: 'text' as const, text: formatToolError(error) }], isError: true };
    }
  }
);

server.tool(
  'ckpt_mark_dead_end',
  'Record a dead end — an approach that was tried and failed',
  {
    title: z.string().describe('What the dead end was'),
    attempt: z.string().describe('What was tried'),
    outcome: z.string().describe('Why it failed'),
  },
  async ({ title, attempt, outcome }) => {
    try {
      const id = crypto.randomUUID();
      await apiPost('/api/v1/reasoning/sync', {
        records: [{
          id,
          reasoning: `Dead end: ${title}\nAttempt: ${attempt}\nOutcome: ${outcome}`,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'mcp',
            type: 'dead-end',
            deadEnd: { title, attempt, outcome },
            agent: { tool: 'claude-code' },
          },
        }],
      });
      return { content: [{ type: 'text' as const, text: `Recorded dead end: ${title}` }] };
    } catch (error) {
      console.error('[ckpt_mark_dead_end]', error);
      return { content: [{ type: 'text' as const, text: formatToolError(error) }], isError: true };
    }
  }
);

server.tool(
  'ckpt_add_constraint',
  'Record a constraint — a rule that must not be broken',
  {
    label: z.string().describe('Short constraint label'),
    reason: z.string().describe('Why this constraint exists'),
  },
  async ({ label, reason }) => {
    try {
      const id = crypto.randomUUID();
      await apiPost('/api/v1/reasoning/sync', {
        records: [{
          id,
          reasoning: `Constraint: ${label}\nReason: ${reason}`,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'mcp',
            type: 'constraint',
            constraint: { label, reason },
            agent: { tool: 'claude-code' },
          },
        }],
      });
      return { content: [{ type: 'text' as const, text: `Recorded constraint: ${label}` }] };
    } catch (error) {
      console.error('[ckpt_add_constraint]', error);
      return { content: [{ type: 'text' as const, text: formatToolError(error) }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Non-blocking health check on startup
  const healthy = await healthCheck();
  if (healthy) {
    console.error(`[ckpt] Connected to API at ${apiUrl}`);
  } else {
    console.error(`[ckpt] Warning: API at ${apiUrl} is not reachable. Tools will retry on use.`);
  }
}

main().catch(console.error);
