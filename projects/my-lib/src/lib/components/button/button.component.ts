import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styles: `
    :host { display: inline-block; }
    button {
      border: 0; cursor: pointer; border-radius: 6px; font-weight: 600;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background-color .2s ease, box-shadow .2s ease, opacity .2s ease;
    }
    button:disabled { cursor: not-allowed; opacity: .6; }
    /* sizes */
    .size-sm { padding: .25rem .5rem; font-size: .875rem; }
    .size-md { padding: .5rem .75rem; font-size: 1rem; }
    .size-lg { padding: .75rem 1rem; font-size: 1.125rem; }
    /* variants */
    .variant-primary { background: #2563eb; color: #fff; }
    .variant-primary:hover { background: #1d4ed8; }
    .variant-secondary { background: #e5e7eb; color: #111827; }
    .variant-secondary:hover { background: #d1d5db; }
    .variant-danger { background: #dc2626; color: #fff; }
    .variant-danger:hover { background: #b91c1c; }
    .variant-link { background: transparent; color: #2563eb; text-decoration: underline; }
    .variant-link:hover { color: #1d4ed8; }
    /* full width */
    .full { width: 100%; }
    /* loading spinner */
    .spinner {
      width: 1em; height: 1em; margin-right: .5em; border: 2px solid currentColor;
      border-top-color: transparent; border-radius: 50%; display: inline-block;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `
})
export class ButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'link' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth: boolean = false;
  @Input() ariaLabel?: string;

  @Output() clicked: EventEmitter<Event> = new EventEmitter<Event>();

  get computedClass(): string {
    const classes: string[] = [];
    classes.push(`size-${this.size}`);
    classes.push(`variant-${this.variant}`);
    if (this.fullWidth) classes.push('full');
    return classes.join(' ');
  }

  onClick(event: Event): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}


