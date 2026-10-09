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

const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>`;
const SVG_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke-linecap="round"/></svg>`;
const SVG_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_REPLACE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function getTitle(mode: string): string {
  if (mode === 'grammar') return 'Corrector';
  if (mode === 'humanize') return 'Humanizar';
  return 'Parafrasear';
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
      <div class="sa-modal-badge">
        <div class="sa-modal-badge-dot"></div>
        <span class="sa-modal-title">${title}</span>
      </div>
      <button class="sa-modal-close" id="sa-modal-close" title="Cerrar">${SVG_CLOSE}</button>
    </div>

    ${!isHumanizeOnly && !isGrammar ? `<div class="sa-modal-tabs" id="sa-modal-tabs">${renderTabs(mode)}</div>` : ''}

    <div class="sa-modal-output" id="sa-modal-output">${LOADING_SPINNER_HTML}</div>

    <div id="sa-grammar-area"></div>

    <div class="sa-modal-actions">
      <button class="sa-modal-btn" id="sa-copy-btn">${SVG_COPY} Copiar</button>
      <button class="sa-modal-btn" id="sa-regen-btn">${SVG_REFRESH} Volver a checar</button>
      ${editableTarget ? `<button class="sa-modal-btn sa-primary" id="sa-replace-btn">${SVG_REPLACE} Reemplazar</button>` : ''}
    </div>
  `;

  if (!isHumanizeOnly && !isGrammar) {
    const tabsContainer = modal.querySelector('#sa-modal-tabs');
    tabsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const modeSelected = target.getAttribute('data-mode');
      if (modeSelected) callbacks.onTabClick(modeSelected);
    });
  }

  if (editableTarget && callbacks.onReplace) {
    modal.querySelector('#sa-replace-btn')?.addEventListener('click', callbacks.onReplace);
  }
  modal.querySelector('#sa-copy-btn')?.addEventListener('click', callbacks.onCopy);
  modal.querySelector('#sa-regen-btn')?.addEventListener('click', callbacks.onRegen);
  modal.querySelector('#sa-modal-close')?.addEventListener('click', callbacks.onClose);

  return modal;
}