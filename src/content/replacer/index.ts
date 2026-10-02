// src/content/replacer/index.ts
// API publica del modulo de reemplazo.
// Decide que estrategia usar segun el tipo de objetivo.

import type { EditableTarget } from '../types';
import type { ReplaceResult } from './types';
import { replaceInDocs } from './docs';
import {
  replaceInInput,
  replaceInContentEditable,
  replaceViaClipboard,
} from './standard';

export type { ReplaceResult };

export async function replaceTextInPage(
  target: EditableTarget,
  newText: string
): Promise<ReplaceResult> {
  // Google Docs: usa chrome.debugger en el background
  if (target.type === 'canvas-docs') {
    return replaceInDocs(target, newText);
  }

  // Inputs y textareas: reemplazo directo de .value
  if (target.type === 'input' || target.type === 'textarea') {
    return replaceInInput(target, newText);
  }

  // Contenteditable: intenta insertText primero
  if (target.type === 'contenteditable' && target.range) {
    const result = replaceInContentEditable(target, newText);
    if (result === 'inserted') return result;
  }

  // Fallback universal: copiar al portapapeles y pegar
  return replaceViaClipboard(target, newText);
}