// src/content/replacer/docs.ts
// Reemplazo de texto en Google Docs.
// Docs no acepta execCommand('insertText') ni 'paste' sin user gesture real.
// Solucion: usar chrome.debugger en el background para enviar un Ctrl+V
// que Docs si reconoce como evento real.

import type { EditableTarget } from '../types';
import type { ReplaceResult } from './types';
import { showToast } from './toast';

declare const chrome: any;

const DOCS_IFRAME_SELECTOR = 'iframe.docs-texteventtarget-iframe';

export async function replaceInDocs(_target: EditableTarget, newText: string): Promise<ReplaceResult> {
  try {
    // 1. Copiar el texto al portapapeles
    await navigator.clipboard.writeText(newText);
    console.log('[SA:replacer] Docs: texto copiado al portapapeles');

    // 2. Refocus al iframe interno de Docs
    const iframe = document.querySelector(DOCS_IFRAME_SELECTOR) as HTMLIFrameElement | null;
    if (iframe?.contentDocument) {
      const innerTarget =
        (iframe.contentDocument.querySelector('[contenteditable="true"]') as HTMLElement | null) ||
        (iframe.contentDocument.querySelector('textarea') as HTMLElement | null) ||
        iframe.contentDocument.body;
      innerTarget?.focus();
      console.log('[SA:replacer] Docs: iframe refocused');
    }

    // Pequena espera para que el focus se aplique
    await new Promise((r) => setTimeout(r, 50));

    // 3. Pedir al background que envie Ctrl+V via chrome.debugger
    const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      chrome.runtime.sendMessage({ action: 'PASTE_IN_DOCS' }, (res: any) => {
        resolve(res || { ok: false, error: 'no response' });
      });
    });

    if (result.ok) {
      console.log('[SA:replacer] Docs: paste via debugger OK');
      return 'inserted';
    }

    console.warn('[SA:replacer] Docs: debugger fallo, usando fallback', result.error);
    showToast('Texto copiado. Presiona Ctrl+V en el documento.');
    return 'copied';
  } catch (err) {
    console.error('[SA:replacer] error en Docs:', err);
    showToast('Texto copiado. Presiona Ctrl+V en el documento.');
    return 'copied';
  }
}