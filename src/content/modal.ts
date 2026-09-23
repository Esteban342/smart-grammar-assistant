import { streamGeminiTranslation } from '../services/gemini';
import type { EditableTarget } from './types';
import { replaceTextInPage } from './replacer';
import { getOwnShadowRoot } from './shadow';
import {
  forceCaptureSelectionViaCopy,
  getLastDocsClipboardText,
  looksLikeDocsInternalId,
} from './docs-canvas';
import { SA_DEBUG } from './selection';
import {
  LOADING_SPINNER_HTML,
  ensureSpinnerStyles,
  renderApiKeyErrorHTML,
  createButton,
} from './components';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}

export type SelectionSource = 'dom' | 'docs-canvas';

export interface FloatingMenuOptions {
  text: string;
  x: number;
  y: number;
  source: SelectionSource;
  editableTarget?: EditableTarget | null;
}

const modalCache: Record<string, string> = {};
let isProcessing = false;
let currentTypingInterval: any = null;
let currentOptions: FloatingMenuOptions | null = null;

export function openModalDirectly(text: string, mode: string) {
  removeFloatingMenu();
  openModal(text, mode, null);
}

/**
 * Captura el texto de Docs dentro del gesto del clic del botón.
 * Esta función se llama en el `mousedown` del botón "Humanizar"/"Parafrasear".
 * El user gesture del clic hace que Chrome respete `execCommand('copy')`,
 * y Google Docs puebla el clipboard con la selección real.
 */
function captureDocsTextIfNeeded(): void {
  if (!currentOptions || currentOptions.source !== 'docs-canvas') return;

  forceCaptureSelectionViaCopy();
  const freshText = getLastDocsClipboardText();

  if (freshText && freshText.trim()) {
    currentOptions.text = freshText;
    log('Docs: texto capturado en mousedown del botón:', JSON.stringify(freshText.slice(0, 40)));
  } else {
    log('Docs: no se capturó texto en mousedown, se usará el fallback');
  }
}

export function showFloatingMenu(options: FloatingMenuOptions) {
  currentOptions = options;
  removeFloatingMenu();

  const root = getOwnShadowRoot();

  const menuWidth = 220;
  const menuHeight = 42;
  const adjustedX = Math.min(Math.max(10, options.x), window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(Math.max(10, options.y + 8), window.innerHeight - menuHeight - 10);

  const menu = document.createElement('div');
  menu.id = 'smart-assistant-menu';
  menu.style.cssText = `
    position: fixed !important;
    top: ${adjustedY}px !important;
    left: ${adjustedX}px !important;
    z-index: 2147483647 !important;
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
    border-radius: 8px !important;
    padding: 6px !important;
    display: flex !important;
    gap: 6px !important;
    pointer-events: auto !important;
  `;

  const btnHumanize = createButton('Humanizar', true, () => {});
  btnHumanize.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    void handleAction('humanize');
  });

  const btnParaphrase = createButton('Parafrasear', false, () => {});
  btnParaphrase.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    void handleAction('standard');
  });

  menu.appendChild(btnHumanize);
  menu.appendChild(btnParaphrase);
  root.appendChild(menu);

  log('menú flotante insertado en shadow root en', { x: adjustedX, y: adjustedY, source: options.source });
}

export function removeFloatingMenu() {
  const root = getOwnShadowRoot();
  root.getElementById('smart-assistant-menu')?.remove();
}

export function hideFloatingMenu() {
  removeFloatingMenu();
}

async function handleAction(mode: string): Promise<void> {
  const options = currentOptions;
  removeFloatingMenu();
  if (!options) return;

  let text = options.text;
  log('handleAction', { mode, source: options.source, textPrevio: JSON.stringify(text.slice(0, 40)) });

  // Si es Docs y aún no hay texto, intentar una última vez (fallback).
  // En la mayoría de casos ya se habrá capturado en el mousedown del botón.
  if (options.source === 'docs-canvas') {
    if (!text || !text.trim()) {
      log('Docs: text vacío en handleAction, intentando fallback...');
      forceCaptureSelectionViaCopy();
      await new Promise((resolve) => setTimeout(resolve, 150));
      text = getLastDocsClipboardText();
      log('texto tras fallback de Docs:', JSON.stringify(text.slice(0, 40)));
    }

    if (looksLikeDocsInternalId(text)) {
      log('texto capturado parece un ID interno de Docs -- descartando');
      text = '';
    }
  }

  if (!text || !text.trim()) {
    log('texto vacío en options, intentando leer selección viva del navegador...');
    const liveSel = window.getSelection()?.toString().trim() || '';
    if (liveSel) {
      text = liveSel;
      log('selección viva recuperada:', JSON.stringify(text.slice(0, 40)));
    }
  }

  if (!text || !text.trim()) {
    log('handleAction: texto vacío tras todos los intentos -- abriendo modal informativa');
    openModal(
      '⚠️ No se pudo leer automáticamente el texto seleccionado en esta página.\n\nPrueba a copiar el texto con Ctrl+C antes de presionar el botón.',
      mode,
      options.editableTarget || null
    );
    return;
  }

  openModal(text, mode, options.editableTarget || null);
}

function openModal(originalText: string, mode: string, editableTarget: EditableTarget | null = null) {
  ensureSpinnerStyles();
  removeExistingModal();
  clearCacheIfNewText(originalText);

  const root = getOwnShadowRoot();
  let activeMode = mode;
  const isHumanizeOnly = mode === 'humanize';

  const modal = document.createElement('div');
  modal.id = 'smart-assistant-modal';
  modal.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 440px !important;
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 8px !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
    padding: 16px !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;

  const modes = [
    { id: 'standard', label: 'Estándar' },
    { id: 'formal', label: 'Formal' },
    { id: 'academic', label: 'Académico' },
    { id: 'simple', label: 'Sencillo' },
    { id: 'creative', label: 'Creativo' },
  ];

  const renderTabs = () =>
    modes
      .map(
        (m) => `<button class="mode-tab" data-mode="${m.id}" style="
          padding: 5px 10px !important; border: none !important;
          background: ${m.id === activeMode ? '#0f172a' : 'transparent'} !important;
          color: ${m.id === activeMode ? '#ffffff' : '#475569'} !important;
          font-weight: ${m.id === activeMode ? '600' : 'normal'} !important;
          border-radius: 4px !important; font-size: 12px !important; cursor: pointer !important;
        ">${m.label}</button>`
      )
      .join('');

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
      <strong style="font-size:13px; color:#0f172a; text-transform:uppercase;">${isHumanizeOnly ? 'Texto Humanizado' : 'Parafrasear Texto'}</strong>
      <button id="close-modal-btn" style="background:none; border:none; cursor:pointer; font-size:14px; color:#64748b;">✕</button>
    </div>

    ${!isHumanizeOnly ? `<div id="tabs-container" style="display:flex; gap:4px; overflow-x:auto; padding-bottom:8px; border-bottom:1px solid #f1f5f9; margin-bottom:12px;">${renderTabs()}</div>` : ''}

    <div id="modal-output" style="
      font-size: 13px; color: #334155; min-height: 90px; max-height: 180px;
      overflow-y: auto; background: #f8fafc; padding: 12px; border-radius: 6px;
      border: 1px solid #e2e8f0; margin-bottom: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
    ">${LOADING_SPINNER_HTML}</div>

    <div style="display:flex; gap:8px;">
      ${
        editableTarget
          ? `<button id="replace-btn" style="flex:1; background:#0f172a; color:#ffffff; border:none; padding:8px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Reemplazar</button>`
          : ''
      }
      <button id="copy-btn" style="flex:1; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:8px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Copiar</button>
      <button id="regen-btn" style="flex:1; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:8px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Reintentar</button>
    </div>
  `;

  root.appendChild(modal);

  if (!isHumanizeOnly) {
    const tabsContainer = modal.querySelector('#tabs-container');
    tabsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const modeSelected = target.getAttribute('data-mode');
      if (modeSelected && modeSelected !== activeMode && !isProcessing) {
        activeMode = modeSelected;
        tabsContainer.innerHTML = renderTabs();
        loadModeContent(originalText, activeMode);
      }
    });
  }

  if (editableTarget) {
    modal.querySelector('#replace-btn')?.addEventListener('click', () => {
      const outputEl = root.getElementById('modal-output');
      const textToReplace = outputEl?.innerText || '';
      if (textToReplace && textToReplace.trim().length > 0) {
        replaceTextInPage(editableTarget, textToReplace);
        removeExistingModal();
      }
    });
  }

  modal.querySelector('#copy-btn')?.addEventListener('click', () => {
    const outputEl = root.getElementById('modal-output');
    const textToCopy = outputEl?.innerText || '';
    if (textToCopy && textToCopy.trim().length > 0) {
      navigator.clipboard.writeText(textToCopy);
      const copyBtn = modal.querySelector('#copy-btn') as HTMLButtonElement;
      copyBtn.innerText = 'Copiado';
      setTimeout(() => (copyBtn.innerText = 'Copiar'), 1500);
    }
  });

  modal.querySelector('#regen-btn')?.addEventListener('click', () => {
    if (!isProcessing) {
      delete modalCache[activeMode];
      loadModeContent(originalText, activeMode);
    }
  });

  modal.querySelector('#close-modal-btn')?.addEventListener('click', removeExistingModal);

  loadModeContent(originalText, activeMode);
}

async function loadModeContent(text: string, mode: string) {
  const root = getOwnShadowRoot();
  const outputDiv = root.getElementById('modal-output');
  if (!outputDiv) return;

  if (currentTypingInterval) {
    clearInterval(currentTypingInterval);
    currentTypingInterval = null;
  }

  outputDiv.style.overflowY = 'auto';

  if (text.startsWith('⚠️ No se pudo leer')) {
    outputDiv.innerText = text;
    return;
  }

  if (modalCache[mode]) {
    outputDiv.innerText = modalCache[mode];
    return;
  }

  outputDiv.innerHTML = LOADING_SPINNER_HTML;
  isProcessing = true;
  log('llamando a streamGeminiTranslation', { mode, longitudTexto: text.length });

  const charQueue: string[] = [];
  let isTyping = false;
  let hasClearedSpinner = false;

  const startSmoothTyping = () => {
    if (isTyping) return;
    isTyping = true;

    currentTypingInterval = setInterval(() => {
      if (charQueue.length > 0) {
        if (!hasClearedSpinner) {
          outputDiv.innerText = '';
          hasClearedSpinner = true;
        }

        const nextChar = charQueue.shift();
        outputDiv.innerText += nextChar;
        outputDiv.scrollTop = outputDiv.scrollHeight;
      } else if (!isProcessing) {
        clearInterval(currentTypingInterval);
        currentTypingInterval = null;
        isTyping = false;
      }
    }, 15);
  };

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('La conexión a la API de Gemini excedió el tiempo de espera (15s).')), 15000)
    );

    const apiPromise = streamGeminiTranslation(text, mode, (chunk: string) => {
      for (const char of chunk) {
        charQueue.push(char);
      }
      startSmoothTyping();
    });

    const fullText = await Promise.race([apiPromise, timeoutPromise]);
    modalCache[mode] = fullText;
    log('streamGeminiTranslation completado:', fullText.length);

    if (!hasClearedSpinner && charQueue.length === 0) {
      if (currentTypingInterval) {
        clearInterval(currentTypingInterval);
        currentTypingInterval = null;
      }
      outputDiv.innerText = fullText || 'No se recibió respuesta.';
      hasClearedSpinner = true;
    }
  } catch (error: any) {
    console.error('[Smart Assistant Error]:', error);
    log('streamGeminiTranslation FALLÓ:', error?.message, error);
    if (currentTypingInterval) {
      clearInterval(currentTypingInterval);
      currentTypingInterval = null;
    }

    const errorMsg = error?.message || 'Ocurrió un error al procesar el texto.';

    if (errorMsg.includes('API Key') || errorMsg.includes('API key') || errorMsg.includes('configurada')) {
      outputDiv.style.overflowY = 'hidden';
      outputDiv.innerHTML = renderApiKeyErrorHTML();
    } else {
      outputDiv.innerText = `⚠️ ${errorMsg}`;
    }
  } finally {
    isProcessing = false;
  }
}

function clearCacheIfNewText(text: string) {
  if (modalCache['__last_text__'] !== text) {
    Object.keys(modalCache).forEach((key) => delete modalCache[key]);
    modalCache['__last_text__'] = text;
  }
}

function removeExistingModal() {
  if (currentTypingInterval) {
    clearInterval(currentTypingInterval);
    currentTypingInterval = null;
  }
  const root = getOwnShadowRoot();
  root.getElementById('smart-assistant-modal')?.remove();
}