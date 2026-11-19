// src/content/ui/modal/modal-click-outside.ts
// Cierra el modal al hacer clic fuera o al presionar la tecla Escape.

import { getOwnShadowRoot } from '../shadow';
import { MODAL_ID, MENU_ID } from './styles';

export function setupClickOutsideToClose(modal: HTMLElement, onClose: () => void): void {
  
  const cleanup = () => {
    document.removeEventListener('mousedown', handleClickOutside, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };

  const handleClickOutside = (e: MouseEvent) => {
    const root = getOwnShadowRoot();
    if (!root.getElementById(MODAL_ID)) {
      cleanup();
      return;
    }

    const path = e.composedPath();
    if (path.includes(modal)) return;

    for (const node of path) {
      if (node instanceof HTMLElement && node.id === MENU_ID) return;
    }

    onClose();
    cleanup();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const root = getOwnShadowRoot();
    if (!root.getElementById(MODAL_ID)) {
      cleanup();
      return;
    }

    // Atrapa la tecla Escape (Escape o Esc dependiendo del navegador)
    if (e.key === 'Escape' || e.key === 'Esc') {
      onClose();
      cleanup();
    }
  };

  // Pequeña espera para no capturar el mismo clic que abrió el modal.
  setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown, true);
  }, 100);
}