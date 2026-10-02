// src/content/core/selection-helpers.ts
// Funciones auxiliares para extraer texto y detectar campos editables.

import { SA_DEBUG } from '../selection';
import type { EditableTarget } from '../types';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

// Intenta extraer texto seleccionado atravesando shadow DOM profundo.
// Se usa como respaldo cuando las estrategias principales fallan.
export function extractDeepTextFallback(): string {
  const sel = window.getSelection();
  let text = sel?.toString().trim() || '';

  if (!text) {
    let activeEl: any = document.activeElement;
    while (activeEl && activeEl.shadowRoot) {
      const shadowSel = activeEl.shadowRoot.getSelection?.();
      if (shadowSel) {
        text = shadowSel.toString().trim();
        if (text) break;
      }
      activeEl = activeEl.shadowRoot.activeElement;
    }
  }

  if (!text && sel && sel.rangeCount > 0) {
    try {
      const range = sel.getRangeAt(0);
      text = range.cloneContents().textContent?.trim() || '';
    } catch {
      // ignorar
    }
  }

  log('extractDeepTextFallback ->', JSON.stringify(text.slice(0, 40)));
  return text;
}

// Determina si un elemento es un campo editable y devuelve los datos
// necesarios para reemplazar texto en el.
export function detectEditableTarget(el: Element | null): EditableTarget | null {
  if (!el) return null;
  const tag = el.tagName;

  if (tag === 'TEXTAREA' || (tag === 'INPUT' && isTextLikeInput(el as HTMLInputElement))) {
    const field = el as HTMLInputElement | HTMLTextAreaElement;
    return {
      element: field,
      type: tag === 'TEXTAREA' ? 'textarea' : 'input',
      start: field.selectionStart ?? 0,
      end: field.selectionEnd ?? 0,
    };
  }

  if ((el as HTMLElement).isContentEditable) {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : undefined;
    return { element: el as HTMLElement, type: 'contenteditable', range };
  }

  return null;
}

function isTextLikeInput(el: HTMLInputElement): boolean {
  const nonTextTypes = ['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color', 'image', 'reset'];
  return !nonTextTypes.includes(el.type);
}