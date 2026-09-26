import { streamGeminiTranslation } from '../../services/groq';
import { correctTextWithLanguageTool } from '../../services/languagetool';
import type { EditableTarget } from '../types';
import { replaceTextInPage } from '../replacer';
import { getOwnShadowRoot } from './shadow';
import {
  forceCaptureSelectionViaCopy,
  getLastDocsClipboardText,
  looksLikeDocsInternalId,
} from '../docs-canvas';
import { SA_DEBUG } from '../selection';
import {
  LOADING_SPINNER_HTML,
  ensureSpinnerStyles,
  renderApiKeyErrorHTML,
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

const MENU_ID = 'smart-assistant-menu';
const MODAL_ID = 'smart-assistant-modal';
const STYLES_ID = 'smart-assistant-styles-v2';

const modalCache: Record<string, string> = {};
let isProcessing = false;
let currentTypingInterval: any = null;
let currentOptions: FloatingMenuOptions | null = null;

function ensureStyles(): void {
  const root = getOwnShadowRoot();
  if (root.getElementById(STYLES_ID)) return;

  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    #${MENU_ID} {
      position: fixed !important;
      z-index: 2147483647 !important;
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      border-radius: 50% !important;
      border: none !important;
      box-shadow: 0 2px 6px rgba(15, 30, 53, 0.28) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 24px !important;
      width: 24px !important;
      padding: 0 !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  border-radius 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  padding 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      user-select: none !important;
    }
    #${MENU_ID}.sa-expanded {
      width: auto !important;
      border-radius: 12px !important;
      padding: 0 3px !important;
      cursor: default !important;
    }
    #${MENU_ID} .sa-trigger-icon {
      font-size: 11px !important;
      line-height: 1 !important;
      color: #FFFFFF !important;
      display: block !important;
    }
    #${MENU_ID}.sa-expanded .sa-trigger-icon { display: none !important; }
    #${MENU_ID} .sa-actions { display: none !important; gap: 2px !important; }
    #${MENU_ID}.sa-expanded .sa-actions { display: flex !important; }
    #${MENU_ID} .sa-action {
      background: transparent !important;
      color: #E2E8F0 !important;
      border: none !important;
      padding: 5px 11px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      font-family: inherit !important;
      cursor: pointer !important;
      border-radius: 10px !important;
      white-space: nowrap !important;
      transition: background 0.15s, color 0.15s !important;
      letter-spacing: 0.1px !important;
    }
    #${MENU_ID} .sa-action:hover {
      background: rgba(255, 255, 255, 0.12) !important;
      color: #FFFFFF !important;
    }
    #${MODAL_ID} {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 460px !important;
      max-width: 90vw !important;
      background: #F8FAFC !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 18px !important;
      box-shadow: 0 16px 48px rgba(15, 30, 53, 0.18) !important;
      padding: 22px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
      opacity: 0 !important;
      transition: opacity 0.25s ease !important;
    }
    #${MODAL_ID}.sa-modal-visible { opacity: 1 !important; }
    #${MODAL_ID} .sa-modal-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 16px !important;
      cursor: move !important;
      user-select: none !important;
    }
    #${MODAL_ID} .sa-modal-title {
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.8px !important;
      text-transform: uppercase !important;
      color: #0F1E35 !important;
    }
    #${MODAL_ID} .sa-modal-close {
      background: none !important;
      border: none !important;
      font-size: 16px !important;
      color: #94A3B8 !important;
      cursor: pointer !important;
      padding: 2px 4px !important;
      line-height: 1 !important;
      font-family: inherit !important;
      opacity: 0.6 !important;
      transition: opacity 0.15s !important;
    }
    #${MODAL_ID} .sa-modal-close:hover { opacity: 1 !important; color: #0F1E35 !important; }
    #${MODAL_ID} .sa-modal-tabs {
      display: flex !important;
      gap: 4px !important;
      margin-bottom: 14px !important;
      padding-bottom: 10px !important;
      border-bottom: 1px solid #E2E8F0 !important;
      overflow-x: auto !important;
    }
    #${MODAL_ID} .sa-modal-tab {
      padding: 6px 12px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      background: transparent !important;
      color: #64748B !important;
      white-space: nowrap !important;
      transition: all 0.15s !important;
    }
    #${MODAL_ID} .sa-modal-tab:hover { background: #EEF2F7 !important; color: #0F1E35 !important; }
    #${MODAL_ID} .sa-modal-tab.sa-active {
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
    }
    #${MODAL_ID} .sa-modal-output {
      background: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      font-size: 13px !important;
      line-height: 1.65 !important;
      color: #1A2436 !important;
      min-height: 100px !important;
      max-height: 200px !important;
      overflow-y: auto !important;
      margin-bottom: 16px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    #${MODAL_ID} .sa-errors-panel {
      background: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 12px !important;
      padding: 12px !important;
      margin-bottom: 14px !important;
      max-height: 180px !important;
      overflow-y: auto !important;
    }
    #${MODAL_ID} .sa-error-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 8px 10px !important;
      border-radius: 8px !important;
      background: #F8FAFC !important;
      margin-bottom: 6px !important;
      font-size: 12px !important;
    }
    #${MODAL_ID} .sa-error-item:last-child { margin-bottom: 0 !important; }
    #${MODAL_ID} .sa-error-original {
      color: #DC2626 !important;
      text-decoration: line-through !important;
      font-weight: 500 !important;
    }
    #${MODAL_ID} .sa-error-arrow {
      color: #94A3B8 !important;
      font-size: 11px !important;
    }
    #${MODAL_ID} .sa-error-replacement {
      color: #0F6E5C !important;
      font-weight: 600 !important;
    }
    #${MODAL_ID} .sa-modal-actions {
      display: flex !important;
      gap: 8px !important;
    }
    #${MODAL_ID} .sa-modal-btn {
      flex: 1 !important;
      padding: 10px 14px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      font-family: inherit !important;
      background: #FFFFFF !important;
      color: #1A2436 !important;
      border: 1px solid #D5DDE8 !important;
      transition: all 0.15s !important;
      letter-spacing: 0.1px !important;
    }
    #${MODAL_ID} .sa-modal-btn:hover {
      border-color: #0F1E35 !important;
      color: #0F1E35 !important;
      background: #EEF2F7 !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary {
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      border: none !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary:hover {
      background: #1A2E4A !important;
    }
  `;
  root.appendChild(style);
}

function captureDocsTextIfNeeded(): void {
  if (!currentOptions || currentOptions.source !== 'docs-canvas') return;
  forceCaptureSelectionViaCopy();
  const freshText = getLastDocsClipboardText();
  if (freshText && freshText.trim()) {
    currentOptions.text = freshText;
    log('Docs: texto capturado en mousedown del botón:', JSON.stringify(freshText.slice(0, 40)));
  } else {
    log('Docs: no se capturó texto en mousedown');
  }
}

export function showFloatingMenu(options: FloatingMenuOptions) {
  const existingRoot = getOwnShadowRoot();
  if (existingRoot.getElementById(MODAL_ID)) {
    log('modal ya abierto, no mostrar menú');
    return;
  }

  currentOptions = options;
  removeFloatingMenu();
  ensureStyles();

  const root = getOwnShadowRoot();

  const expandedWidth = 260;
  const menuHeight = 24;

  let adjustedX = options.x + 6;
  let adjustedY = options.y + 6;

  if (adjustedX + expandedWidth > window.innerWidth - 10) {
    adjustedX = options.x - expandedWidth - 6;
  }
  if (adjustedX < 10) adjustedX = 10;

  if (adjustedY + menuHeight > window.innerHeight - 10) {
    adjustedY = options.y - menuHeight - 6;
  }
  if (adjustedY < 10) adjustedY = 10;

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.style.top = `${adjustedY}px`;
  menu.style.left = `${adjustedX}px`;

  const icon = document.createElement('span');
  icon.className = 'sa-trigger-icon';
  icon.textContent = '✦';
  menu.appendChild(icon);

  const actions = document.createElement('div');
  actions.className = 'sa-actions';

  const btnHumanize = document.createElement('button');
  btnHumanize.className = 'sa-action';
  btnHumanize.textContent = 'Humanizar';
  btnHumanize.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    void handleAction('humanize');
  });

  const btnParaphrase = document.createElement('button');
  btnParaphrase.className = 'sa-action';
  btnParaphrase.textContent = 'Parafrasear';
  btnParaphrase.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    void handleAction('standard');
  });

  const btnGrammar = document.createElement('button');
  btnGrammar.className = 'sa-action';
  btnGrammar.textContent = 'Corregir';
  btnGrammar.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    captureDocsTextIfNeeded();
    void handleAction('grammar');
  });

  actions.appendChild(btnHumanize);
  actions.appendChild(btnParaphrase);
  actions.appendChild(btnGrammar);
  menu.appendChild(actions);

  menu.addEventListener('mousedown', (e: MouseEvent) => {
    if (menu.classList.contains('sa-expanded')) return;
    e.preventDefault();
    e.stopPropagation();
    menu.classList.add('sa-expanded');
    log('menú expandido');
  });

  root.appendChild(menu);
  log('botón circular insertado en', { x: adjustedX, y: adjustedY, source: options.source });
}

export function removeFloatingMenu() {
  const root = getOwnShadowRoot();
  root.getElementById(MENU_ID)?.remove();
}

export function hideFloatingMenu() {
  removeFloatingMenu();
}

export function openModalDirectly(text: string, mode: string) {
  removeFloatingMenu();
  openModal(text, mode, null);
}

async function handleAction(mode: string): Promise<void> {
  const options = currentOptions;
  removeFloatingMenu();
  if (!options) return;

  let text = options.text;
  log('handleAction', { mode, source: options.source, textPrevio: JSON.stringify(text.slice(0, 40)) });

  if (options.source === 'docs-canvas') {
    if (!text || !text.trim()) {
      log('Docs: text vacío en handleAction, intentando fallback...');
      forceCaptureSelectionViaCopy();
      await new Promise((resolve) => setTimeout(resolve, 150));
      text = getLastDocsClipboardText();
    }
    if (looksLikeDocsInternalId(text)) {
      log('texto parece ID interno de Docs -- descartando');
      text = '';
    }
  }

  if (!text || !text.trim()) {
    log('texto vacío, intentando leer selección viva...');
    const liveSel = window.getSelection()?.toString().trim() || '';
    if (liveSel) text = liveSel;
  }

  if (!text || !text.trim()) {
    log('handleAction: texto vacío tras todos los intentos');
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
  ensureStyles();
  removeExistingModal();
  clearCacheIfNewText(originalText);

  const root = getOwnShadowRoot();
  let activeMode = mode;
  const isGrammar = mode === 'grammar';
  const isHumanizeOnly = mode === 'humanize';

  const modal = document.createElement('div');
  modal.id = MODAL_ID;

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
        (m) =>
          `<button class="sa-modal-tab ${m.id === activeMode ? 'sa-active' : ''}" data-mode="${m.id}">${m.label}</button>`
      )
      .join('');

  const titleText = isGrammar
    ? 'Corrección Gramatical'
    : isHumanizeOnly
    ? 'Texto Humanizado'
    : 'Parafrasear Texto';

  modal.innerHTML = `
    <div class="sa-modal-header" id="sa-modal-drag-handle">
      <div class="sa-modal-title">${titleText}</div>
      <button class="sa-modal-close" id="sa-modal-close" title="Cerrar (o haz clic fuera)">✕</button>
    </div>

    ${!isHumanizeOnly && !isGrammar ? `<div class="sa-modal-tabs" id="sa-modal-tabs">${renderTabs()}</div>` : ''}

    <div class="sa-modal-output" id="sa-modal-output">${LOADING_SPINNER_HTML}</div>

    <div id="sa-errors-container"></div>

    <div class="sa-modal-actions">
      ${editableTarget ? `<button class="sa-modal-btn sa-primary" id="sa-replace-btn">Reemplazar</button>` : ''}
      <button class="sa-modal-btn" id="sa-copy-btn">Copiar</button>
      <button class="sa-modal-btn" id="sa-regen-btn">Reintentar</button>
    </div>
  `;

  root.appendChild(modal);

  requestAnimationFrame(() => {
    modal.classList.add('sa-modal-visible');
  });

  if (!isHumanizeOnly && !isGrammar) {
    const tabsContainer = modal.querySelector('#sa-modal-tabs');
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
    modal.querySelector('#sa-replace-btn')?.addEventListener('click', async () => {
      const outputEl = root.getElementById('sa-modal-output');
      const textToReplace = outputEl?.innerText || '';
      if (textToReplace && textToReplace.trim().length > 0) {
        try {
          const result = await replaceTextInPage(editableTarget, textToReplace);
          if (result === 'inserted') {
            removeExistingModal();
          }
        } catch (err) {
          log('Error al reemplazar:', err);
        }
      }
    });
  }

  modal.querySelector('#sa-copy-btn')?.addEventListener('click', () => {
    const outputEl = root.getElementById('sa-modal-output');
    const textToCopy = outputEl?.innerText || '';
    if (textToCopy && textToCopy.trim().length > 0) {
      navigator.clipboard.writeText(textToCopy);
      const btn = modal.querySelector('#sa-copy-btn') as HTMLButtonElement;
      btn.textContent = 'Copiado';
      setTimeout(() => (btn.textContent = 'Copiar'), 1500);
    }
  });

  modal.querySelector('#sa-regen-btn')?.addEventListener('click', () => {
    if (!isProcessing) {
      delete modalCache[activeMode];
      loadModeContent(originalText, activeMode);
    }
  });

  modal.querySelector('#sa-modal-close')?.addEventListener('click', removeExistingModal);

  makeModalDraggable(modal);
  setupClickOutsideToClose(modal);

  loadModeContent(originalText, activeMode);
}

function setupClickOutsideToClose(modal: HTMLElement): void {
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
    removeExistingModal();
    document.removeEventListener('mousedown', handler, true);
  };
  setTimeout(() => {
    document.addEventListener('mousedown', handler, true);
  }, 100);
}

function makeModalDraggable(modal: HTMLElement): void {
  const handle = modal.querySelector('#sa-modal-drag-handle') as HTMLElement;
  if (!handle) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('#sa-modal-close')) return;
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    modal.style.setProperty('transform', 'none', 'important');
    modal.style.setProperty('top', rect.top + 'px', 'important');
    modal.style.setProperty('left', rect.left + 'px', 'important');
    document.body.style.cursor = 'move';
    e.preventDefault();
  });

  const onMove = (e: MouseEvent) => {
    if (!isDragging) return;
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    const maxLeft = window.innerWidth - modal.offsetWidth;
    const maxTop = window.innerHeight - modal.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
    modal.style.setProperty('left', newLeft + 'px', 'important');
    modal.style.setProperty('top', newTop + 'px', 'important');
  };

  const onUp = () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

async function loadModeContent(text: string, mode: string) {
  const root = getOwnShadowRoot();
  const outputDiv = root.getElementById('sa-modal-output');
  const errorsContainer = root.getElementById('sa-errors-container');
  if (!outputDiv) return;

  if (currentTypingInterval) {
    clearInterval(currentTypingInterval);
    currentTypingInterval = null;
  }

  outputDiv.style.overflowY = 'auto';
  if (errorsContainer) errorsContainer.innerHTML = '';

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
  log('procesando', { mode, longitudTexto: text.length });

  // ============================================================
  // MODO GRAMMAR: usar LanguageTool
  // ============================================================
  if (mode === 'grammar') {
    try {
      const result = await correctTextWithLanguageTool(text);
      modalCache[mode] = result.correctedText;
      outputDiv.innerText = result.correctedText;

      // Si hay errores, mostrar la lista
      if (errorsContainer && result.errors.length > 0) {
        errorsContainer.innerHTML = `
          <div class="sa-errors-panel">
            ${result.errors
              .map(
                (err) => `
              <div class="sa-error-item">
                <span class="sa-error-original">${escapeHtml(err.original)}</span>
                <span class="sa-error-arrow">→</span>
                <span class="sa-error-replacement">${escapeHtml(err.replacement)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }
    } catch (error: any) {
      console.error('[SA:modal] LanguageTool FALLÓ:', error);
      outputDiv.innerText = `⚠️ ${error?.message || 'Error al corregir con LanguageTool'}`;
    } finally {
      isProcessing = false;
    }
    return;
  }

  // ============================================================
  // MODOS NORMALES (humanize, standard, etc.): usar Groq
  // ============================================================
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
      setTimeout(() => reject(new Error('La conexión a la API excedió el tiempo de espera (15s).')), 15000)
    );

    const apiPromise = streamGeminiTranslation(text, mode, (chunk: string) => {
      for (const char of chunk) {
        charQueue.push(char);
      }
      startSmoothTyping();
    });

    const fullText = await Promise.race([apiPromise, timeoutPromise]);
    modalCache[mode] = fullText;
    log('completado:', fullText.length);

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
    if (currentTypingInterval) {
      clearInterval(currentTypingInterval);
      currentTypingInterval = null;
    }
    const errorMsg = error?.message || 'Ocurrió un error al procesar el texto.';
    if (errorMsg.includes('API Key') || errorMsg.includes('configurada')) {
      outputDiv.style.overflowY = 'hidden';
      outputDiv.innerHTML = renderApiKeyErrorHTML();
    } else {
      outputDiv.innerText = `⚠️ ${errorMsg}`;
    }
  } finally {
    isProcessing = false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  root.getElementById(MODAL_ID)?.remove();
}