/**
 * Configuração de tema customizada
 */
export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

/**
 * Opções de tamanho
 */
export type SizeOption = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Estado de validação
 */
export enum ValidationState {
  Valid = 'valid',
  Invalid = 'invalid',
  Pending = 'pending'
}

