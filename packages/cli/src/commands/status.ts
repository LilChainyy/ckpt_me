import { existsSync } from 'fs';
import { Command } from 'commander';
import { run } from '../core/git.js';
import { getCkptDir } from '../core/config.js';
import { LocalStore } from '../storage/local.js';

export const status = new Command('status')
  .description('Show git status with pending reasoning')
  .allowUnknownOption(true)
  .action((_opts: unknown, cmd: Command) => {
    const result = run(['status', ...(cmd.args ?? [])]);

    if (existsSync(getCkptDir())) {
      const store = new LocalStore();
      const records = store.getStagingRecords();

      if (records.length > 0) {
        console.log('\n--- ckpt staging ---');
        for (const record of records) {
          const reasoning = record.reasoning as string | null;
          console.log(`  ${reasoning ?? '(no reasoning)'}`);
          const files = JSON.parse((record.files as string) ?? '[]') as string[];
          for (const f of files) {
            console.log(`    ${f}`);
          }
        }
      }

      store.close();
    }

    process.exit(result.exitCode);
  });
