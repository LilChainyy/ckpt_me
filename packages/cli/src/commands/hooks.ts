import { Command } from 'commander';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { getRepoRoot } from '../core/git.js';

const HOOK_SCRIPT = `#!/bin/sh
# ckpt post-commit hook — auto-captures reasoning context
ckpt _hook-post-commit 2>/dev/null || true
`;

export const hooks = new Command('hooks')
  .description('Manage git hooks for auto-capture');

hooks
  .command('install')
  .description('Install post-commit hook for auto-capture')
  .action(() => {
    const root = getRepoRoot();
    const hooksDir = join(root, '.git', 'hooks');
    const hookPath = join(hooksDir, 'post-commit');

    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    if (existsSync(hookPath)) {
      console.log('post-commit hook already exists. Skipping.');
      return;
    }

    writeFileSync(hookPath, HOOK_SCRIPT);
    chmodSync(hookPath, '755');
    console.log('Installed post-commit hook.');
  });

hooks
  .command('uninstall')
  .description('Remove the ckpt post-commit hook')
  .action(() => {
    const root = getRepoRoot();
    const hookPath = join(root, '.git', 'hooks', 'post-commit');

    if (!existsSync(hookPath)) {
      console.log('No post-commit hook found.');
      return;
    }

    unlinkSync(hookPath);
    console.log('Removed post-commit hook.');
  });
