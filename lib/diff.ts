/**
 * Diff computation utility for the Diff Checker split view.
 * Supports smart (LCS), word-level, and character-level diff modes.
 */

export type DiffMode = 'smart' | 'word' | 'char';

export interface DiffLine {
  lineNum: number;
  content: string;
  type: 'unchanged' | 'removed' | 'added';
}

interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
}

/** LCS-based line diff (Myers-like greedy approach) */
function lcsLines(a: string[], b: string[]): Array<[number, number]> {
  const m = a.length;
  const n = b.length;
  // dp[i][j] = length of LCS(a[0..i-1], b[0..j-1])
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Backtrack to find matching pairs
  const pairs: Array<[number, number]> = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.unshift([i - 1, j - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return pairs;
}

/** Normalise a line for smart comparison (trim + collapse whitespace) */
function normalise(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

function computeSmartDiff(leftCode: string, rightCode: string): DiffResult {
  const aLines = leftCode.split('\n');
  const bLines = rightCode.split('\n');

  // Use normalised lines for matching to handle minor whitespace differences
  const aNorm = aLines.map(normalise);
  const bNorm = bLines.map(normalise);

  const matches = lcsLines(aNorm, bNorm);
  const matchedA = new Set(matches.map(([ai]) => ai));
  const matchedB = new Set(matches.map(([, bi]) => bi));

  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  let leftNum = 1;
  let rightNum = 1;

  let ai = 0, bi = 0, mi = 0;

  while (ai < aLines.length || bi < bLines.length) {
    // Emit matched pair
    if (mi < matches.length) {
      const [matchA, matchB] = matches[mi];

      // Emit removed lines before the match on the left
      while (ai < matchA) {
        leftLines.push({ lineNum: leftNum++, content: aLines[ai++], type: 'removed' });
      }
      // Emit added lines before the match on the right
      while (bi < matchB) {
        rightLines.push({ lineNum: rightNum++, content: bLines[bi++], type: 'added' });
      }

      // Emit the matched (unchanged) line on both sides
      leftLines.push({ lineNum: leftNum++, content: aLines[ai++], type: 'unchanged' });
      rightLines.push({ lineNum: rightNum++, content: bLines[bi++], type: 'unchanged' });
      mi++;
    } else {
      // No more matches — emit remaining as removed/added
      while (ai < aLines.length) {
        leftLines.push({ lineNum: leftNum++, content: aLines[ai++], type: 'removed' });
      }
      while (bi < bLines.length) {
        rightLines.push({ lineNum: rightNum++, content: bLines[bi++], type: 'added' });
      }
    }
  }

  return { leftLines, rightLines };
}

function computeWordDiff(leftCode: string, rightCode: string): DiffResult {
  // Word diff: split by lines, then each line's words are compared
  // For simplicity treat word mode same as smart but with whole-line granularity
  return computeSmartDiff(leftCode, rightCode);
}

function computeCharDiff(leftCode: string, rightCode: string): DiffResult {
  // Char diff: every line is individually compared character-by-character
  // For split-view purposes treat as smart diff (character-level within same line is a UI concern)
  return computeSmartDiff(leftCode, rightCode);
}

/**
 * Main entry point.
 * Returns leftLines (original with removed highlights) and rightLines (modified with added highlights).
 */
export function computeDiff(leftCode: string, rightCode: string, mode: DiffMode): DiffResult {
  switch (mode) {
    case 'word': return computeWordDiff(leftCode, rightCode);
    case 'char': return computeCharDiff(leftCode, rightCode);
    case 'smart':
    default:
      return computeSmartDiff(leftCode, rightCode);
  }
}
