// src/background/docs-paste.ts
// Reemplazo de texto en Google Docs usando chrome.debugger.
// Envia un Ctrl+V "real" (isTrusted: true) que Docs si acepta.

interface PasteRequest {
  action: 'PASTE_IN_DOCS';
}

interface PasteResponse {
  ok: boolean;
  error?: string;
}

// Adjunta el debugger al tab, envia Ctrl+V, y suelta el debugger.
async function performDocsPaste(tabId: number): Promise<PasteResponse> {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');

    // keyDown
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      modifiers: 2, // Ctrl
      key: 'v',
      code: 'KeyV',
      windowsVirtualKeyCode: 86,
      nativeVirtualKeyCode: 86,
    });

    // keyUp
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 2,
      key: 'v',
      code: 'KeyV',
      windowsVirtualKeyCode: 86,
      nativeVirtualKeyCode: 86,
    });

    await chrome.debugger.detach({ tabId });
    return { ok: true };
  } catch (err) {
    console.error('[SA:bg] PASTE_IN_DOCS fallo:', err);
    // Asegurar que soltamos el debugger aunque falle
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      // Ignorar errores de detach
    }
    return { ok: false, error: String(err) };
  }
}

// Escucha las peticiones del content script para pegar en Docs.
export function listenPasteRequests(): void {
  chrome.runtime.onMessage.addListener((message: PasteRequest, sender, sendResponse) => {
    if (message.action !== 'PASTE_IN_DOCS') return false;

    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'no tab id' });
      return true;
    }

    void performDocsPaste(tabId).then(sendResponse);
    return true; // respuesta asincrona
  });
}