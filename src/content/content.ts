// src/content/content.ts
import { isEventFromOurUI } from './ui/shadow';
import { showFloatingMenu, hideFloatingMenu, openModalDirectly } from './ui/modal';
import { readSelectedText, resolveDeepTarget, SA_DEBUG } from './selection';
import {
  IS_GOOGLE_DOCS,
  initDocsClipboardBridge,
  getDocsSelectionRect,
  forceCaptureSelectionViaCopy,
  getLastDocsClipboardText,
} from './docs-canvas';
import type { EditableTarget } from './types';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

const SELECTION_READ_DELAY_MS = 150;
let mousedownPos = { x: 0, y: 0 };

function init(): void {
  // ============================================================
  // GUARD: evitar inyección en iframes vacíos (Google, publicidad,
  // trackers, etc.). Solo activamos el content script en:
  //   - El frame principal (top).
  //   - Iframes con contenido significativo (Gemini Web, ChatGPT).
  // ============================================================
  const isTopFrame = window.top === window.self;
  const bodyText = document.body?.innerText?.trim() ?? '';
  const hasMeaningfulBody = bodyText.length > 50;

  if (!isTopFrame && !hasMeaningfulBody) {
    // Frame secundario vacío: no inicializar.
    return;
  }

  log('content script iniciado en', location.hostname, '| IS_GOOGLE_DOCS =', IS_GOOGLE_DOCS);

  if (IS_GOOGLE_DOCS) {
    initDocsClipboardBridge();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'OPEN_MODAL_FROM_CONTEXT' && message.text) {
      log('mensaje del menú contextual recibido, modo:', message.mode);
      openModalDirectly(message.text, message.mode);
      sendResponse({ ok: true });
    }
    return true;
  });

  window.addEventListener('mouseup', onMouseUp, { capture: true });

  window.addEventListener(
    'mousedown',
    (event) => {
      mousedownPos = { x: event.clientX, y: event.clientY };
      if (!isEventFromOurUI(event)) {
        hideFloatingMenu();
      }
    },
    { capture: true }
  );
}

function onMouseUp(event: MouseEvent): void {
  if (isEventFromOurUI(event)) {
    log('mouseup ignorado: viene de nuestra propia UI');
    return;
  }

  const { clientX, clientY } = event;
  const immediateSelection = window.getSelection()?.toString().trim() || '';
  const dragDistance = Math.hypot(clientX - mousedownPos.x, clientY - mousedownPos.y);

  window.setTimeout(() => {
    if (IS_GOOGLE_DOCS) {
      void handleGoogleDocsSelection(clientX, clientY, dragDistance);
    } else {
      handleGenericSelection(clientX, clientY, immediateSelection, dragDistance);
    }
  }, SELECTION_READ_DELAY_MS);
}

function extractDeepTextFallback(): string {
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

function detectEditableTarget(el: Element | null): EditableTarget | null {
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

function handleGenericSelection(
  x: number,
  y: number,
  immediateSelection: string,
  dragDistance: number
): void {
  const { chain } = resolveDeepTarget(x, y);
  let text = readSelectedText(chain).trim();

  if (!text) {
    text = extractDeepTextFallback();
  }

  if (!text && immediateSelection) {
    text = immediateSelection;
  }

  if (text.length === 0) {
    if (dragDistance < 5) {
      log('sin texto y sin arrastre -> ocultando menú');
      hideFloatingMenu();
      return;
    }
    log('sin texto pero hubo arrastre -> abriendo menú de todos modos');
  }

  const activeEl = document.activeElement;
  const isRealActiveElement =
    activeEl && activeEl !== document.body && activeEl !== document.documentElement;
  const editableTarget = isRealActiveElement ? detectEditableTarget(activeEl) : null;

  log(
    'mostrando menú flotante. texto:',
    JSON.stringify(text.slice(0, 40)),
    '| editableTarget:',
    editableTarget?.type ?? null
  );

  showFloatingMenu({ text, x, y, source: 'dom', editableTarget });
}

/**
 * En Google Docs, el foco del editor se pierde en cuanto el usuario pulsa
 * cualquier botón de nuestro menú flotante. Por eso capturamos el texto
 * AHORA, durante el mouseup, cuando la selección de Docs todavía está viva.
 */
async function handleGoogleDocsSelection(
  x: number,
  y: number,
  dragDistance: number
): Promise<void> {
  const rect = getDocsSelectionRect();

  if (!rect && dragDistance < 5) {
    log('Docs: no se encontró overlay ni hubo arrastre -> ocultando menú');
    hideFloatingMenu();
    return;
  }

  const posX = rect ? rect.right || x : x;
  const posY = rect ? rect.bottom || y : y;

  // Capturamos el texto AHORA, con el foco aún en el editor de Docs
  forceCaptureSelectionViaCopy();
  await new Promise((r) => setTimeout(r, 100));
  const capturedText = getLastDocsClipboardText();
  log('Docs: texto capturado en mouseup:', JSON.stringify(capturedText.slice(0, 40)));

  log('Docs: mostrando menú flotante en pos', { posX, posY });

  showFloatingMenu({
    text: capturedText,
    x: posX,
    y: posY,
    source: 'docs-canvas',
    editableTarget: { element: document.body, type: 'canvas-docs' },
  });
}

init();