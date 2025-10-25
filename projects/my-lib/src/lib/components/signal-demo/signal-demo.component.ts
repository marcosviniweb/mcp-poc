import { Component, input, output, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeConfig, SizeOption, ValidationState } from './types';

/**
 * Componente de demonstração usando signals (Angular 17+)
 * Este componente usa signal inputs e outputs em vez de decorators
 */
@Component({
  selector: 'lib-signal-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-container">
      <h3>{{ title() }}</h3>
      <p>Count: {{ count() }}</p>
      <p>Enabled: {{ enabled() }}</p>
      <button (click)="handleClick()">Click Me</button>
    </div>
  `,
  styles: `
    .demo-container {
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  `
})
export class SignalDemoComponent {
  /**
   * Título do componente (signal input opcional)
   */
  readonly title = input<string>('Default Title');
  
  /**
   * Contador inicial (signal input obrigatório)
   */
  readonly count = input.required<number>();
  
  /**
   * Estado de habilitação (signal input com default)
   */
  readonly enabled = input<boolean>(true);
  
  /**
   * Configuração de tema (signal input com tipo importado)
   */
  readonly theme = input<ThemeConfig>();
  
  /**
   * Tamanho do componente (signal input com tipo importado)
   */
  readonly size = input<SizeOption>('md');
  
  /**
   * Estado de validação (decorator input com enum importado para testar misto)
   */
  @Input() validationState?: ValidationState;
  
  /**
   * Evento de clique (signal output)
   */
  readonly clicked = output<MouseEvent>();
  
  /**
   * Evento de mudança de valor (signal output com tipo customizado)
   */
  readonly valueChanged = output<{ oldValue: number; newValue: number }>();
  
  /**
   * Evento de mudança de tema (decorator output para testar misto)
   */
  @Output() themeChanged = new EventEmitter<ThemeConfig>();
  
  handleClick(): void {
    const event = new MouseEvent('click');
    this.clicked.emit(event);
  }
}

