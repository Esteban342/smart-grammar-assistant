export async function getApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['gemini_api_key', 'geminiApiKey', 'apiKey'], (result: Record<string, any>) => {
      const key = result?.gemini_api_key || result?.geminiApiKey || result?.apiKey;
      resolve((key as string) || '');
    });
  });
}

export async function setApiKey(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ gemini_api_key: apiKey, geminiApiKey: apiKey }, () => {
      resolve();
    });
  });
}