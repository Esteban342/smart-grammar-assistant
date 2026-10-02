// src/content/ui/modal/state.ts
// Estado compartido entre los modulos del modal.

import type { FloatingMenuOptions, GrammarState } from './types';

export interface AppState {
  modalCache: Record<string, string>;
  isProcessing: boolean;
  currentTypingInterval: ReturnType<typeof setInterval> | null;
  currentOptions: FloatingMenuOptions | null;
  grammarState: GrammarState | null;
}

export const appState: AppState = {
  modalCache: {},
  isProcessing: false,
  currentTypingInterval: null,
  currentOptions: null,
  grammarState: null,
};