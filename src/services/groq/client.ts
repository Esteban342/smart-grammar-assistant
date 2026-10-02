// src/services/groq/client.ts
// Cliente base para llamar a la API de Groq con streaming SSE.

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
    for (const val of Object.values(allData)) {
      if (typeof val === 'string' && val.trim().startsWith('gsk_')) {
        return val.trim();
      }
    }
  }
  return '';
}

export interface StreamOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

// Ejecuta una llamada con streaming a la API de Groq.
// Devuelve el texto completo al final y va entregando chunks con onChunk.
export async function streamCompletion(
  options: StreamOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extension. Guarda tu API Key desde el popup.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt }
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Limite de cuota de Groq alcanzado. Espera unos segundos y reintenta.');
    }
    throw new Error(errorData.error?.message || `Error en la API de Groq (${response.status})`);
  }

  if (!response.body) {
    throw new Error('No se recibio flujo de datos desde la API de Groq.');
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
        // Fragmento parcial, se ignora
      }
    }
  }

  return fullText || '';
}