import { Command } from 'commander';
import { existsSync } from 'fs';
import { ensureCkptDir, getCkptDir } from '../core/config.js';
import { LocalStore } from '../storage/local.js';

export const init = new Command('init')
  .description('Initialize ckpt in the current directory')
  .action(() => {
    const dir = getCkptDir();
    if (existsSync(dir)) {
      console.log(`Already initialized at ${dir}`);
      return;
    }

    ensureCkptDir();

    // Create the database and run migrations
    const store = new LocalStore();
    store.close();

    console.log(`Initialized ckpt at ${dir}`);
  });
