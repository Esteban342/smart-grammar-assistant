// src/content/core/mouse-handler.ts
// Escucha los eventos de mouse y decide que handler usar.

import { isEventFromOurUI } from '../ui/shadow';
import { IS_GOOGLE_DOCS } from '../docs-canvas';
import { SA_DEBUG } from '../selection';
import { handleGenericSelection } from './generic-handler';
import { handleGoogleDocsSelection } from './docs-handler';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

const SELECTION_READ_DELAY_MS = 150;

let mousedownPos = { x: 0, y: 0 };

export function rememberMousedown(x: number, y: number): void {
  mousedownPos = { x, y };
}

export function onMouseUp(event: MouseEvent): void {
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