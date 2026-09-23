async function getApiKey(): Promise<string> {
  const extensionStorage = (globalThis as typeof globalThis & {
    chrome?: {
      storage?: {
        local?: {
          get: (keys: null | string[]) => Promise<Record<string, unknown>>;
        };
      };
    };
  }).chrome?.storage?.local;

  if (extensionStorage) {
    const allData = await extensionStorage.get(null);

    const directKey =
      allData.gemini_api_key ||
      allData.geminiApiKey ||
      allData.apiKey ||
      allData.key ||
      allData.geminiKey;

    if (typeof directKey === 'string' && directKey.trim() !== '') {
      return directKey.trim();
    }

    for (const val of Object.values(allData)) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('AIza') || trimmed.length > 20) {
          return trimmed;
        }
      }
    }
  }

  return (
    globalThis.localStorage?.getItem('gemini_api_key') ||
    globalThis.localStorage?.getItem('geminiApiKey') ||
    globalThis.localStorage?.getItem('apiKey') ||
    ''
  );
}

export function buildPrompt(text: string, mode: string): string {
  const instructions: Record<string, string> = {
    humanize: 'Reescribe el siguiente texto para que suene completamente natural, fluido y humano en español cotidiano. Conserva el significado original.',
    standard: 'Parafrasea el siguiente texto manteniendo equilibrio entre claridad y fluidez.',
    formal: 'Reescribe el siguiente texto utilizando un tono corporativo, profesional y elegante.',
    academic: 'Reescribe el siguiente texto usando vocabulario técnico y precisión conceptual.',
    simple: 'Reescribe el siguiente texto con oraciones cortas y lenguaje muy accesible.',
    creative: 'Reescribe el siguiente texto con un estilo expresivo, dinámico y original.'
  };

  const instruction = instructions[mode] || instructions.standard;

  return `${instruction}

REGLAS ESTRICTAS:
- Devuelve ÚNICAMENTE el texto reescrito.
- No añadas comillas, explicaciones, ni notas adicionales.
- No repitas la instrucción.

TEXTO ORIGINAL:
"""
${text}
"""`;
}

export async function streamGeminiTranslation(
  text: string,
  mode: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = buildPrompt(text, mode);

  if (!apiKey) {
    throw new Error('API Key no configurada en la extensión. Guarda tu API Key desde el popup.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?key=${apiKey}&alt=sse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429 || errorData.error?.message?.includes('quota')) {
      throw new Error('Límite de cuota alcanzado. Espera unos segundos y reintenta.');
    }
    throw new Error(errorData.error?.message || `Error en la API de Gemini (${response.status})`);
  }

  if (!response.body) {
    throw new Error('No se recibió flujo de datos desde la API.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunkText) {
            fullText += chunkText;
            onChunk(chunkText);
          }
        } catch {
          // Ignorar chunks parciales
        }
      }
    }
  }

  return fullText || 'No se recibió respuesta.';
}