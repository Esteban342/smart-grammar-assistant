import { SA_DEBUG } from './selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:docs]', ...args);
}

export const IS_GOOGLE_DOCS = location.hostname === 'docs.google.com';

let lastClipboardText = '';

export function initDocsClipboardBridge(): void {
  const attachListener = (doc: Document, label: string) => {
    if ((doc as any).__sa_copy_listener) return;
    (doc as any).__sa_copy_listener = true;

    // ✅ FIX: sin { capture: true } -- Google Docs puebla clipboardData
    // durante la fase de BURBUJA, después de los listeners en captura.
    doc.addEventListener('copy', (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      log(`evento "copy" capturado en ${label}:`, JSON.stringify((text ?? '').slice(0, 60)));
      if (text && text.trim().length > 0) {
        lastClipboardText = text;
      }
    });
    log(`listener de copy añadido al ${label}`);
  };

  attachListener(document, 'documento principal');

  const tryAttachIframe = () => {
    const iframe = document.querySelector(
      'iframe.docs-texteventtarget-iframe'
    ) as HTMLIFrameElement | null;
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

export function forceCaptureSelectionViaCopy(): void {
  try {
    lastClipboardText = '';

    const iframe = document.querySelector(
      'iframe.docs-texteventtarget-iframe'
    ) as HTMLIFrameElement | null;

    if (!iframe) {
      log('no se encontró el iframe docs-texteventtarget-iframe');
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
      log('no se encontró el elemento de texto dentro del iframe');
      return;
    }

    target.focus();

    try {
      const ok = innerDoc.execCommand('copy');
      log('execCommand("copy") en iframe ->', ok);
    } catch (err) {
      log('execCommand en iframe falló:', err);
    }
  } catch (err) {
    log('error en forceCaptureSelectionViaCopy:', err);
  }
}

export function getDocsSelectionRect(): DOMRect | null {
  const overlays = document.querySelectorAll<HTMLElement>(
    '.kix-selection-overlay, .kix-selection-overlay-element, .kix-selection-overlay-outline, .docs-text-ui-cursor-selection'
  );
  log('overlays de selección encontrados:', overlays.length);
  if (overlays.length === 0) return null;

  let rect: DOMRect | null = null;
  overlays.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    rect = rect ? unionRect(rect, r) : r;
  });
  return rect;
}

function unionRect(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

export function looksLikeDocsInternalId(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.startsWith('AQ.')) return true;
  if (
    trimmed.length > 15 &&
    trimmed.length < 200 &&
    !trimmed.includes(' ') &&
    !trimmed.includes('\n') &&
    /^[A-Za-z0-9._\-+/=]+$/.test(trimmed)
  ) {
    return true;
  }
  return false;
}