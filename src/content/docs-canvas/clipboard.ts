// src/content/docs-canvas/clipboard.ts
// Captura del texto seleccionado en Google Docs via portapapeles.
// Docs renderiza en canvas, asi que no hay texto accesible en el DOM.

import { SA_DEBUG } from '../selection';
import { DOCS_IFRAME_SELECTOR } from './constants';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:docs]', ...args);
}

let lastClipboardText = '';

// Se ejecuta una sola vez al inicio del content script.
// Instala los listeners de "copy" tanto en el documento principal
// como dentro del iframe interno de Docs.
export function initDocsClipboardBridge(): void {
  const attachListener = (doc: Document, label: string) => {
    if ((doc as any).__sa_copy_listener) return;
    (doc as any).__sa_copy_listener = true;

    // Sin capture: true. Docs puebla clipboardData en fase de burbuja.
    doc.addEventListener('copy', (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      log(`evento "copy" capturado en ${label}:`, JSON.stringify((text ?? '').slice(0, 60)));
      if (text && text.trim().length > 0) {
        lastClipboardText = text;
      }
    });
    log(`listener de copy anadido al ${label}`);
  };

  attachListener(document, 'documento principal');

  const tryAttachIframe = () => {
    const iframe = document.querySelector(DOCS_IFRAME_SELECTOR) as HTMLIFrameElement | null;
    const innerDoc = iframe?.contentDocument;
    if (innerDoc) {
      attachListener(innerDoc, 'iframe interno de Docs');
    }
  };

  tryAttachIframe();
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    tryAttachIframe();
    if (attempts >= 30) clearInterval(interval);
  }, 500);

  log('puente de portapapeles instalado (docs.google.com)');
}

export function getLastDocsClipboardText(): string {
  return lastClipboardText;
}

// Fuerza una copia de la seleccion actual.
// Debe llamarse durante un gesto de usuario (mousedown del boton)
// para que Docs respete el execCommand.
export function forceCaptureSelectionViaCopy(): void {
  try {
    lastClipboardText = '';

    const iframe = document.querySelector(DOCS_IFRAME_SELECTOR) as HTMLIFrameElement | null;
    if (!iframe) {
      log('no se encontro el iframe de Docs');
      return;
    }

    const innerDoc = iframe.contentDocument;
    if (!innerDoc) {
      log('no se pudo acceder al contentDocument del iframe');
      return;
    }

    const target = (innerDoc.querySelector('textarea') ||
      innerDoc.querySelector('[contenteditable="true"]') ||
      innerDoc.body) as HTMLElement | null;

    if (!target) {
      log('no se encontro el elemento de texto dentro del iframe');
      return;
    }

    target.focus();

    try {
      const ok = innerDoc.execCommand('copy');
      log('execCommand("copy") en iframe ->', ok);
    } catch (err) {
      log('execCommand en iframe fallo:', err);
    }
  } catch (err) {
    log('error en forceCaptureSelectionViaCopy:', err);
  }
}