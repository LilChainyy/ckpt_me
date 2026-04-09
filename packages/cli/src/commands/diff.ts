import { Command } from 'commander';
import { run } from '../core/git.js';

export const diff = new Command('diff')
  .description('Show changes (passthrough to git diff)')
  .argument('[files...]', 'files to diff')
  .allowUnknownOption(true)
  .action((files: string[], _opts: unknown, cmd: Command) => {
    const gitArgs = ['diff', ...files, ...(cmd.args ?? [])];
    const result = run(gitArgs);
    process.exit(result.exitCode);
  });
