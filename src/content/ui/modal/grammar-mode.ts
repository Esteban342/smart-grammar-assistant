// src/content/ui/modal/grammar-mode.ts
// Modo corregir: llama a Qwen, calcula el diff local y muestra la lista de cambios.

import * as Diff from 'diff';
import { correctTextWithQwen } from '../../../services/groq';
import { appState } from './state';
import type { GrammarSuggestion } from './types';
import { SA_DEBUG } from '../../selection';

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:modal]', ...args);
}

// Limpia caracteres invisibles que Docs inserta al copiar texto.
function sanitizeText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u202F/g, ' ')
    .replace(/\u2007/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Calcula la lista de cambios comparando original y corregido.
function computeLocalDiff(original: string, corrected: string): Array<{ from: string; to: string }> {
  try {
    const parts = Diff.diffWords(original, corrected);
    const corrections: Array<{ from: string; to: string }> = [];

    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      if (part.removed) {
        const next = parts[i + 1];
        if (next && next.added) {
          const fromText = part.value.trim();
          const toText = next.value.trim();
          if (fromText && toText && fromText !== toText) {
            corrections.push({ from: fromText, to: toText });
          }
          i += 2;
          continue;
        }
      }
      i++;
    }

    return corrections;
  } catch (err) {
    console.error('[SA:modal] Error en diff local:', err);
    return [];
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

function renderGrammarArea(container: HTMLElement): void {
  const state = appState.grammarState;
  if (!state) return;

  const total = state.suggestions.length;
  const applied = state.suggestions.filter((s) => s.applied).length;
  const pending = total - applied;
  const allApplied = pending === 0;
  const buttonLabel = allApplied ? 'Desmarcar todo' : 'Aplicar todo';
  const counterText = `${total} ${total === 1 ? 'cambio' : 'cambios'} - ${applied} activo${applied === 1 ? '' : 's'}`;

  const suggestionsHtml = state.suggestions
    .map((s, i) => {
      const appliedClass = s.applied ? 'sa-applied' : '';
      return `
        <div class="sa-grammar-suggestion ${appliedClass}" data-index="${i}">
          <span class="sa-sug-original">${escapeHtml(s.from)}</span>
          <span class="sa-sug-arrow">a</span>
          <span class="sa-sug-replacement">${escapeHtml(s.to)}</span>
          <span class="sa-sug-check"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="sa-grammar-header-row">
      <span class="sa-grammar-counter">${counterText}</span>
      <button class="sa-grammar-apply-all" id="sa-grammar-apply-all">${buttonLabel}</button>
    </div>
    <div class="sa-grammar-suggestions" id="sa-grammar-suggestions">
      ${suggestionsHtml}
    </div>
  `;

  const suggestionsList = container.querySelector('#sa-grammar-suggestions');
  suggestionsList?.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.sa-grammar-suggestion') as HTMLElement | null;
    if (!target) return;
    const index = parseInt(target.getAttribute('data-index') || '-1', 10);
    if (index < 0) return;
    toggleSuggestion(index);
  });

  container.querySelector('#sa-grammar-apply-all')?.addEventListener('click', () => {
    if (allApplied) {
      appState.grammarState?.suggestions.forEach((s) => (s.applied = false));
    } else {
      appState.grammarState?.suggestions.forEach((s) => (s.applied = true));
    }
    refreshGrammarView();
  });
}

function toggleSuggestion(index: number): void {
  const state = appState.grammarState;
  if (!state) return;
  state.suggestions[index].applied = !state.suggestions[index].applied;
  refreshGrammarView();
}

function refreshGrammarView(): void {
  const state = appState.grammarState;
  if (!state) return;

  // El shadow root se obtiene del propio container
  const modal = document.getElementById('smart-assistant-root')?.shadowRoot?.getElementById('smart-assistant-modal');
  const outputDiv = modal?.querySelector('#sa-modal-output') as HTMLElement | null;
  const grammarArea = modal?.querySelector('#sa-grammar-area') as HTMLElement | null;
  if (!outputDiv || !grammarArea) return;

  // Reconstruir el texto con los cambios marcados como aplicados
  let result = state.correctedText;
  for (const s of state.suggestions) {
    if (!s.applied) {
      result = result.replace(s.to, s.from);
    }
  }

  outputDiv.innerText = result;
  renderGrammarArea(grammarArea);
}

export async function runGrammarMode(
  text: string,
  outputDiv: HTMLElement,
  grammarArea: HTMLElement | null
): Promise<void> {
  appState.isProcessing = true;

  const cleanText = sanitizeText(text);
  log('[grammar] texto sanitizado', {
    original: text.length,
    sanitizado: cleanText.length,
  });

  if (grammarArea) {
    grammarArea.innerHTML = `
      <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-bottom: 10px; font-style: italic;">
        Corrigiendo texto
      </div>
    `;
  }

  // PASO 1: corregir el texto con Qwen
  let correctedText = '';
  try {
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

    correctedText = await correctTextWithQwen(cleanText, (chunk: string) => {
      for (const char of chunk) charQueue.push(char);
      startSmoothTyping();
    });

    if (!isTyping) {
      outputDiv.innerText = correctedText;
    }
  } catch (error: any) {
    console.error('[SA:modal] grammar paso 1 fallo:', error);
    outputDiv.innerText = `Error: ${error?.message || 'no se pudo corregir el texto'}`;
    if (grammarArea) grammarArea.innerHTML = '';
    appState.isProcessing = false;
    return;
  }

  // PASO 2: diff local
  const corrections = computeLocalDiff(cleanText, correctedText);
  log('[grammar] diff local encontro', corrections.length, 'cambios');

  if (corrections.length === 0) {
    appState.grammarState = null;
    if (grammarArea) {
      grammarArea.innerHTML = `
        <div style="text-align: center; font-size: 11px; color: #0F6E5C; margin-bottom: 10px; font-weight: 600;">
          Sin errores detectados
        </div>
      `;
    }
    appState.isProcessing = false;
    return;
  }

  appState.grammarState = {
    originalText: cleanText,
    correctedText,
    suggestions: corrections.map<GrammarSuggestion>((c) => ({
      from: c.from,
      to: c.to,
      applied: true,
    })),
  };

  if (grammarArea) {
    renderGrammarArea(grammarArea);
  }

  appState.isProcessing = false;
}