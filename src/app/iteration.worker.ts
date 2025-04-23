/// <reference lib="webworker" />

export interface IterationResult {
  steps: number[][];
  solution: number[];
  precisionVector: number[];
  iterations: number;
  norm: number;
}

export const MAX_ITERATIONS = 1000000;

addEventListener('message',
  ({data}: {
    data: {
      matrix: number[][];
      precision: number;
    }
  }) => {
    try {
      const result = compute(data.matrix, data.precision);
      postMessage({
        success: true,
        result
      });
    } catch (error) {
      postMessage({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

function compute(matrix: number[][], precision: number): IterationResult {
  // STEP 1. PARSE MATRIX & VALIDATE ARGS
  const n = matrix.length; // number of rows
  let a: number[][] = []; // left side coefficients
  const b: number[] = []; // right side coefficients
  matrix.forEach(row => {
    a.push(row.slice(0, n));
    b.push(row[n]);
  });
  if (n < 2) throw new Error('The matrix must be at least two rows');
  if (precision <= 0) throw new Error('Precision must be a positive number');
  if (calculateNorm(a) >= 1) {
    const {matrix: modifiedA, success} = tryMakeDiagonallyDominant(a);
    if (!success) throw new Error('The matrix is not diagonally dominant');
    else a = modifiedA;
  }

  // STEP 2. GENERAL VARS
  const norm = calculateNorm(a);
  const steps: number[][] = [];
  let xOld = [...b]; // initial approximation
  let xNew = new Array(n).fill(0);
  let precisionVector: number[] = [];
  let iterations = 0;

  // STEP 3. COMPUTE
  steps.push([...xOld]);
  while (iterations < MAX_ITERATIONS) {
    // Calculate new approximation
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      const diagElement = a[i][i];
      const diagInverse = 1 / diagElement;
      for (let j = 0; j < n; j++) {
        if (i != j) {
          sum -= a[i][j] * xOld[j];
        }
      }
      xNew[i] = sum * diagInverse;
    }
    precisionVector = xNew.map((val, i) => Math.abs(val - xOld[i]));

    iterations++;
    if (Math.max(...precisionVector) <= precision) break;
    steps.push([...xNew]);
    [xOld, xNew] = [xNew, xOld];
    if (iterations % 100 === 0) postMessage({
      progress: iterations,
      norm
    });
  }

  if (iterations >= MAX_ITERATIONS) throw new Error('Too many iterations');
  return {
    steps,
    solution: xOld,
    precisionVector,
    iterations,
    norm
  };
}

function tryMakeDiagonallyDominant(A: number[][]): { matrix: number[][], success: boolean } {
  const n = A.length;
  const matrix = A.map(row => [...row]);
  for (let i = 0; i < n; i++) {
    if (Math.abs(matrix[i][i]) <= getRowSumWithoutDiagonal(matrix[i], i)) {
      let found = false;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix[j][i]) > getRowSumWithoutDiagonal(matrix[j], i)) {
          [matrix[i], matrix[j]] = [matrix[j], matrix[i]];
          found = true;
          break;
        }
      }
      if (!found) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(matrix[i][j]) > getColSumWithoutDiagonal(matrix, i, j)) {
            for (let k = 0; k < n; k++) {
              [matrix[k][i], matrix[k][j]] = [matrix[k][j], matrix[k][i]];
            }
            found = true;
            break;
          }
        }
      }
      if (!found) {
        return {matrix: A, success: false};
      }
    }
  }
  return {matrix, success: calculateNorm(matrix) < 1};
}

function getRowSumWithoutDiagonal(row: number[], index: number): number {
  let sum = 0;
  for (let i = 0; i < row.length; i++) {
    if (i !== index) {
      sum += Math.abs(row[i]);
    }
  }
  return sum;
}

function getColSumWithoutDiagonal(matrix: number[][], colIndex: number, excludeRow: number): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    if (i !== excludeRow) {
      sum += Math.abs(matrix[i][colIndex]);
    }
  }
  return sum;
}

function calculateNorm(A: number[][]): number {
  const n = A.length;
  let maxSum = 0;
  for (let i = 0; i < n; i++) {
    const diagElement = A[i][i];
    let rowSum = 0;
    A[i].forEach((val, j) =>
      i != j && (rowSum += Math.abs(val / diagElement))
    );
    maxSum = Math.max(maxSum, rowSum);
  }
  return maxSum;
}

function generateRandomMatrix(size: number, min: number = -10, max: number = 10): number[][] {
  const range = max - min;
  const matrix: number[][] = [];
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    let sum = 0;
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        let value = min + Math.random() * range;
        value = Math.round(value * 1000) / 1000;
        row.push(value);
        sum += Math.abs(value);
      } else {
        row.push(0); // placeholder for diagonal element
      }
    }
    row[i] = sum * (1 + Math.random() / 2); // set diagonal element
    row[i] = Math.round(row[i] * 1000) / 1000;
    let rightSideK = min + Math.random() * range * 2;
    rightSideK = Math.round(rightSideK * 1000) / 1000;
    row.push(rightSideK); // random value for right side coefficient
    matrix.push(row);
  }
  return matrix;
}

function handleGenerateMatrix({size, min, max}: { size: number, min?: number, max?: number }): number[][] {
  return generateRandomMatrix(size, min, max);
}

addEventListener('message', ({data}) => {
  if (data.action === 'generateMatrix') {
    const matrix = handleGenerateMatrix(data);
    postMessage({
      action: 'matrixGenerated',
      matrix
    });
  }
});
