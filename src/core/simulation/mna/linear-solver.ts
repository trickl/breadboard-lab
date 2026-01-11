import { SINGULAR_THRESHOLD } from '../constants';

/**
 * Solve linear system G*x = b using Gaussian elimination with partial pivoting.
 *
 * Extracted from `CircuitSimulator`.
 */
export function solveLinearSystem(G: number[][], b: number[]): number[] | null {
  const n = G.length;
  if (n === 0) return [];

  // Create augmented matrix [G | b]
  const A: number[][] = G.map((row, i) => [...row, b[i]]);

  if (!forwardEliminateInPlace(A)) {
    return null;
  }

  return backSubstitute(A);
}

function forwardEliminateInPlace(A: number[][]): boolean {
  const n = A.length;
  for (let col = 0; col < n; col++) {
    const pivotRow = findPivotRow(A, col);
    if (Math.abs(A[pivotRow][col]) < SINGULAR_THRESHOLD) {
      return false;
    }

    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
    }

    eliminateBelowPivot(A, col);
  }
  return true;
}

function findPivotRow(A: number[][], col: number): number {
  const n = A.length;
  let maxRow = col;
  for (let row = col + 1; row < n; row++) {
    if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) {
      maxRow = row;
    }
  }
  return maxRow;
}

function eliminateBelowPivot(A: number[][], col: number): void {
  const n = A.length;
  for (let row = col + 1; row < n; row++) {
    const factor = A[row][col] / A[col][col];
    for (let k = col; k <= n; k++) {
      A[row][k] -= factor * A[col][k];
    }
  }
}

function backSubstitute(A: number[][]): number[] {
  const n = A.length;
  const x: number[] = Array(n).fill(0);

  for (let row = n - 1; row >= 0; row--) {
    let sum = A[row][n];
    for (let col = row + 1; col < n; col++) {
      sum -= A[row][col] * x[col];
    }
    x[row] = sum / A[row][row];
  }

  return x;
}
