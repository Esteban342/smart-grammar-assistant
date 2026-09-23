import type { EditableTarget } from './types';

/**
 * Realiza el reemplazo de texto utilizando la mejor estrategia disponible según la plataforma
 */
export async function replaceTextInPage(target: EditableTarget, newText: string) {
  // Estrategia 1: Formulario Estándar (Inputs / Textareas)
  if (target.type === 'input' || target.type === 'textarea') {
    const el = target.element as HTMLInputElement | HTMLTextAreaElement;
    const fullVal = el.value;
    const start = target.start ?? 0;
    const end = target.end ?? 0;

    el.value = fullVal.substring(0, start) + newText + fullVal.substring(end);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.setSelectionRange(start + newText.length, start + newText.length);
    el.focus();
    return;
  }

  // Estrategia 2: Editor Enriquecido Standard (Gmail, WhatsApp, WordPress)
  if (target.type === 'contenteditable' && target.range) {
    target.element.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(target.range);
    }
    const success = document.execCommand('insertText', false, newText);
    if (success) return;
  }

  // Estrategia 3: Reemplazo Universal vía Portapapeles (Google Docs, Canva, Gemini)
  try {
    await navigator.clipboard.writeText(newText);
    target.element.focus();
    document.execCommand('paste');
  } catch (err) {
    console.error('[Smart Assistant] Error en reemplazo universal:', err);
  }
}