// src/content/core/docs-handler.ts
// Manejo de seleccion en Google Docs.
// Docs renderiza el texto en canvas, asi que capturamos via portapapeles.

import {
  getDocsSelectionRect,
  forceCaptureSelectionViaCopy,
  getLastDocsClipboardText,
} from '../docs-canvas';
import { showFloatingMenu, hideFloatingMenu } from '../ui/modal';
import { SA_DEBUG } from '../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

export async function handleGoogleDocsSelection(
  x: number,
  y: number,
  dragDistance: number
): Promise<void> {
  const rect = getDocsSelectionRect();

  if (!rect && dragDistance < 5) {
    log('Docs: no se encontro overlay ni hubo arrastre -> ocultando menu');
    hideFloatingMenu();
    return;
  }

  const posX = rect ? rect.right || x : x;
  const posY = rect ? rect.bottom || y : y;

  // Capturamos el texto durante el mouseup, cuando la seleccion esta viva.
  forceCaptureSelectionViaCopy();
  await new Promise((r) => setTimeout(r, 100));
  const capturedText = getLastDocsClipboardText();
  log('Docs: texto capturado en mouseup:', JSON.stringify(capturedText.slice(0, 40)));

  log('Docs: mostrando menu flotante en pos', { posX, posY });

  showFloatingMenu({
    text: capturedText,
    x: posX,
    y: posY,
    source: 'docs-canvas',
    editableTarget: { element: document.body, type: 'canvas-docs' },
  });
}