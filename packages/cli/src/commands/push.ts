import { Command } from 'commander';
import { run, getRepoUrl } from '../core/git.js';
import { requireInit } from '../core/config.js';
import { LocalStore } from '../storage/local.js';
import { syncReasoning } from '../sync/client.js';

export const push = new Command('push')
  .description('Push to remote and sync reasoning')
  .argument('[remote]', 'remote name', 'origin')
  .argument('[branch]', 'branch name')
  .allowUnknownOption(true)
  .action(async (remote: string, branch: string | undefined, _opts: unknown, cmd: Command) => {
    requireInit();
    const gitArgs = ['push', remote];
    if (branch) gitArgs.push(branch);
    const extra = cmd.args?.filter((a: string) => a !== remote && a !== branch) ?? [];
    gitArgs.push(...extra);

    const result = run(gitArgs);
    if (result.exitCode !== 0) process.exit(result.exitCode);

    const store = new LocalStore();
    const unsynced = store.getUnsynced();

    if (unsynced.length === 0) {
      console.log('No reasoning records to sync.');
      store.close();
      return;
    }

    console.log(`Syncing ${unsynced.length} reasoning record(s)...`);
    const syncedIds = await syncReasoning(unsynced);

    if (syncedIds.length > 0) {
      store.markSynced(syncedIds);
      console.log(`Synced ${syncedIds.length} record(s).`);
    }

    store.close();
  });
