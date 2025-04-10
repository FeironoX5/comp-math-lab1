import {ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatrixInputComponent} from './matrix-input/matrix-input.component';
import {FormsModule} from '@angular/forms';
import {IterationResult, MAX_ITERATIONS} from './iteration.worker';
import {MatTooltip} from '@angular/material/tooltip';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatDrawer, MatDrawerContainer} from '@angular/material/sidenav';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

export interface ParsedMatrixData {
  n: number;
  accuracy: number;
  matrix: number[][];
}

@Component({
  selector: 'app-root',
  imports: [MatrixInputComponent, FormsModule, MatTooltip, MatProgressSpinner, MatDrawerContainer, MatDrawer, MatIconButton, MatIcon],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(MatrixInputComponent) matrixInput!: MatrixInputComponent;

  size: number = 2;
  accuracy: number = 0.0001;
  minMatrixValue: number = -10000;
  maxMatrixValue: number = 10000;
  result?: IterationResult;
  error?: string;
  progress: number = 0;

  private worker: Worker | null = null;

  constructor(private cdr: ChangeDetectorRef) {
  }

  ngOnInit() {
    if (typeof Worker !== 'undefined') {
      this.initWorker();
    } else {
      this.error = 'Web Workers are not supported in this browser. The application may be slow during calculations.';
    }
  }

  ngOnDestroy() {
    this.terminateWorker();
  }

  private initWorker() {
    this.worker = new Worker(new URL('./iteration.worker', import.meta.url));

    this.worker.onmessage = ({data}) => {
      if (data.action === 'matrixGenerated') {
        this.matrixInput.updateMatrix(data.matrix);
        this.cdr.detectChanges();
      } else if (data.progress) {
        this.progress = data.progress;
        this.cdr.detectChanges();
      } else if (data.success === true) {
        this.progress = 0;
        this.result = data.result;
        this.error = undefined;
        this.cdr.detectChanges();
      } else if (data.success === false) {
        this.progress = 0;
        this.error = data.error;
        this.result = undefined;
        this.cdr.detectChanges();
      }
    };

    this.worker.onerror = (event) => {
      this.error = `Worker error: ${event.message}`;
      this.progress = 0;
      this.cdr.detectChanges();
    };
  }

  private terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  compute() {
    const matrix = this.matrixInput.getMatrix();
    this.error = undefined;
    this.progress = 0;
    this.worker?.postMessage({
      matrix,
      precision: this.accuracy
    });
    this.cdr.detectChanges();
  }

  setSize(newSize: number = this.size) {
    this.size = Math.min(Math.max(1, newSize), 20);
    this.cdr.detectChanges();
  }

  public randomize() {
    if (!this.minMatrixValue || !this.maxMatrixValue || Number(this.minMatrixValue) > Number(this.maxMatrixValue)) {
      this.error = "Wrong matrix values provided";
      return;
    }
    this.stopCalculation();
    this.worker?.postMessage({
      action: 'generateMatrix',
      size: this.size,
      min: Number(this.minMatrixValue),
      max: Number(this.maxMatrixValue)
    });
  }

  stopCalculation() {
    this.terminateWorker();
    this.initWorker();
    this.progress = 0;
    this.cdr.detectChanges();
  }

  parseMatrixFile(file: File): Promise<ParsedMatrixData> {
    return new Promise<ParsedMatrixData>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(new Error("Error while file reading"));
      };
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error("Wrong data format"));
          return;
        }
        try {
          const lines = reader.result.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length < 1) {
            throw new Error("File is null");
          }
          let firstLine = lines[0].trim().replace(/,/g, ' ');
          const firstLineParts = firstLine.split(/\s+/);
          if (firstLineParts.length < 2) {
            throw new Error("First line should have two numbers: matrix size and accuracy");
          }
          const n = parseInt(firstLineParts[0], 10);
          const accuracy = parseFloat(firstLineParts[1]);

          if (isNaN(n) || isNaN(accuracy)) {
            throw new Error("Wrong numbers in first line");
          }
          if (n <= 0) {
            throw new Error("Matrix size should be greater than 0");
          }
          if (lines.length - 1 < n) {
            throw new Error(`Expected ${n} matrix rows, got ${lines.length - 1}`);
          }
          const matrix: number[][] = [];
          for (let i = 0; i < n; i++) {
            const rowLine = lines[i + 1].trim();
            const rowParts = rowLine.split(',').map(val => val.trim());
            if (rowParts.length !== n + 1) {
              throw new Error(`It was expected ${n + 1} elements in row #${i + 2}`);
            }
            const row = rowParts.map(val => {
              const num = parseFloat(val);
              if (isNaN(num)) {
                throw new Error(`Wrong number '${val}' in ${i + 2} row`);
              }
              return num;
            });
            matrix.push(row);
          }
          resolve({n, accuracy, matrix});
        } catch (error: any) {
          this.error = error.message;
        }
      };
      reader.readAsText(file);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.parseMatrixFile(file)
        .then(parsedData => {
          this.size = parsedData.n;
          this.accuracy = parsedData.accuracy;
          this.matrixInput.updateMatrix(parsedData.matrix);
          this.error = undefined;
          this.cdr.detectChanges();
        })
        .catch(err => {
          this.error = err.message;
          this.cdr.detectChanges();
        });
    }
  }

  protected readonly MAX_ITERATIONS = MAX_ITERATIONS;
}
