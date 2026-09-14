declare const chrome: any;

// Escuchar la selección de texto con un ligero retardo para no chocar con el menú de Edge
document.addEventListener('mouseup', (event) => {
  // Evitar procesar si el clic fue dentro de nuestro propio menú
  const target = event.target as HTMLElement;
  if (target && target.closest('#smart-assistant-menu')) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 2) {
      // Obtener la posición exacta de la selección
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        showFloatingMenu(rect.left + window.scrollX, rect.bottom + window.scrollY, selectedText);
      }
    } else {
      removeFloatingMenu();
    }
  }, 100);
});

function showFloatingMenu(x: number, y: number, text: string) {
  removeFloatingMenu();

  const menu = document.createElement('div');
  menu.id = 'smart-assistant-menu';
  menu.style.cssText = `
    position: absolute;
    top: ${y + 8}px;
    left: ${x}px;
    z-index: 2147483647; /* Máxima prioridad sobre la UI del navegador */
    background: #ffffff;
    border: 1px solid #cbd5e1;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 6px;
    display: flex;
    gap: 6px;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const btnGrammar = document.createElement('button');
  btnGrammar.innerText = '✨ Corregir';
  btnGrammar.style.cssText = getButtonStyle('#2563eb');
  btnGrammar.onclick = (e) => {
    e.stopPropagation();
    processSelection(text, 'grammar', menu);
  };

  const btnHumanize = document.createElement('button');
  btnHumanize.innerText = '🧠 Humanizar';
  btnHumanize.style.cssText = getButtonStyle('#4f46e5');
  btnHumanize.onclick = (e) => {
    e.stopPropagation();
    processSelection(text, 'humanize', menu);
  };

  menu.appendChild(btnGrammar);
  menu.appendChild(btnHumanize);
  document.body.appendChild(menu);
}

function getButtonStyle(bgColor: string): string {
  return `
    background: ${bgColor};
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
}

function removeFloatingMenu() {
  const existingMenu = document.getElementById('smart-assistant-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
}

async function processSelection(text: string, mode: 'grammar' | 'humanize', menuDiv: HTMLElement) {
  menuDiv.innerHTML = '<span style="font-size: 12px; padding: 4px 8px; color: #64748b; font-weight: bold;">Procesando...</span>';

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['gemini_api_key'], async (result: any) => {
      const apiKey = result.gemini_api_key;

      if (!apiKey) {
        alert('Por favor configura tu API Key en el icono de la extensión.');
        removeFloatingMenu();
        return;
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: buildPrompt(text, mode) }] }]
            })
          }
        );

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (resultText) {
          showResultModal(resultText);
        } else {
          alert('No se pudo procesar el texto.');
        }
      } catch (error) {
        console.error(error);
        alert('Error al conectar con Gemini.');
      } finally {
        removeFloatingMenu();
      }
    });
  }
}

function buildPrompt(text: string, mode: 'grammar' | 'humanize'): string {
  if (mode === 'grammar') {
    return `Actúa como corrector profesional. Corrija ortografía y gramática manteniendo el sentido original. Devuelve ÚNICAMENTE el texto corregido:\n\n"${text}"`;
  }
  return `Actúa como redactor. Reescribe el texto para que suene 100% natural, conversacional y fluido en español cotidiano. Devuelve ÚNICAMENTE el texto reescrito:\n\n"${text}"`;
}

function showResultModal(resultText: string) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    padding: 16px;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
      <strong style="font-size:13px; color:#1e293b;">Resultado:</strong>
      <button id="close-modal-btn" style="background:none; border:none; cursor:pointer; font-size:14px;">✕</button>
    </div>
    <div style="font-size:13px; color:#334155; max-height: 150px; overflow-y: auto; background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
      ${resultText}
    </div>
    <button id="copy-modal-btn" style="width:100%; background:#2563eb; color:white; border:none; padding:8px; border-radius:6px; font-weight:500; cursor:pointer;">
      📋 Copiar al Portapapeles
    </button>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-modal-btn')?.addEventListener('click', () => modal.remove());
  document.getElementById('copy-modal-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(resultText);
    const btn = document.getElementById('copy-modal-btn') as HTMLButtonElement;
    btn.innerText = '¡Copiado!';
    setTimeout(() => modal.remove(), 1200);
  });
}