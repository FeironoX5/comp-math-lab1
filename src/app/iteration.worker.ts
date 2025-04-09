/// <reference lib="webworker" />

export interface IterationResult {
  steps: number[][];
  solution: number[];
  precisionVector: number[];
  iterations: number;
  norm: number;
}

const MAX_ITERATIONS = 1000000;

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
  const a: number[][] = []; // left side coefficients
  const b: number[] = []; // right side coefficients
  matrix.forEach(row => {
    a.push(row.slice(0, n));
    b.push(row[n]);
  });
  if (n < 2) throw new Error('The matrix must be at least two rows');
  if (precision <= 0) throw new Error('Precision must be a positive number');
  if (!isDiagonallyDominant(a)) throw new Error('The matrix is not diagonally dominant');

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

function isDiagonallyDominant(A: number[][]): boolean {
  return A.every((row, i) => {
    const diag = Math.abs(row[i]);
    let sum = 0;
    for (let j = 0; j < row.length; j++) {
      if (j !== i) {
        sum += Math.abs(row[j]);
      }
    }
    return diag >= sum;
  });
}

function calculateNorm(A: number[][]): number {
  const n = A.length;
  let maxSum = 0;
  for (let i = 0; i < n; i++) {
    const diagElement = A[i][i];
    let sum = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        sum += Math.abs(A[i][j] / diagElement);
      }
    }
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
}

function generateRandomMatrix(size: number, min: number = -10, max: number = 10): number[][] {
  console.log(min, max);
  const range = max - min;
  const matrix: number[][] = [];
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    let sum = 0;
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        const value = min + Math.random() * range;
        row.push(value);
        sum += Math.abs(value);
      } else {
        row.push(0); // placeholder for diagonal element
      }
    }
    row[i] = sum * (1 + Math.random()); // set diagonal element
    row.push(min + Math.random() * range * 2); // random value for right side coefficient
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
