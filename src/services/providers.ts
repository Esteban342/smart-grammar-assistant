// src/services/providers.ts
// Registro de proveedores de IA compatibles con OpenAI/SSE y su prioridad.

export type ProviderId = 'groq' | 'gemini' | 'openrouter' | 'mistral' | 'openai' | 'deepseek';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  endpoint: string;
  defaultModel: string;
  placeholder: string;
}

export interface SavedProvider {
  id: ProviderId;
  apiKey: string;
  model?: string;
  enabled: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'qwen/qwen3.8-27b',
    placeholder: 'gsk_...',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.5-flash',
    placeholder: 'AIza...',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/free',
    placeholder: 'sk-or-...',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    placeholder: '...',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    placeholder: 'sk-...',
  },
};

const STORAGE_KEY = 'ai_providers_v1';

// Lee solo los proveedores activos, en orden de prioridad.
// Mantiene compatibilidad con la clave antigua `groq_api_key`.
export async function getConfiguredProviders(): Promise<SavedProvider[]> {
  const storage = (globalThis as any).chrome?.storage?.local;
  if (!storage) return [];

  const data = await new Promise<Record<string, any>>((resolve) => {
    storage.get([STORAGE_KEY, 'groq_api_key', 'groqApiKey'], (items: Record<string, any>) =>
      resolve(items || {})
    );
  });

  if (Array.isArray(data[STORAGE_KEY]) && data[STORAGE_KEY].length > 0) {
    return data[STORAGE_KEY].filter((p: SavedProvider) => p.enabled && p.apiKey?.trim());
  }

  const legacyKey = data.groq_api_key || data.groqApiKey;
  if (typeof legacyKey === 'string' && legacyKey.trim()) {
    return [{ id: 'groq', apiKey: legacyKey.trim(), enabled: true }];
  }

  return [];
}

// Lee todos los proveedores guardados (incluidos los desactivados) para el Popup.
export async function getAllSavedProviders(): Promise<SavedProvider[]> {
  const storage = (globalThis as any).chrome?.storage?.local;
  if (!storage) return [];

  const data = await new Promise<Record<string, any>>((resolve) => {
    storage.get([STORAGE_KEY, 'groq_api_key', 'groqApiKey'], (items: Record<string, any>) =>
      resolve(items || {})
    );
  });

  if (Array.isArray(data[STORAGE_KEY])) {
    return data[STORAGE_KEY];
  }

  const legacyKey = data.groq_api_key || data.groqApiKey;
  if (typeof legacyKey === 'string' && legacyKey.trim()) {
    return [{ id: 'groq', apiKey: legacyKey.trim(), enabled: true }];
  }

  return [];
}

export async function saveProviders(list: SavedProvider[]): Promise<void> {
  const storage = (globalThis as any).chrome?.storage?.local;
  if (!storage) return;

  await new Promise<void>((resolve) => {
    storage.set({ [STORAGE_KEY]: list }, () => resolve());
  });
}