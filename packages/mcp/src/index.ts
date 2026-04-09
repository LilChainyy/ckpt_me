import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiGet, apiPost } from './client.js';

const server = new McpServer({
  name: 'ckpt',
  version: '0.1.0',
});

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
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
