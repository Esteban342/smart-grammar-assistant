import './style.css';

declare const chrome: any;

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  const updateStatus = (isConfigured: boolean) => {
    if (isConfigured) {
      statusDiv.className = 'status-badge active';
      statusDiv.innerHTML = '<span>✓ API Key lista y cargada</span>';
    } else {
      statusDiv.className = 'status-badge';
      statusDiv.innerHTML = '<span>Configura tu API Key para comenzar</span>';
    }
  };

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['gemini_api_key'], (result: any) => {
      if (result && result.gemini_api_key) {
        apiKeyInput.value = result.gemini_api_key;
        updateStatus(true);
      } else {
        updateStatus(false);
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert('Por favor ingresa una API Key válida.');
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ gemini_api_key: apiKey }, () => {
        updateStatus(true);
        saveBtn.textContent = '¡Guardado!';
        setTimeout(() => {
          saveBtn.textContent = 'Guardar';
        }, 2000);
      });
    }
  });
});