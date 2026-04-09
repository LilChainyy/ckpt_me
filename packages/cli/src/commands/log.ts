import { Command } from 'commander';
import { run } from '../core/git.js';
import { requireInit } from '../core/config.js';
import { LocalStore } from '../storage/local.js';

export const log = new Command('log')
  .description('Show commit log with optional reasoning')
  .option('--reasoning', 'show reasoning for each commit')
  .option('-n <count>', 'limit number of commits')
  .allowUnknownOption(true)
  .action((opts: { reasoning?: boolean; n?: string }, cmd: Command) => {
    if (!opts.reasoning) {
      const gitArgs = ['log'];
      if (opts.n) gitArgs.push('-n', opts.n);
      gitArgs.push(...(cmd.args ?? []));
      const result = run(gitArgs);
      process.exit(result.exitCode);
    }

    requireInit();
    // Enriched log with reasoning
    const gitArgs = ['log', '--format=%H|%s'];
    if (opts.n) gitArgs.push('-n', opts.n);
    gitArgs.push(...(cmd.args ?? []));

    const result = run(gitArgs, { capture: true });
    if (result.exitCode !== 0) process.exit(result.exitCode);

    const store = new LocalStore();
    const lines = result.stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const sepIdx = line.indexOf('|');
      const hash = line.slice(0, sepIdx);
      const subject = line.slice(sepIdx + 1);

      console.log(`commit ${hash}`);
      console.log(`    ${subject}`);

      const record = store.getReasoningByCommit(hash);
      if (record?.reasoning) {
        console.log(`    reasoning: ${record.reasoning}`);
      }
      console.log();
    }

    store.close();
  });
