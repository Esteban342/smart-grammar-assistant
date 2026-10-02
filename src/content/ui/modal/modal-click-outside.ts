// src/content/ui/modal/modal-click-outside.ts
// Cierra el modal cuando el usuario hace clic fuera de el.

import { getOwnShadowRoot } from '../shadow';
import { MODAL_ID, MENU_ID } from './styles';

export function setupClickOutsideToClose(modal: HTMLElement, onClose: () => void): void {
  const handler = (e: MouseEvent) => {
    const root = getOwnShadowRoot();
    if (!root.getElementById(MODAL_ID)) {
      document.removeEventListener('mousedown', handler, true);
      return;
    }

    const path = e.composedPath();
    if (path.includes(modal)) return;

    for (const node of path) {
      if (node instanceof HTMLElement && node.id === MENU_ID) return;
    }

    onClose();
    document.removeEventListener('mousedown', handler, true);
  };

  // Pequeña espera para no capturar el mismo clic que abrio el modal.
  setTimeout(() => {
    document.addEventListener('mousedown', handler, true);
  }, 100);
}