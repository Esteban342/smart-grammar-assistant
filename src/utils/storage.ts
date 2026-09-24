// src/utils/storage.ts

export async function getApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['groq_api_key', 'groqApiKey', 'gemini_api_key', 'geminiApiKey', 'apiKey'],
      (result: Record<string, any>) => {
        const key =
          result?.groq_api_key ||
          result?.groqApiKey ||
          result?.gemini_api_key ||
          result?.geminiApiKey ||
          result?.apiKey;
        resolve((key as string) || '');
      }
    );
  });
}

export async function setApiKey(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    // Guardamos con las dos claves para compatibilidad
    chrome.storage.local.set(
      {
        groq_api_key: apiKey,
        groqApiKey: apiKey,
        // Mantenemos las viejas por si acaso hace falta volver a Gemini
        gemini_api_key: apiKey,
        geminiApiKey: apiKey
      },
      () => resolve()
    );
  });
}