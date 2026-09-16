import './style.css';

declare const chrome: any;

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;

  // Cargar la API Key guardada al abrir el popup
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['gemini_api_key'], (result: any) => {
      if (result?.gemini_api_key) {
        apiKeyInput.value = result.gemini_api_key;
        showStatus('✓ API Key configurada', false);
      }
    });
  }

  // Guardar la nueva clave al hacer clic
  saveBtn?.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus('Ingresa una API Key válida', true);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ gemini_api_key: key }, () => {
        showStatus('✓ API Key guardada', false);
      });
    }
  });

  function showStatus(message: string, isError: boolean) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden', 'error');
    if (isError) {
      statusMessage.classList.add('error');
    }
  }
});