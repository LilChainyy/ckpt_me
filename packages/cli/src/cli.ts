import { Command } from 'commander';
import { init } from './commands/init.js';
import { add } from './commands/add.js';
import { commit } from './commands/commit.js';
import { push } from './commands/push.js';
import { log } from './commands/log.js';
import { status } from './commands/status.js';
import { diff } from './commands/diff.js';
import { hooks } from './commands/hooks.js';
import { hookPostCommit } from './commands/hook-post-commit.js';
import { passthrough } from './core/git.js';

const program = new Command();

program
  .name('ckpt')
  .description('The reasoning layer for every code change')
  .version('0.1.0');

program.addCommand(init);
program.addCommand(add);
program.addCommand(commit);
program.addCommand(push);
program.addCommand(log);
program.addCommand(status);
program.addCommand(diff);
program.addCommand(hooks);
program.addCommand(hookPostCommit);

// Git passthrough for unknown commands
program.on('command:*', (operands: string[]) => {
  const exitCode = passthrough(operands);
  process.exit(exitCode);
});

program.parse();
