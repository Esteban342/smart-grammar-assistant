// src/content/ui/modal/rewrite-mode.ts
// Modo humanizar y parafrasear. Usa streaming de Groq.
// El timeout lo maneja el cliente de Groq.

import { streamGeminiTranslation } from '../../../services/groq';
import { renderApiKeyErrorHTML } from '../components';
import { appState } from './state';
import { SA_DEBUG } from '../../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}

export async function runRewriteMode(
  text: string,
  mode: string,
  outputDiv: HTMLElement
): Promise<void> {
  if (appState.modalCache[mode]) {
    outputDiv.innerText = appState.modalCache[mode];
    return;
  }

  outputDiv.style.overflowY = 'auto';
  appState.isProcessing = true;
  log('procesando', { mode, longitudTexto: text.length });

  const charQueue: string[] = [];
  let isTyping = false;
  let hasClearedSpinner = false;

  const startSmoothTyping = () => {
    if (isTyping) return;
    isTyping = true;
    appState.currentTypingInterval = setInterval(() => {
      if (charQueue.length > 0) {
        if (!hasClearedSpinner) {
          outputDiv.innerText = '';
          hasClearedSpinner = true;
        }
        const nextChar = charQueue.shift();
        outputDiv.innerText += nextChar;
        outputDiv.scrollTop = outputDiv.scrollHeight;
      } else if (!appState.isProcessing) {
        if (appState.currentTypingInterval) {
          clearInterval(appState.currentTypingInterval);
          appState.currentTypingInterval = null;
        }
        isTyping = false;
      }
    }, 15);
  };

  try {
    const fullText = await streamGeminiTranslation(text, mode, (chunk: string) => {
      for (const char of chunk) {
        charQueue.push(char);
      }
      startSmoothTyping();
    });

    appState.modalCache[mode] = fullText;
    log('completado:', fullText.length);

    if (!hasClearedSpinner && charQueue.length === 0) {
      if (appState.currentTypingInterval) {
        clearInterval(appState.currentTypingInterval);
        appState.currentTypingInterval = null;
      }
      outputDiv.innerText = fullText || 'No se recibio respuesta.';
      hasClearedSpinner = true;
    }
  } catch (error: any) {
    console.error('[Smart Assistant Error]:', error);
    if (appState.currentTypingInterval) {
      clearInterval(appState.currentTypingInterval);
      appState.currentTypingInterval = null;
    }
    const errorMsg = error?.message || 'Ocurrio un error al procesar el texto.';
    if (errorMsg.includes('API Key') || errorMsg.includes('configurada')) {
      outputDiv.style.overflowY = 'hidden';
      outputDiv.innerHTML = renderApiKeyErrorHTML();
    } else {
      outputDiv.innerText = `Error: ${errorMsg}`;
    }
  } finally {
    appState.isProcessing = false;
  }
}