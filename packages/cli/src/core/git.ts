import { execaSync } from 'execa';

export function run(
  args: string[],
  options?: { capture?: boolean }
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execaSync('git', args, {
      stdio: options?.capture ? 'pipe' : 'inherit',
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.exitCode ?? 0,
    };
  } catch (error: any) {
    if (error.exitCode !== undefined) {
      return {
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
        exitCode: error.exitCode,
      };
    }
    throw error;
  }
}

export function passthrough(args: string[]): number {
  const result = run(args);
  return result.exitCode;
}

export function getRepoRoot(): string {
  const { stdout } = run(['rev-parse', '--show-toplevel'], { capture: true });
  return stdout.trim();
}

export function getStagedFiles(): string[] {
  const { stdout } = run(['diff', '--cached', '--name-only'], { capture: true });
  return stdout.trim() ? stdout.trim().split('\n') : [];
}

export function getHeadHash(): string {
  const { stdout } = run(['rev-parse', 'HEAD'], { capture: true });
  return stdout.trim();
}

export function getParentHash(): string {
  const { stdout, exitCode } = run(['rev-parse', 'HEAD~1'], { capture: true });
  return exitCode === 0 ? stdout.trim() : '';
}

export function getAuthor(): string {
  const { stdout: name } = run(['config', 'user.name'], { capture: true });
  const { stdout: email } = run(['config', 'user.email'], { capture: true });
  const n = name.trim();
  const e = email.trim();
  if (n && e) return `${n} <${e}>`;
  return n || e || 'unknown';
}

export function getCommittedFiles(commitHash: string): string[] {
  const { stdout } = run(
    ['diff-tree', '--no-commit-id', '--name-only', '-r', commitHash],
    { capture: true }
  );
  return stdout.trim() ? stdout.trim().split('\n') : [];
}

export function getRepoUrl(): string {
  try {
    const { stdout, exitCode } = run(['remote', 'get-url', 'origin'], { capture: true });
    return exitCode === 0 ? stdout.trim() : '';
  } catch {
    return '';
  }
}
