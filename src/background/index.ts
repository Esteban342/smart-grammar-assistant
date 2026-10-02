// src/background/index.ts
// Punto de entrada del service worker.
// Registra el menu contextual y el sistema de pegado en Docs.

import { registerContextMenu, listenContextMenuClicks } from './context-menu';
import { listenPasteRequests } from './docs-paste';

// Menu contextual: registrar al instalar y escuchar clics.
chrome.runtime.onInstalled.addListener(() => {
  registerContextMenu();
});

listenContextMenuClicks();

// Sistema de pegado en Docs via chrome.debugger.
listenPasteRequests();