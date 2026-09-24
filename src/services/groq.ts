// src/services/groq.ts
// Cliente de Groq API (compatible con el formato OpenAI).
// Modelo: openai/gpt-oss-120b (120B parámetros, tier gratuito: 30 RPM / 1000 RPD).

async function getGroqApiKey(): Promise<string> {
  const storage = (globalThis as any).chrome?.storage?.local;
  if (storage) {
    const allData = await storage.get(null);
    const directKey =
      allData.groq_api_key ||
      allData.groqApiKey ||
      allData.groqKey;
    if (typeof directKey === 'string' && directKey.trim()) {
      return directKey.trim();
    }
    // Fallback heurístico: buscar cualquier string que empiece con gsk_
    for (const val of Object.values(allData)) {
      if (typeof val === 'string' && val.trim().startsWith('gsk_')) {
        return val.trim();
      }
    }
  }
  return '';
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
- No añadas comillas, explicaciones, ni notas.
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
  const apiKey = await getGroqApiKey();
  const prompt = buildPrompt(text, mode);

  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extensión. Guarda tu API Key desde el popup.');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'Eres un asistente experto en reescritura de textos en español. Devuelve únicamente el texto reescrito, sin explicaciones ni comentarios.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Límite de cuota de Groq alcanzado. Espera unos segundos y reintenta.');
    }
    throw new Error(errorData.error?.message || `Error en la API de Groq (${response.status})`);
  }

  if (!response.body) {
    throw new Error('No se recibió flujo de datos desde la API de Groq.');
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
      if (!trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, '');
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const chunkText = parsed.choices?.[0]?.delta?.content || '';
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }
      } catch {
        // Fragmento parcial, ignorar
      }
    }
  }

  return fullText || 'No se recibió respuesta.';
}