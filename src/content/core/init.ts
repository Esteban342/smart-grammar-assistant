// src/content/core/init.ts
// Inicializacion del content script. Registra listeners globales.

import { isEventFromOurUI } from '../ui/shadow';
import { hideFloatingMenu, openModalDirectly } from '../ui/modal';
import { IS_GOOGLE_DOCS, initDocsClipboardBridge } from '../docs-canvas';
import { onMouseUp, rememberMousedown } from './mouse-handler';
import { SA_DEBUG } from '../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

// Evita inicializar en iframes vacios que solo sirven de contenedor
// (por ejemplo anuncios, trackers, o el frame vacio de algunas apps).
function shouldInit(): boolean {
  const isTopFrame = window.top === window.self;
  const bodyText = document.body?.innerText?.trim() ?? '';
  return isTopFrame || bodyText.length > 50;
}

function registerMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'OPEN_MODAL_FROM_CONTEXT' && message.text) {
      log('mensaje del menu contextual recibido, modo:', message.mode);
      openModalDirectly(message.text, message.mode);
      sendResponse({ ok: true });
    }
    return true;
  });
}

function registerMouseListeners(): void {
  window.addEventListener('mouseup', onMouseUp, { capture: true });

  window.addEventListener(
    'mousedown',
    (event) => {
      rememberMousedown(event.clientX, event.clientY);
      if (!isEventFromOurUI(event)) {
        hideFloatingMenu();
      }
    },
    { capture: true }
  );
}

export function init(): void {
  if (!shouldInit()) return;

  log('content script iniciado en', location.hostname, '| IS_GOOGLE_DOCS =', IS_GOOGLE_DOCS);

  if (IS_GOOGLE_DOCS) {
    initDocsClipboardBridge();
  }

  registerMessageListener();
  registerMouseListeners();
}