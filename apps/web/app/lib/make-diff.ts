/**
 * Builds a minimal unified diff string from two plain text strings.
 * Used to feed react-diff-view's parseDiff without a real git backend.
 */
export function makeDiff(oldCode: string, newCode: string, filename = 'file'): string {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  // Compute LCS-based edit script (Myers diff)
  const edits = myersDiff(oldLines, newLines);

  // Build hunk(s) — collapse everything into one hunk with 3 lines of context
  const CONTEXT = 3;
  const hunks = buildHunks(edits, oldLines, newLines, CONTEXT);

  const header = `diff --git a/${filename} b/${filename}\n--- a/${filename}\n+++ b/${filename}\n`;
  return header + hunks.join('');
}

/**
 * For an unchanged file: show the full content as neutral context lines
 * so the user can read the whole file, but nothing is highlighted.
 */
export function makeUnchangedDiff(code: string, filename = 'file'): string {
  const lines = code.split('\n');
  const header = `diff --git a/${filename} b/${filename}\n--- a/${filename}\n+++ b/${filename}\n`;
  const hunkHeader = `@@ -1,${lines.length} +1,${lines.length} @@\n`;
  const body = lines.map(l => ` ${l}`).join('\n') + '\n';
  return header + hunkHeader + body;
}

/**
 * For step 1 (no previous code), produce a diff where every line is an insertion.
 */
export function makeAddedDiff(newCode: string, filename = 'file'): string {
  const newLines = newCode.split('\n');
  const header = `diff --git a/${filename} b/${filename}\n--- /dev/null\n+++ b/${filename}\n`;
  const hunkHeader = `@@ -0,0 +1,${newLines.length} @@\n`;
  const body = newLines.map(l => `+${l}`).join('\n') + '\n';
  return header + hunkHeader + body;
}

// ─── Myers diff ──────────────────────────────────────────────────────────────

type Edit = { type: 'equal' | 'insert' | 'delete'; oldIdx: number; newIdx: number };

function myersDiff(a: string[], b: string[]): Edit[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;

  const v: number[] = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      const ki = k + max;
      let x: number;
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
        x = v[ki + 1];
      } else {
        x = v[ki - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[ki] = x;
      if (x >= n && y >= m) {
        return backtrack(trace, a, b, max);
      }
    }
  }
  return backtrack(trace, a, b, max);
}

function backtrack(trace: number[][], a: string[], b: string[], max: number): Edit[] {
  const edits: Edit[] = [];
  let x = a.length;
  let y = b.length;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    const ki = k + max;

    let prevK: number;
    if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevKi = prevK + max;
    const prevX = v[prevKi];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ type: 'equal', oldIdx: x - 1, newIdx: y - 1 });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        edits.push({ type: 'insert', oldIdx: x, newIdx: y - 1 });
        y--;
      } else {
        edits.push({ type: 'delete', oldIdx: x - 1, newIdx: y });
        x--;
      }
    }
  }

  return edits.reverse();
}

// ─── Hunk builder ────────────────────────────────────────────────────────────

function buildHunks(
  edits: Edit[],
  oldLines: string[],
  newLines: string[],
  context: number
): string[] {
  // Determine which old-line indices are "changed" (delete or the surrounding context of an insert)
  // We'll work with old/new indices directly.

  // Build a flat list of lines with their disposition
  type LineEntry = {
    type: 'equal' | 'insert' | 'delete';
    oldLine?: number; // 1-indexed
    newLine?: number; // 1-indexed
    content: string;
  };

  const lines: LineEntry[] = edits.map(e => {
    if (e.type === 'equal') {
      return { type: 'equal', oldLine: e.oldIdx + 1, newLine: e.newIdx + 1, content: oldLines[e.oldIdx] };
    } else if (e.type === 'delete') {
      return { type: 'delete', oldLine: e.oldIdx + 1, content: oldLines[e.oldIdx] };
    } else {
      return { type: 'insert', newLine: e.newIdx + 1, content: newLines[e.newIdx] };
    }
  });

  // Find changed line indices
  const changedIndices = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== 'equal') changedIndices.add(i);
  });

  if (changedIndices.size === 0) return [];

  // Group into hunk ranges (changed ± context, merged if overlapping)
  const ranges: [number, number][] = [];
  for (const ci of Array.from(changedIndices).sort((a, b) => a - b)) {
    const start = Math.max(0, ci - context);
    const end = Math.min(lines.length - 1, ci + context);
    if (ranges.length > 0 && start <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end);
    } else {
      ranges.push([start, end]);
    }
  }

  return ranges.map(([start, end]) => {
    const slice = lines.slice(start, end + 1);

    const oldStart = slice.find(l => l.oldLine != null)?.oldLine ?? 1;
    const newStart = slice.find(l => l.newLine != null)?.newLine ?? 1;
    const oldCount = slice.filter(l => l.type !== 'insert').length;
    const newCount = slice.filter(l => l.type !== 'delete').length;

    const hunkHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;
    const body = slice
      .map(l => {
        const prefix = l.type === 'equal' ? ' ' : l.type === 'insert' ? '+' : '-';
        return prefix + l.content;
      })
      .join('\n') + '\n';

    return hunkHeader + body;
  });
}
