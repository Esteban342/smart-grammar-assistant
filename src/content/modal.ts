import { fetchGeminiTranslation } from '../services/gemini';
const modalCache: Record<string, string> = {};
let isProcessing = false;

export function showFloatingMenu(x: number, y: number, text: string) {
  removeFloatingMenu();

  const menu = document.createElement('div');
  menu.id = 'smart-assistant-menu';
  menu.style.cssText = `
    position: absolute; top: ${y + 8}px; left: ${x}px; z-index: 2147483647;
    background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    border-radius: 6px; padding: 4px; display: flex; gap: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const btnHumanize = createButton('Humanizar', true, (e) => {
    e.stopPropagation();
    removeFloatingMenu();
    openModal(text, 'humanize');
  });

  const btnParaphrase = createButton('Parafrasear', false, (e) => {
    e.stopPropagation();
    removeFloatingMenu();
    openModal(text, 'standard');
  });

  menu.appendChild(btnHumanize);
  menu.appendChild(btnParaphrase);
  document.body.appendChild(menu);
}

export function removeFloatingMenu() {
  document.getElementById('smart-assistant-menu')?.remove();
}

function openModal(originalText: string, mode: string) {
  removeExistingModal();
  clearCacheIfNewText(originalText);

  let activeMode = mode;
  const isHumanizeOnly = mode === 'humanize';

  const modal = document.createElement('div');
  modal.id = 'smart-assistant-modal';
  modal.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 440px;
    background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 16px;
    z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const modes = [
    { id: 'standard', label: 'Estándar' },
    { id: 'formal', label: 'Formal' },
    { id: 'academic', label: 'Académico' },
    { id: 'simple', label: 'Sencillo' },
    { id: 'creative', label: 'Creativo' }
  ];

  const renderTabs = () =>
    modes
      .map(
        (m) => `<button class="mode-tab" data-mode="${m.id}" style="
          padding: 5px 10px; border: none;
          background: ${m.id === activeMode ? '#0f172a' : 'transparent'};
          color: ${m.id === activeMode ? '#ffffff' : '#475569'};
          font-weight: ${m.id === activeMode ? '600' : 'normal'};
          border-radius: 4px; font-size: 12px; cursor: pointer;
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
      border: 1px solid #e2e8f0; margin-bottom: 12px; line-height: 1.5;
    ">Procesando...</div>

    <div style="display:flex; gap:8px;">
      <button id="copy-btn" style="flex:1; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:8px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Copiar</button>
      <button id="regen-btn" style="flex:1; background:#0f172a; color:#ffffff; border:none; padding:8px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Reintentar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Eventos de Pestañas
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

  // Evento Botón Copiar
  modal.querySelector('#copy-btn')?.addEventListener('click', () => {
    const textToCopy = (document.getElementById('modal-output') as HTMLElement)?.innerText || '';
    navigator.clipboard.writeText(textToCopy);
    const copyBtn = modal.querySelector('#copy-btn') as HTMLButtonElement;
    copyBtn.innerText = 'Copiado';
    setTimeout(() => (copyBtn.innerText = 'Copiar'), 1500);
  });

  // Evento Botón Reintentar
  modal.querySelector('#regen-btn')?.addEventListener('click', () => {
    if (!isProcessing) {
      delete modalCache[activeMode]; // Eliminar caché previa para forzar refresco
      loadModeContent(originalText, activeMode);
    }
  });

  modal.querySelector('#close-modal-btn')?.addEventListener('click', removeExistingModal);

  // Carga inicial de datos
  loadModeContent(originalText, activeMode);
}

// Carga Inteligente: Usa Caché o Llama a la API
async function loadModeContent(text: string, mode: string) {
  const outputDiv = document.getElementById('modal-output');
  if (!outputDiv) return;

  // 1. Revisar Caché Local
  if (modalCache[mode]) {
    outputDiv.innerText = modalCache[mode];
    return;
  }

  // 2. Llama a la API si no existe en Caché
  outputDiv.innerText = 'Procesando solicitud...';
  isProcessing = true;

  try {
    const result = await fetchGeminiTranslation(text, mode);
    modalCache[mode] = result;
    outputDiv.innerText = result;
  } catch (error: any) {
    outputDiv.innerText = error.message;
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
  document.getElementById('smart-assistant-modal')?.remove();
}

function createButton(text: string, isPrimary: boolean, onClick: (e: MouseEvent) => void) {
  const btn = document.createElement('button');
  btn.innerText = text;
  btn.style.cssText = `
    background: ${isPrimary ? '#0f172a' : '#f8fafc'};
    color: ${isPrimary ? '#ffffff' : '#0f172a'};
    border: ${isPrimary ? 'none' : '1px solid #cbd5e1'};
    padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;
  `;
  btn.onclick = onClick;
  return btn;
}