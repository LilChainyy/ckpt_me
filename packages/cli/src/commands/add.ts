import { Command } from 'commander';
import { run, getStagedFiles } from '../core/git.js';
import { requireInit } from '../core/config.js';
import { LocalStore } from '../storage/local.js';

export const add = new Command('add')
  .description('Stage files and optionally attach reasoning')
  .argument('[files...]', 'files to stage')
  .option('-A, --all', 'stage all changes')
  .option('--reasoning <text>', 'reasoning for these changes')
  .allowUnknownOption(true)
  .action((files: string[], opts: { all?: boolean; reasoning?: string }) => {
    requireInit();

    const gitArgs = ['add'];
    if (opts.all) gitArgs.push('--all');
    if (files.length > 0) gitArgs.push(...files);
    if (!opts.all && files.length === 0) {
      console.error('Nothing to add. Use ckpt add <files> or ckpt add --all');
      process.exit(1);
    }

    const result = run(gitArgs);
    if (result.exitCode !== 0) process.exit(result.exitCode);

    if (opts.reasoning) {
      const staged = getStagedFiles();
      const store = new LocalStore();
      store.addStaging(staged, opts.reasoning);
      store.close();
      console.log(`Staged ${staged.length} file(s) with reasoning.`);
    }
  });
