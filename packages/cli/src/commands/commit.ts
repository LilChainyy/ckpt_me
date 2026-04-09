import { Command } from 'commander';
import { run, getHeadHash, getParentHash, getAuthor, getCommittedFiles, getRepoUrl } from '../core/git.js';
import { requireInit } from '../core/config.js';
import { resolveReasoning } from '../core/reasoning.js';
import { detectAgent } from '../core/agent.js';
import { LocalStore } from '../storage/local.js';

export const commit = new Command('commit')
  .description('Commit staged changes with reasoning')
  .option('-m, --message <msg>', 'commit message')
  .option('--reasoning <text>', 'reasoning for this commit')
  .allowUnknownOption(true)
  .action((opts: { message?: string; reasoning?: string }, cmd: Command) => {
    requireInit();
    const store = new LocalStore();
    const reasoning = resolveReasoning(opts.reasoning, store);

    const gitArgs = ['commit'];
    if (opts.message) gitArgs.push('-m', opts.message);
    // Pass through any extra args
    const extra = cmd.args ?? [];
    gitArgs.push(...extra);

    const result = run(gitArgs);
    if (result.exitCode !== 0) {
      store.close();
      process.exit(result.exitCode);
    }

    const commitHash = getHeadHash();
    const parentHash = getParentHash();
    const author = getAuthor();
    const files = getCommittedFiles(commitHash);
    const repoUrl = getRepoUrl();
    const agent = detectAgent();

    store.addReasoning(commitHash, reasoning, author, files, parentHash, { agent }, repoUrl);
    store.clearStaging();
    store.close();

    console.log(`Committed ${commitHash.slice(0, 7)}`);
    if (reasoning) console.log(`  reasoning: ${reasoning}`);
  });
