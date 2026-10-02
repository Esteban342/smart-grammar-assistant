// src/content/ui/modal/index.ts
// API publica del sistema de modales.
// Orquesta el menu flotante, el modal y los modos de contenido.

import { getOwnShadowRoot } from '../shadow';
import { ensureSpinnerStyles } from '../components';
import { ensureStyles, MODAL_ID } from './styles';
import { appState } from './state';
import { showFloatingMenu as showFloatingMenuBase, hideFloatingMenu, removeFloatingMenu } from './floating-menu';
import { createModalHtml } from './modal-html';
import { makeModalDraggable } from './modal-drag';
import { setupClickOutsideToClose } from './modal-click-outside';
import { runRewriteMode } from './rewrite-mode';
import { runGrammarMode } from './grammar-mode';
import { replaceTextInPage } from '../../replacer';
import { forceCaptureSelectionViaCopy, getLastDocsClipboardText, looksLikeDocsInternalId } from '../../docs-canvas';
import { SA_DEBUG } from '../../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}

// ============================================================
// Re-exports publicos
// ============================================================

export { hideFloatingMenu, removeFloatingMenu };

export function showFloatingMenu(options: {
  text: string;
  x: number;
  y: number;
  source: 'dom' | 'docs-canvas';
  editableTarget?: any;
}): void {
  showFloatingMenuBase(options as any, handleAction);
}

export function openModalDirectly(text: string, mode: string): void {
  removeFloatingMenu();
  openModal(text, mode, null);
}

// ============================================================
// Logica interna
// ============================================================

async function handleAction(mode: string): Promise<void> {
  const options = appState.currentOptions;
  removeFloatingMenu();
  if (!options) return;

  let text = options.text;
  log('handleAction', { mode, source: options.source, textPrevio: JSON.stringify(text.slice(0, 40)) });

  if (options.source === 'docs-canvas') {
    if (!text || !text.trim()) {
      log('Docs: texto vacio en handleAction, intentando fallback');
      forceCaptureSelectionViaCopy();
      await new Promise((resolve) => setTimeout(resolve, 150));
      text = getLastDocsClipboardText();
    }
    if (looksLikeDocsInternalId(text)) {
      log('texto capturado parece un ID interno de Docs, se descarta');
      text = '';
    }
  }

  if (!text || !text.trim()) {
    const liveSel = window.getSelection()?.toString().trim() || '';
    if (liveSel) text = liveSel;
  }

  if (!text || !text.trim()) {
    log('handleAction: texto vacio tras todos los intentos');
    openModal(
      'No se pudo leer automaticamente el texto seleccionado en esta pagina.\n\nPrueba a copiar el texto con Ctrl+C antes de presionar el boton.',
      mode,
      options.editableTarget || null
    );
    return;
  }

  openModal(text, mode, options.editableTarget || null);
}

function openModal(originalText: string, mode: string, editableTarget: any): void {
  ensureSpinnerStyles();
  ensureStyles();
  removeExistingModal();
  clearCacheIfNewText(originalText);

  appState.grammarState = null;

  const root = getOwnShadowRoot();
  const isGrammar = mode === 'grammar';

  // Callbacks del modal
  const callbacks = {
    onClose: () => removeExistingModal(),
    onCopy: () => {
      const outputEl = root.getElementById('sa-modal-output');
      const textToCopy = outputEl?.innerText || '';
      if (!textToCopy.trim()) return;
      navigator.clipboard.writeText(textToCopy);
      const btn = root.getElementById('sa-copy-btn') as HTMLButtonElement | null;
      if (btn) {
        btn.textContent = 'Copiado';
        setTimeout(() => (btn.textContent = 'Copiar'), 1500);
      }
    },
    onRegen: () => {
      if (appState.isProcessing) return;
      const outputEl = root.getElementById('sa-modal-output');
      const currentText = outputEl?.innerText || originalText;
      delete appState.modalCache[mode];
      appState.grammarState = null;
      loadContent(currentText, mode, root, isGrammar);
    },
    onReplace: editableTarget
      ? async () => {
          const outputEl = root.getElementById('sa-modal-output');
          const textToReplace = outputEl?.innerText || '';
          if (!textToReplace.trim()) return;
          try {
            const result = await replaceTextInPage(editableTarget, textToReplace);
            if (result === 'inserted') removeExistingModal();
          } catch (err) {
            log('Error al reemplazar:', err);
          }
        }
      : null,
    onTabClick: (newMode: string) => {
      if (appState.isProcessing) return;
      const tabsContainer = root.getElementById('sa-modal-tabs');
      if (tabsContainer) {
        Array.from(tabsContainer.querySelectorAll('.sa-modal-tab')).forEach((tab) => {
          const el = tab as HTMLElement;
          const isActive = el.getAttribute('data-mode') === newMode;
          el.classList.toggle('sa-active', isActive);
        });
      }
      loadContent(originalText, newMode, root, false);
    },
  };

  const modal = createModalHtml(mode, editableTarget, callbacks);
  root.appendChild(modal);

  requestAnimationFrame(() => {
    modal.classList.add('sa-modal-visible');
  });

  makeModalDraggable(modal);
  setupClickOutsideToClose(modal, removeExistingModal);

  loadContent(originalText, mode, root, isGrammar);
}

function loadContent(
  text: string,
  mode: string,
  root: ShadowRoot,
  isGrammar: boolean
): void {
  const outputDiv = root.getElementById('sa-modal-output');
  const grammarArea = root.getElementById('sa-grammar-area');
  if (!outputDiv) return;

  if (appState.currentTypingInterval) {
    clearInterval(appState.currentTypingInterval);
    appState.currentTypingInterval = null;
  }
  outputDiv.style.overflowY = 'auto';
  if (grammarArea) grammarArea.innerHTML = '';

  if (text.startsWith('No se pudo leer')) {
    outputDiv.innerText = text;
    return;
  }

  if (isGrammar) {
    void runGrammarMode(text, outputDiv, grammarArea);
  } else {
    void runRewriteMode(text, mode, outputDiv);
  }
}

function clearCacheIfNewText(text: string): void {
  if (appState.modalCache['__last_text__'] !== text) {
    Object.keys(appState.modalCache).forEach((key) => delete appState.modalCache[key]);
    appState.modalCache['__last_text__'] = text;
  }
}

function removeExistingModal(): void {
  if (appState.currentTypingInterval) {
    clearInterval(appState.currentTypingInterval);
    appState.currentTypingInterval = null;
  }
  appState.grammarState = null;
  const root = getOwnShadowRoot();
  root.getElementById(MODAL_ID)?.remove();
}