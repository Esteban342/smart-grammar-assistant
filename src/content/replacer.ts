import type { EditableTarget } from './types';

declare const chrome: any;

/**
 * Realiza el reemplazo de texto utilizando la mejor estrategia disponible según la plataforma.
 * Devuelve 'inserted' si reemplazó automáticamente, o 'copied' si solo pudo copiar al portapapeles.
 */
export async function replaceTextInPage(
  target: EditableTarget,
  newText: string
): Promise<'inserted' | 'copied'> {
  // ============================================================
  // Estrategia 1: Formulario Estándar (Inputs / Textareas)
  // ============================================================
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
    return 'inserted';
  }

  // ============================================================
  // Estrategia 2: Google Docs (canvas-docs)
  // Docs bloquea insertText y paste sintéticos. Usamos
  // chrome.debugger para enviar un Ctrl+V "real" (isTrusted: true)
  // que Docs SÍ acepta.
  // ============================================================
  if (target.type === 'canvas-docs') {
    try {
      // 1. Copiar el texto al portapapeles
      await navigator.clipboard.writeText(newText);
      console.log('[SA:replacer] Docs: texto copiado al portapapeles');

      // 2. Refocus al iframe interno de Docs (donde vive la selección)
      const iframe = document.querySelector(
        'iframe.docs-texteventtarget-iframe'
      ) as HTMLIFrameElement | null;

      if (iframe?.contentDocument) {
        const innerTarget =
          (iframe.contentDocument.querySelector('[contenteditable="true"]') as HTMLElement | null) ||
          (iframe.contentDocument.querySelector('textarea') as HTMLElement | null) ||
          iframe.contentDocument.body;
        innerTarget?.focus();
        console.log('[SA:replacer] Docs: iframe refocused');
      }

      // Pequeña espera para que el focus se aplique
      await new Promise((r) => setTimeout(r, 50));

      // 3. Pedir al background que envíe Ctrl+V vía debugger
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        chrome.runtime.sendMessage({ action: 'PASTE_IN_DOCS' }, (res: any) => {
          resolve(res || { ok: false, error: 'no response' });
        });
      });

      if (result.ok) {
        console.log('[SA:replacer] Docs: paste via debugger OK');
        return 'inserted';
      }

      // Fallback si el debugger falla
      console.warn('[SA:replacer] Docs: debugger falló, usando fallback', result.error);
      showToast('Texto copiado. Presiona Ctrl+V en el documento.');
      return 'copied';
    } catch (err) {
      console.error('[SA:replacer] error en Docs:', err);
      showToast('Texto copiado. Presiona Ctrl+V en el documento.');
      return 'copied';
    }
  }

  // ============================================================
  // Estrategia 3: Editor Enriquecido Standard (Gmail, WhatsApp, Notion, Canva)
  // ============================================================
  if (target.type === 'contenteditable' && target.range) {
    target.element.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(target.range);
    }
    const success = document.execCommand('insertText', false, newText);
    if (success) return 'inserted';
  }

  // ============================================================
  // Estrategia 4: Reemplazo Universal vía Portapapeles
  // ============================================================
  try {
    await navigator.clipboard.writeText(newText);
    target.element.focus();
    const success = document.execCommand('paste');
    if (success) return 'inserted';
    return 'copied';
  } catch (err) {
    console.error('[Smart Assistant] Error en reemplazo universal:', err);
    return 'copied';
  }
}

/**
 * Muestra un toast flotante temporal avisando al usuario.
 */
function showToast(message: string): void {
  const existing = document.getElementById('sa-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'sa-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed !important;
    bottom: 30px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: #0F1E35 !important;
    color: #FFFFFF !important;
    padding: 12px 20px !important;
    border-radius: 10px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    box-shadow: 0 8px 24px rgba(15, 30, 53, 0.3) !important;
    z-index: 2147483647 !important;
    opacity: 0 !important;
    transition: opacity 0.2s ease !important;
    pointer-events: none !important;
    letter-spacing: 0.1px !important;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.setProperty('opacity', '1', 'important');
  });

  setTimeout(() => {
    toast.style.setProperty('opacity', '0', 'important');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}