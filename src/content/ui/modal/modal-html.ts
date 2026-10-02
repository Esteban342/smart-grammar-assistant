// src/content/ui/modal/modal-html.ts
// Construye el HTML del modal principal.

import type { EditableTarget } from '../../types';
import { MODAL_ID } from './styles';
import { LOADING_SPINNER_HTML } from '../components';

export interface ModalCallbacks {
  onClose: () => void;
  onCopy: () => void;
  onRegen: () => void;
  onReplace: (() => void) | null;
  onTabClick: (mode: string) => void;
}

const REWRITE_TONES = [
  { id: 'standard', label: 'Estandar' },
  { id: 'formal', label: 'Formal' },
  { id: 'academic', label: 'Academico' },
  { id: 'simple', label: 'Sencillo' },
  { id: 'creative', label: 'Creativo' },
];

function getTitle(mode: string): string {
  if (mode === 'grammar') return 'Correccion Gramatical';
  if (mode === 'humanize') return 'Texto Humanizado';
  return 'Parafrasear Texto';
}

function renderTabs(activeMode: string): string {
  return REWRITE_TONES
    .map(
      (t) =>
        `<button class="sa-modal-tab ${t.id === activeMode ? 'sa-active' : ''}" data-mode="${t.id}">${t.label}</button>`
    )
    .join('');
}

export function createModalHtml(
  mode: string,
  editableTarget: EditableTarget | null,
  callbacks: ModalCallbacks
): HTMLElement {
  const isGrammar = mode === 'grammar';
  const isHumanizeOnly = mode === 'humanize';
  const title = getTitle(mode);

  const modal = document.createElement('div');
  modal.id = MODAL_ID;

  modal.innerHTML = `
    <div class="sa-modal-header" id="sa-modal-drag-handle">
      <div class="sa-modal-title">${title}</div>
      <button class="sa-modal-close" id="sa-modal-close" title="Cerrar">X</button>
    </div>

    ${!isHumanizeOnly && !isGrammar ? `<div class="sa-modal-tabs" id="sa-modal-tabs">${renderTabs(mode)}</div>` : ''}

    <div class="sa-modal-output" id="sa-modal-output">${LOADING_SPINNER_HTML}</div>

    <div id="sa-grammar-area"></div>

    <div class="sa-modal-actions">
      ${editableTarget ? `<button class="sa-modal-btn sa-primary" id="sa-replace-btn">Reemplazar</button>` : ''}
      <button class="sa-modal-btn" id="sa-copy-btn">Copiar</button>
      <button class="sa-modal-btn" id="sa-regen-btn">Volver a checar</button>
    </div>
  `;

  // Registrar tabs
  if (!isHumanizeOnly && !isGrammar) {
    const tabsContainer = modal.querySelector('#sa-modal-tabs');
    tabsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const modeSelected = target.getAttribute('data-mode');
      if (modeSelected) callbacks.onTabClick(modeSelected);
    });
  }

  // Registrar botones
  if (editableTarget && callbacks.onReplace) {
    modal.querySelector('#sa-replace-btn')?.addEventListener('click', callbacks.onReplace);
  }
  modal.querySelector('#sa-copy-btn')?.addEventListener('click', callbacks.onCopy);
  modal.querySelector('#sa-regen-btn')?.addEventListener('click', callbacks.onRegen);
  modal.querySelector('#sa-modal-close')?.addEventListener('click', callbacks.onClose);

  return modal;
}