// src/content/core/generic-handler.ts
// Manejo de seleccion en paginas web normales.

import { resolveDeepTarget, readSelectedText, SA_DEBUG } from '../selection';
import { showFloatingMenu, hideFloatingMenu } from '../ui/modal';
import { detectEditableTarget, extractDeepTextFallback } from './selection-helpers';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:content]', ...args);
}

export function handleGenericSelection(
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
      log('sin texto y sin arrastre -> ocultando menu');
      hideFloatingMenu();
      return;
    }
    log('sin texto pero hubo arrastre -> abriendo menu de todos modos');
  }

  const activeEl = document.activeElement;
  const isRealActiveElement =
    activeEl && activeEl !== document.body && activeEl !== document.documentElement;
  const editableTarget = isRealActiveElement ? detectEditableTarget(activeEl) : null;

  log(
    'mostrando menu flotante. texto:',
    JSON.stringify(text.slice(0, 40)),
    '| editableTarget:',
    editableTarget?.type ?? null
  );

  showFloatingMenu({ text, x, y, source: 'dom', editableTarget });
}