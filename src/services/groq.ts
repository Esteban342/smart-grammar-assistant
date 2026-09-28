// src/services/groq.ts
// Cliente de Groq API con formato compatible con OpenAI.
// Modelos usados:
//   - openai/gpt-oss-120b para humanizar y parafrasear
//   - qwen/qwen3.8-27b para correccion gramatical

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

export function buildPrompt(text: string, mode: string): string {
  const instructions: Record<string, string> = {
    humanize: 'Reescribe el siguiente texto para que suene completamente natural, fluido y humano en español cotidiano. Conserva el significado original.',
    standard: 'Parafrasea el siguiente texto manteniendo equilibrio entre claridad y fluidez.',
    formal: 'Reescribe el siguiente texto utilizando un tono corporativo, profesional y elegante.',
    academic: 'Reescribe el siguiente texto usando vocabulario tecnico y precision conceptual.',
    simple: 'Reescribe el siguiente texto con oraciones cortas y lenguaje muy accesible.',
    creative: 'Reescribe el siguiente texto con un estilo expresivo, dinamico y original.'
  };
  const instruction = instructions[mode] || instructions.standard;
  return `${instruction}

REGLAS ESTRICTAS:
- Devuelve unicamente el texto reescrito.
- No añadas comillas, explicaciones, ni notas.
- No repitas la instruccion.

TEXTO ORIGINAL:
"""
${text}
"""`;
}

// Llamada con streaming. Se usa para humanizar y parafrasear.
export async function streamGeminiTranslation(
  text: string,
  mode: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = await getGroqApiKey();
  const prompt = buildPrompt(text, mode);

  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extension. Guarda tu API Key desde el popup.');
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
        { role: 'system', content: 'Eres un asistente experto en reescritura de textos en español. Devuelve unicamente el texto reescrito, sin explicaciones ni comentarios.' },
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

  return fullText || 'No se recibio respuesta.';
}

// Estructura de una correccion individual.
export interface GroqCorrection {
  from: string;
  to: string;
}

// ------------------------------------------------------------
// PASO 1 del modo grammar: corregir el texto puro con Qwen.
// Prompt corto y temperature 0 para maxima precision.
// ------------------------------------------------------------
export async function correctTextWithQwen(
  text: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extension. Guarda tu API Key desde el popup.');
  }

  const systemPrompt = `Corrige este texto. Reglas:
- Los participios en -ado/-ido NUNCA llevan tilde. Ejemplo: "he estado" (no "he estádo").
- El verbo estar SI lleva tilde: "está", "estás", "estén".
- Añade signos ¿? en preguntas.
- Añade punto y seguido entre oraciones pegadas.
- Mayúscula al inicio de cada oración.
Devuelve solo el texto corregido, sin explicaciones.`;

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0,
      max_tokens: 2048,
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

  return fullText.trim() || text;
}

// ------------------------------------------------------------
// PASO 2 del modo grammar: comparar original vs corregido
// y devolver la lista de cambios individuales.
// ------------------------------------------------------------
export async function diffTextChanges(
  original: string,
  corrected: string
): Promise<GroqCorrection[]> {
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extension. Guarda tu API Key desde el popup.');
  }

  const systemPrompt = `Comparas dos versiones de un texto y devuelves la lista de cambios individuales.

Debes devolver EXACTAMENTE un objeto JSON con esta estructura, sin nada antes ni despues:
{
  "corrections": [
    { "from": "fragmento original corto", "to": "fragmento corregido" }
  ]
}

Reglas:
- Cada "from" debe ser corto (1-3 palabras) y existir LITERALMENTE en el texto original.
- El "to" debe ser la version corregida de ese fragmento, tal como aparece en el texto corregido.
- Solo incluye cambios reales. Si un fragmento es igual, no lo incluyas.
- Si no hay cambios, devuelve { "corrections": [] }.
- No inventes cambios que no se vean en el texto corregido.
- El JSON debe ser valido y parseable.`;

  const userMessage = `Texto original:
"""
${original}
"""

Texto corregido:
"""
${corrected}
"""

Devuelve el JSON con la lista de cambios.`;

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Limite de cuota de Groq alcanzado. Espera unos segundos y reintenta.');
    }
    throw new Error(errorData.error?.message || `Error en la API de Groq (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extraer el JSON si viene envuelto en texto
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('[groq] respuesta no contiene JSON:', content);
      return [];
    }
    const jsonSlice = content.slice(firstBrace, lastBrace + 1);
    try {
      parsed = JSON.parse(jsonSlice);
    } catch {
      console.error('[groq] JSON invalido:', jsonSlice);
      return [];
    }
  }

  const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
  const seen = new Set<string>();
  const corrections: GroqCorrection[] = [];
  for (const c of rawCorrections) {
    if (!c || typeof c.from !== 'string' || typeof c.to !== 'string') continue;
    if (c.from === c.to) continue;
    const key = c.from + '||' + c.to;
    if (seen.has(key)) continue;
    seen.add(key);
    corrections.push({ from: c.from, to: c.to });
  }

  return corrections;
}