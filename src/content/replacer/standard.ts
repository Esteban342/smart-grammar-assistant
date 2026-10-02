// src/content/replacer/standard.ts
// Reemplazo de texto en campos estandar: input, textarea, contenteditable.
// Se usa en Gmail, WhatsApp, Notion, Canva, y la mayoria de webs.

import type { EditableTarget } from '../types';
import type { ReplaceResult } from './types';

// Estrategia 1: inputs y textareas (campo.value)
export function replaceInInput(target: EditableTarget, newText: string): ReplaceResult {
  const el = target.element as HTMLInputElement | HTMLTextAreaElement;
  const fullVal = el.value;
  const start = target.start ?? 0;
  const end = target.end ?? 0;

  el.value = fullVal.substring(0, start) + newText + fullVal.substring(end);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.setSelectionRange(start + newText.length, start + newText.length);
  el.focus();
  return 'inserted';
}

// Estrategia 2: contenteditable con execCommand('insertText')
export function replaceInContentEditable(
  target: EditableTarget,
  newText: string
): ReplaceResult {
  if (!target.range) return 'copied';

  target.element.focus();
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(target.range);
  }

  const success = document.execCommand('insertText', false, newText);
  return success ? 'inserted' : 'copied';
}

// Estrategia 3: reemplazo universal via portapapeles + paste.
// Funciona cuando el navegador permite el paste sintetico.
export async function replaceViaClipboard(
  target: EditableTarget,
  newText: string
): Promise<ReplaceResult> {
  try {
    await navigator.clipboard.writeText(newText);
    target.element.focus();
    const success = document.execCommand('paste');
    return success ? 'inserted' : 'copied';
  } catch (err) {
    console.error('[SA:replacer] Error en reemplazo universal:', err);
    return 'copied';
  }
}