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
    chrome.storage.local.get(
      ['groq_api_key', 'groqApiKey', 'gemini_api_key', 'geminiApiKey'],
      (result: any) => {
        const key =
          result?.groq_api_key ||
          result?.groqApiKey ||
          result?.gemini_api_key ||
          result?.geminiApiKey;
        if (key) {
          apiKeyInput.value = key;
          updateStatus(true);
        } else {
          updateStatus(false);
        }
      }
    );
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert('Por favor ingresa una API Key válida.');
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Guardamos con las claves de Groq Y de Gemini (por compatibilidad)
      chrome.storage.local.set(
        {
          groq_api_key: apiKey,
          groqApiKey: apiKey,
          gemini_api_key: apiKey,
          geminiApiKey: apiKey
        },
        () => {
          updateStatus(true);
          saveBtn.textContent = '¡Guardado!';
          setTimeout(() => {
            saveBtn.textContent = 'Guardar';
          }, 2000);
        }
      );
    }
  });
});