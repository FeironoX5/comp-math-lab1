import {ChangeDetectorRef, Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {trigger, style, animate, transition} from '@angular/animations';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-matrix-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './matrix-input.component.html',
  styleUrls: ['./matrix-input.component.css'],
  animations: [
    trigger('rowAnimation', [
      transition(':enter', [
        style({opacity: 0, transform: 'translateY(-15px)'}),
        animate('200ms ease-out', style({opacity: 1, transform: 'translateY(0)'}))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({opacity: 0, transform: 'translateY(15px)'}))
      ])
    ]),
    trigger('cellAnimation', [
      transition(':enter', [
        style({opacity: 0, transform: 'scale(0.9)'}),
        animate('200ms ease-out', style({opacity: 1, transform: 'scale(1)'}))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({opacity: 0, transform: 'scale(0.9)'}))
      ])
    ])
  ]
})
export class MatrixInputComponent {
  @Input() size = 2;
  protected matrix = signal<number[][]>([]);
  @Output() matrixChange = new EventEmitter();

  constructor() {
    setTimeout(() => this.updateMatrix([[0, 0, 0], [0, 0, 0]]))
  }

  public updateMatrix(newMatrix: number[][]) {
    this.matrix.set(newMatrix);
    this.matrixChange.emit();
  }

  public fillMatrix() {
    const newMatrix: number[][] = [];
    for (let i = 0; i < this.size; i++) {
      const row = [];
      for (let j = 0; j < this.size + 1; j++) {
        row.push(this.matrix()[i]?.[j] ?? 0);
      }
      newMatrix.push(row);
    }
    this.updateMatrix(newMatrix);
  }

  updateCell(rowIndex: number, colIndex: number, value: number) {
    const newMatrix = this.matrix().map(row => [...row]);
    newMatrix[rowIndex][colIndex] = value;
    this.updateMatrix(newMatrix);
  }


  public getMatrix() {
    return this.matrix();
  }

}
