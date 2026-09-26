chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'humanize-selection',
    title: 'Humanizar texto con IA',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'paraphrase-selection',
    title: 'Parafrasear texto con IA',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;

  const mode = info.menuItemId === 'humanize-selection' ? 'humanize' : 'standard';
  chrome.tabs.sendMessage(tab.id, {
    action: 'OPEN_MODAL_FROM_CONTEXT',
    text: info.selectionText,
    mode: mode
  });
});

// ============================================================
// Reemplazo en Docs usando chrome.debugger
// Envía un evento Ctrl+V "real" (isTrusted: true) al tab,
// que Docs SÍ acepta (a diferencia del paste sintético normal).
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'PASTE_IN_DOCS') return false;

  const tabId = sender.tab?.id;
  if (!tabId) {
    sendResponse({ ok: false, error: 'no tab id' });
    return true;
  }

  (async () => {
    try {
      // Adjuntar debugger al tab
      await chrome.debugger.attach({ tabId }, '1.3');

      // Enviar keyDown con Ctrl+V
      await chrome.debugger.sendCommand(
        { tabId },
        'Input.dispatchKeyEvent',
        {
          type: 'keyDown',
          modifiers: 2,          // 2 = Ctrl
          key: 'v',
          code: 'KeyV',
          windowsVirtualKeyCode: 86,
          nativeVirtualKeyCode: 86,
        }
      );

      // Y keyUp
      await chrome.debugger.sendCommand(
        { tabId },
        'Input.dispatchKeyEvent',
        {
          type: 'keyUp',
          modifiers: 2,
          key: 'v',
          code: 'KeyV',
          windowsVirtualKeyCode: 86,
          nativeVirtualKeyCode: 86,
        }
      );

      // Soltar debugger (quita el banner)
      await chrome.debugger.detach({ tabId });

      sendResponse({ ok: true });
    } catch (err) {
      console.error('[SA:bg] PASTE_IN_DOCS falló:', err);
      // Asegurar que soltamos el debugger aunque falle
      try {
        await chrome.debugger.detach({ tabId });
      } catch {}
      sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true; // respuesta asíncrona
});