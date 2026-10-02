// src/content/ui/modal/floating-menu.ts
// Boton circular expandible que aparece junto a la seleccion.

import { getOwnShadowRoot } from '../shadow';
import { ensureStyles, MENU_ID } from './styles';
import { appState } from './state';
import type { FloatingMenuOptions } from './types';
import { forceCaptureSelectionViaCopy, getLastDocsClipboardText } from '../../docs-canvas';
import { SA_DEBUG } from '../../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}

const EXPANDED_WIDTH = 260;
const MENU_HEIGHT = 24;

// En Docs, captura el texto durante el mousedown del boton.
// El gesto de usuario hace que Docs respete el execCommand.
export function captureDocsTextIfNeeded(): void {
  const options = appState.currentOptions;
  if (!options || options.source !== 'docs-canvas') return;

  forceCaptureSelectionViaCopy();
  const freshText = getLastDocsClipboardText();

  if (freshText && freshText.trim()) {
    options.text = freshText;
    log('Docs: texto capturado en mousedown del boton:', JSON.stringify(freshText.slice(0, 40)));
  } else {
    log('Docs: no se capturo texto en mousedown');
  }
}

function computePosition(x: number, y: number): { left: number; top: number } {
  let left = x + 6;
  let top = y + 6;

  if (left + EXPANDED_WIDTH > window.innerWidth - 10) {
    left = x - EXPANDED_WIDTH - 6;
  }
  if (left < 10) left = 10;

  if (top + MENU_HEIGHT > window.innerHeight - 10) {
    top = y - MENU_HEIGHT - 6;
  }
  if (top < 10) top = 10;

  return { left, top };
}

function createActionButton(label: string, onAction: (mode: string) => void, mode: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'sa-action';
  btn.textContent = label;
  btn.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    onAction(mode);
  });
  return btn;
}

export function showFloatingMenu(
  options: FloatingMenuOptions,
  onAction: (mode: string) => void
): void {
  const existingRoot = getOwnShadowRoot();
  if (existingRoot.getElementById('smart-assistant-modal')) {
    log('modal ya abierto, no mostrar menu');
    return;
  }

  appState.currentOptions = options;
  removeFloatingMenu();
  ensureStyles();

  const root = getOwnShadowRoot();
  const { left, top } = computePosition(options.x, options.y);

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const icon = document.createElement('span');
  icon.className = 'sa-trigger-icon';
  icon.textContent = '✦';
  menu.appendChild(icon);

  const actions = document.createElement('div');
  actions.className = 'sa-actions';
  actions.appendChild(createActionButton('Humanizar', onAction, 'humanize'));
  actions.appendChild(createActionButton('Parafrasear', onAction, 'standard'));
  actions.appendChild(createActionButton('Corregir', onAction, 'grammar'));
  menu.appendChild(actions);

  menu.addEventListener('mousedown', (e: MouseEvent) => {
    if (menu.classList.contains('sa-expanded')) return;
    e.preventDefault();
    e.stopPropagation();
    menu.classList.add('sa-expanded');
    log('menu expandido');
  });

  root.appendChild(menu);
  log('boton circular insertado en', { left, top, source: options.source });
}

export function removeFloatingMenu(): void {
  const root = getOwnShadowRoot();
  root.getElementById(MENU_ID)?.remove();
}

export function hideFloatingMenu(): void {
  removeFloatingMenu();
}