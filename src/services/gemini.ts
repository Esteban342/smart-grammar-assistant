declare const chrome: any;

export async function fetchGeminiTranslation(text: string, mode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
      return reject(new Error('Recarga la página (F5) para sincronizar la extensión.'));
    }

    chrome.storage.local.get(['gemini_api_key'], async (result: any) => {
      const apiKey = result?.gemini_api_key;

      if (!apiKey) {
        return reject(new Error('API Key no configurada en la extensión.'));
      }

      const prompt = buildPrompt(text, mode);
      const payload = { contents: [{ parts: [{ text: prompt }] }] };

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        const data = await response.json();

        if (data.error) {
          if (data.error.code === 429 || data.error.message?.includes('quota')) {
            return reject(new Error('Límite de cuota alcanzado. Espera 20s y reintenta.'));
          }
          return reject(new Error(data.error.message));
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        resolve(resultText || 'No se recibió respuesta.');
      } catch (err) {
        reject(new Error('Error de conexión con la API.'));
      }
    });
  });
}

function buildPrompt(text: string, mode: string): string {
  const prompts: Record<string, string> = {
    humanize: 'Reescribe el texto para que suene 100% natural, fluido y orgánico en español cotidiano.',
    standard: 'Parafrasea el texto manteniendo equilibrio entre claridad y fluidez.',
    formal: 'Parafrasea el texto utilizando un tono corporativo, profesional y elegante.',
    academic: 'Parafrasea el texto usando vocabulario técnico y precisión conceptual.',
    simple: 'Parafrasea el texto con oraciones cortas y lenguaje muy accesible.',
    creative: 'Parafrasea el texto con un estilo expresivo, dinámico y original.'
  };

  const instruction = prompts[mode] || prompts['standard'];
  return `${instruction} Devuelve ÚNICAMENTE el texto resultante sin explicaciones adicionales:\n\n"${text}"`;
}