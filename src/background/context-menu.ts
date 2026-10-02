// src/background/context-menu.ts
// Menu contextual (clic derecho) para humanizar y parafrasear.

const MENU_ITEMS = [
  { id: 'humanize-selection', title: 'Humanizar texto con IA' },
  { id: 'paraphrase-selection', title: 'Parafrasear texto con IA' },
] as const;

// Registra las opciones del menu contextual.
// Solo se llama una vez cuando la extension se instala o actualiza.
export function registerContextMenu(): void {
  chrome.contextMenus.create({
    id: MENU_ITEMS[0].id,
    title: MENU_ITEMS[0].title,
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: MENU_ITEMS[1].id,
    title: MENU_ITEMS[1].title,
    contexts: ['selection'],
  });
}

// Escucha los clics en el menu contextual.
// Envia el texto seleccionado al content script del tab activo.
export function listenContextMenuClicks(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id || !info.selectionText) return;

    const mode = info.menuItemId === MENU_ITEMS[0].id ? 'humanize' : 'standard';

    chrome.tabs.sendMessage(tab.id, {
      action: 'OPEN_MODAL_FROM_CONTEXT',
      text: info.selectionText,
      mode,
    });
  });
}