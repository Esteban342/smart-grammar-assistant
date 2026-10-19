// src/content/ui/modal/index.ts
// API publica del sistema de modales.
// Orquesta el menu flotante, el modal y los modos de contenido.

import { getOwnShadowRoot } from '../shadow';
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
import { ensureSpinnerStyles, renderLongTextWarningHTML } from '../components';
function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}
const MAX_CHARS_WARNING = 3000;

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
      delete appState.modalCache[mode];
      appState.grammarState = null;
      loadContent(originalText, mode, root, isGrammar);
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


      // ─── CONTROL DE TEXTO LARGO ──────────────────────────────────────────────
  if (text.length > MAX_CHARS_WARNING) {
    log('texto excede el limite, mostrando advertencia', text.length);
    
    // 1. Ocultamos los botones de abajo para ganar espacio vertical
    const actionsArea = root.querySelector('.sa-modal-actions') as HTMLElement;
    if (actionsArea) actionsArea.style.setProperty('display', 'none', 'important');

    // 2. Mostramos la advertencia
    outputDiv.innerHTML = renderLongTextWarningHTML(text.length);
    
    // 3. Forzamos al contenedor a quitarse el relleno y adaptarse sin scroll
    outputDiv.style.setProperty('padding', '0', 'important');
    outputDiv.style.setProperty('max-height', 'none', 'important');
    outputDiv.style.setProperty('min-height', '160px', 'important');
    outputDiv.style.setProperty('overflow-y', 'hidden', 'important');

    outputDiv.querySelector('#sa-cancel-long')?.addEventListener('click', () => {
      removeExistingModal();
    });

    outputDiv.querySelector('#sa-confirm-long')?.addEventListener('click', () => {
      // 4. Restauramos todo a la normalidad para que la IA escriba
      if (actionsArea) actionsArea.style.setProperty('display', 'flex', 'important');
      outputDiv.style.setProperty('padding', '18px 20px', 'important');
      outputDiv.style.setProperty('max-height', '190px', 'important');
      outputDiv.style.setProperty('overflow-y', 'auto', 'important');
      
            outputDiv.innerHTML = ''; 
      
      // --- NUEVO: Creamos el controlador de cancelación ---
      if (appState.currentAbortController) appState.currentAbortController.abort();
      appState.currentAbortController = new AbortController();
      const signal = appState.currentAbortController.signal;

      if (isGrammar) {
        void runGrammarMode(text, outputDiv, grammarArea, signal);
      } else {
        void runRewriteMode(text, mode, outputDiv, signal);
      }
    });

    return; 
  }

  // --- NUEVO: Creamos el controlador de cancelación ---
  if (appState.currentAbortController) appState.currentAbortController.abort();
  appState.currentAbortController = new AbortController();
  const signal = appState.currentAbortController.signal;

  if (isGrammar) {
    void runGrammarMode(text, outputDiv, grammarArea, signal);
  } else {
    void runRewriteMode(text, mode, outputDiv, signal);
  }
}

function clearCacheIfNewText(text: string): void {
  if (appState.modalCache['__last_text__'] !== text) {
    Object.keys(appState.modalCache).forEach((key) => delete appState.modalCache[key]);
    appState.modalCache['__last_text__'] = text;
  }
}

function removeExistingModal(): void {
  // --- NUEVO: Abortar la petición a la API si está en curso ---
  if (appState.currentAbortController) {
    appState.currentAbortController.abort();
    appState.currentAbortController = null;
  }

  if (appState.currentTypingInterval) {
    clearInterval(appState.currentTypingInterval);
    appState.currentTypingInterval = null;
  }
  appState.grammarState = null;
  const root = getOwnShadowRoot();
  root.getElementById(MODAL_ID)?.remove();
}