// src/services/groq/client.ts
// Cliente base para llamar a la API de Groq con streaming SSE.
// Incluye reintentos automaticos y timeout dinamico segun longitud del texto.

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

// Informacion extraida del error para decidir si reintentar.
interface ErrorInfo {
  isRateLimit: boolean;
  isDailyLimit: boolean;
  retryDelaySeconds: number | null;
  message: string;
}

const MAX_RETRIES = 2;
const FALLBACK_BACKOFF_SECONDS = [2, 4];

// Calcula el timeout en milisegundos segun la longitud del texto.
// Textos cortos no necesitan esperar 60 segundos.
function computeTimeoutMs(textLength: number): number {
  if (textLength < 500) return 15000;
  if (textLength < 1500) return 30000;
  return 60000;
}

// Clasifica el error de la respuesta para saber si vale la pena reintentar.
function classifyError(response: Response, errorBody: any): ErrorInfo {
  const isRateLimit = response.status === 429;
  const message = errorBody?.error?.message || `Error HTTP ${response.status}`;
  const lower = message.toLowerCase();

  // Groq distingue limites diarios de los por minuto con estas palabras.
  const isDailyLimit = isRateLimit && (
    lower.includes('per day') ||
    lower.includes('daily')
  );

  // Algunos errores incluyen el header retry-after con los segundos de espera.
  let retryDelaySeconds: number | null = null;
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const parsed = parseFloat(retryAfter);
    if (!Number.isNaN(parsed)) retryDelaySeconds = parsed;
  }

  return { isRateLimit, isDailyLimit, retryDelaySeconds, message };
}

// Realiza una sola llamada con streaming. Si excede el timeout, aborta.
async function streamOnce(
  options: StreamOptions,
  onChunk: (chunk: string) => void,
  timeoutMs: number
): Promise<string> {
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    throw new Error('API Key de Groq no configurada en la extension. Guarda tu API Key desde el popup.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      }),
      signal: controller.signal
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('La conexion con Groq excedio el tiempo de espera. Intenta de nuevo.');
    }
    throw err;
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    const errorBody = await response.json().catch(() => ({}));
    const info = classifyError(response, errorBody);
    const error: any = new Error(info.message);
    error.__groqInfo = info;
    throw error;
  }

  if (!response.body) {
    clearTimeout(timeoutId);
    throw new Error('No se recibio flujo de datos desde la API de Groq.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  try {
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
  } finally {
    clearTimeout(timeoutId);
  }

  return fullText || '';
}

// Ejecuta una llamada con streaming. Si Groq devuelve un error de
// rate limit temporal, reintenta con espera progresiva.
export async function streamCompletion(
  options: StreamOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const timeoutMs = computeTimeoutMs(options.userPrompt.length);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await streamOnce(options, onChunk, timeoutMs);
    } catch (err: any) {
      lastError = err;

      const info: ErrorInfo | undefined = err.__groqInfo;
      if (!info || !info.isRateLimit) {
        throw err;
      }

      // Si es limite diario, esperar no sirve. Se libera al dia siguiente.
      if (info.isDailyLimit) {
        throw new Error('Limite diario de Groq alcanzado. Vuelve a intentarlo mañana o usa otra API Key.');
      }

      // Si ya no quedan reintentos, lanzar el error original.
      if (attempt === MAX_RETRIES) {
        throw new Error('Limite de cuota temporal alcanzado. Espera un minuto y vuelve a intentarlo.');
      }

      const delaySeconds = info.retryDelaySeconds ?? FALLBACK_BACKOFF_SECONDS[attempt] ?? 8;
      await new Promise((r) => setTimeout(r, delaySeconds * 1000));
    }
  }

  throw lastError || new Error('Error desconocido al llamar a Groq.');
}