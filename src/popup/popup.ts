import './style.css';
import {
  PROVIDERS,
  getAllSavedProviders,
  saveProviders,
  type ProviderId,
  type SavedProvider,
} from '../services/providers';

const KEY_URLS: Record<ProviderId, string> = {
  groq: 'https://console.groq.com/keys',
  gemini: 'https://aistudio.google.com/apikey',
  openrouter: 'https://openrouter.ai/keys',
  mistral: 'https://console.mistral.ai/api-keys',
  openai: 'https://platform.openai.com/api-keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
};

function maskKey(key: string): string {
  const clean = key.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  const getKeyLink = document.getElementById('getKeyLink') as HTMLAnchorElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const addBtn = document.getElementById('addBtn') as HTMLButtonElement;
  const providerList = document.getElementById('providerList') as HTMLDivElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  let providers: SavedProvider[] = await getAllSavedProviders();
  let draggedIndex: number | null = null;

  const updateProviderUI = () => {
    const id = providerSelect.value as ProviderId;
    apiKeyInput.placeholder = PROVIDERS[id]?.placeholder || 'Pega tu API Key...';
    getKeyLink.href = KEY_URLS[id] || '#';
  };

  const updateStatus = () => {
    const active = providers.filter((p) => p.enabled && p.apiKey.trim());
    if (active.length > 0) {
      const first = PROVIDERS[active[0].id]?.name || active[0].id;
      statusDiv.className = 'status-badge active';
      statusDiv.innerHTML = `<span> Listo · Principal: ${first} (${active.length} activa${active.length > 1 ? 's' : ''})</span>`;
    } else {
      statusDiv.className = 'status-badge';
      statusDiv.innerHTML = '<span>Agrega al menos una API Key para empezar</span>';
    }
  };

  const renderList = () => {
    if (providers.length === 0) {
      providerList.innerHTML =
        '<div style="font-size:11.5px; color:#5C5A56; padding:6px 0;">Aún no has guardado ninguna clave.</div>';
      updateStatus();
      return;
    }

    providerList.innerHTML = providers
      .map((p, index) => {
        const meta = PROVIDERS[p.id];
        const roleLabel = index === 0 ? 'Principal' : `Respaldo ${index}`;
        const roleClass = index === 0 ? 'role-badge primary' : 'role-badge';
        return `
          <div class="provider-item" draggable="true" data-index="${index}">
            <span class="drag-handle" title="Arrastra para reordenar">⋮⋮</span>
            <div class="provider-info">
              <div class="provider-top">
                <span class="${roleClass}">${roleLabel}</span>
                <span class="provider-name">${meta?.name || p.id}</span>
              </div>
              <span class="key-mask">${maskKey(p.apiKey)}</span>
            </div>
            <button class="icon-btn edit" title="Editar clave">✎</button>
            <button class="icon-btn delete" title="Eliminar">✕</button>
          </div>
        `;
      })
      .join('');

    updateStatus();
  };

  providerSelect.addEventListener('change', updateProviderUI);

  addBtn.addEventListener('click', async () => {
    const id = providerSelect.value as ProviderId;
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert('Por favor pega una API Key válida.');
      return;
    }

    const duplicate = providers.some((p) => p.apiKey.trim() === apiKey);
    if (duplicate) {
      alert('Esa API Key ya está agregada.');
      return;
    }

    providers.push({ id, apiKey, enabled: true });
    await saveProviders(providers);
    apiKeyInput.value = '';
    renderList();
  });

  // Editar o Eliminar
  providerList.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const item = target.closest('.provider-item') as HTMLElement | null;
    if (!item) return;

    const index = parseInt(item.dataset.index || '-1', 10);
    if (index < 0 || index >= providers.length) return;

    if (target.classList.contains('edit')) {
      const meta = PROVIDERS[providers[index].id];
      const newKey = prompt(`Nueva API Key para ${meta?.name || providers[index].id}:`, providers[index].apiKey);
      if (newKey && newKey.trim()) {
        providers[index].apiKey = newKey.trim();
        await saveProviders(providers);
        renderList();
      }
    } else if (target.classList.contains('delete')) {
      providers.splice(index, 1);
      await saveProviders(providers);
      renderList();
    }
  });

  // Arrastrar y soltar (Drag & Drop)
  providerList.addEventListener('dragstart', (e) => {
    const item = (e.target as HTMLElement).closest('.provider-item') as HTMLElement | null;
    if (!item) return;
    draggedIndex = parseInt(item.dataset.index || '-1', 10);
    item.classList.add('dragging');
  });

  providerList.addEventListener('dragend', (e) => {
    const item = (e.target as HTMLElement).closest('.provider-item') as HTMLElement | null;
    item?.classList.remove('dragging');
    providerList.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    draggedIndex = null;
  });

  providerList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = (e.target as HTMLElement).closest('.provider-item') as HTMLElement | null;
    providerList.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    if (item && parseInt(item.dataset.index || '-1', 10) !== draggedIndex) {
      item.classList.add('drag-over');
    }
  });

  providerList.addEventListener('drop', async (e) => {
    e.preventDefault();
    const item = (e.target as HTMLElement).closest('.provider-item') as HTMLElement | null;
    if (!item || draggedIndex === null) return;

    const targetIndex = parseInt(item.dataset.index || '-1', 10);
    if (targetIndex < 0 || targetIndex === draggedIndex) return;

    const [moved] = providers.splice(draggedIndex, 1);
    providers.splice(targetIndex, 0, moved);
    await saveProviders(providers);
    renderList();
  });

  updateProviderUI();
  renderList();
});