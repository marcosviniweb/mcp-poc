import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'lib-reusable-io',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reusable-io.component.html',
  styles: `
    :host { display: inline-flex; gap: .5rem; align-items: center; }
    label { font-weight: 600; }
    input { padding: .25rem .5rem; }
    button { padding: .25rem .5rem; }
  `
})
export class ReusableIoComponent {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'number' | 'password' = 'text';
  @Input() disabled: boolean = false;
  @Input() submitText: string = 'OK';

  private _value: string | number = '';

  @Input()
  set value(val: string | number) {
    this._value = val;
    this.internalValue = val as any;
  }
  get value(): string | number {
    return this._value;
  }

  @Output() valueChange: EventEmitter<string | number> = new EventEmitter();
  @Output() submitted: EventEmitter<string | number> = new EventEmitter();

  internalValue: string | number = '';

  onValueChange(next: string | number): void {
    this.internalValue = next;
    this._value = next;
    this.valueChange.emit(next);
  }

  onSubmit(): void {
    this.submitted.emit(this.internalValue);
  }
}


