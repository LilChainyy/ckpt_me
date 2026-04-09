import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { CKPT_DIR_NAME, DB_FILE_NAME, DEFAULT_API_URL } from '@ckpt/shared';

export function getCkptDir(): string {
  return join(process.cwd(), CKPT_DIR_NAME);
}

export function getDbPath(): string {
  return join(getCkptDir(), DB_FILE_NAME);
}

export function getApiUrl(): string {
  return process.env.CKPT_API_URL ?? DEFAULT_API_URL;
}

export function requireInit(): void {
  if (!existsSync(getCkptDir())) {
    console.error('Not a ckpt directory. Run `ckpt init` first.');
    process.exit(1);
  }
}

export function ensureCkptDir(): string {
  const dir = getCkptDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    ensureGitignore(process.cwd());
  }
  return dir;
}

function ensureGitignore(repoRoot: string): void {
  const gitignorePath = join(repoRoot, '.gitignore');
  const entry = '.ckpt/';

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.split('\n').includes(entry)) return;
    const sep = content.endsWith('\n') ? '' : '\n';
    writeFileSync(gitignorePath, content + sep + entry + '\n');
  } else {
    writeFileSync(gitignorePath, entry + '\n');
  }
}
