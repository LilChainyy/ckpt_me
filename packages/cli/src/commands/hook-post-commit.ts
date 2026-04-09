import { existsSync } from 'fs';
import { Command } from 'commander';
import { getHeadHash, getParentHash, getAuthor, getCommittedFiles, getRepoUrl } from '../core/git.js';
import { getCkptDir } from '../core/config.js';
import { detectAgent } from '../core/agent.js';
import { LocalStore } from '../storage/local.js';

export const hookPostCommit = new Command('_hook-post-commit')
  .description('Internal: called by post-commit hook')
  .action(() => {
    // Silently exit if ckpt is not initialized (hook should not block commits)
    if (!existsSync(getCkptDir())) return;
    const store = new LocalStore();
    const commitHash = getHeadHash();
    const parentHash = getParentHash();
    const author = getAuthor();
    const files = getCommittedFiles(commitHash);
    const repoUrl = getRepoUrl();
    const agent = detectAgent();

    // Check if reasoning already exists for this commit (manual ckpt commit was used)
    const existing = store.getReasoningByCommit(commitHash);
    if (existing) {
      store.close();
      return;
    }

    store.addReasoning(
      commitHash,
      undefined,
      author,
      files,
      parentHash,
      { source: 'hook', agent },
      repoUrl
    );

    store.close();
  });
