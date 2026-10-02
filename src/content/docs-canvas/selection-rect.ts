// src/content/docs-canvas/selection-rect.ts
// Calcula el rectangulo que ocupa la seleccion actual en Docs.
// Se usa para posicionar el boton flotante.

import { SA_DEBUG } from '../selection';
import { DOCS_SELECTION_OVERLAY_SELECTORS } from './constants';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:docs]', ...args);
}

export function getDocsSelectionRect(): DOMRect | null {
  const overlays = document.querySelectorAll<HTMLElement>(DOCS_SELECTION_OVERLAY_SELECTORS);
  log('overlays de seleccion encontrados:', overlays.length);
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