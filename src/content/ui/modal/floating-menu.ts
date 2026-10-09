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

const EXPANDED_WIDTH = 320;
const MENU_HEIGHT = 30;

const SVG_PENCIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 20l.8-3.8c.1-.5.35-.96.72-1.32l10-9.9c1.1-1.1 2.9-1.1 4 0 1.1 1.1 1.1 2.9 0 4l-10 9.9c-.35.36-.8.6-1.3.7L4.4 20.4c-.3.06-.46-.27-.4-.4z"/><path d="M13.2 6.6l4.2 4.2"/></svg>`;

const SVG_HUMANIZE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;

const SVG_PARAPHRASE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

const SVG_GRAMMAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;

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

function createActionButton(
  label: string,
  iconSvg: string,
  mode: string,
  onAction: (mode: string) => void,
  extraClass?: string
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'sa-action' + (extraClass ? ' ' + extraClass : '');
  btn.innerHTML = `${iconSvg}<span>${label}</span>`;
  btn.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    onAction(mode);
  });
  return btn;
}

function createSeparator(): HTMLElement {
  const sep = document.createElement('div');
  sep.className = 'sa-sep';
  return sep;
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
  icon.innerHTML = SVG_PENCIL;
  menu.appendChild(icon);

  const actions = document.createElement('div');
  actions.className = 'sa-actions';
  actions.appendChild(createActionButton('Humanizar', SVG_HUMANIZE, 'humanize', onAction, 'sa-humanize'));
  actions.appendChild(createSeparator());
  actions.appendChild(createActionButton('Parafrasear', SVG_PARAPHRASE, 'standard', onAction));
  actions.appendChild(createSeparator());
  actions.appendChild(createActionButton('Corregir', SVG_GRAMMAR, 'grammar', onAction));
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