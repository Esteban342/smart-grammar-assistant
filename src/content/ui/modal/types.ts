// src/content/ui/modal/types.ts
// Tipos compartidos del sistema de modales.

import type { EditableTarget } from '../../types';

export type SelectionSource = 'dom' | 'docs-canvas';

export interface FloatingMenuOptions {
  text: string;
  x: number;
  y: number;
  source: SelectionSource;
  editableTarget?: EditableTarget | null;
}

export interface GrammarSuggestion {
  from: string;
  to: string;
  applied: boolean;
}

export interface GrammarState {
  originalText: string;
  correctedText: string;
  suggestions: GrammarSuggestion[];
}