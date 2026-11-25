// src/services/groq/client.ts
// Cliente multi-proveedor compatible con OpenAI/SSE y salto automatico por prioridad.

import { PROVIDERS, getConfiguredProviders, type SavedProvider } from '../providers';

export interface StreamOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  signal?: AbortSignal;
}

// Cooldown en memoria: si un proveedor da 429, se pausa 60s
// para saltar directo al siguiente y volver a intentarlo despues.
const providerCooldowns: Record<string, number> = {};
const COOLDOWN_MS = 60_000;

function computeTimeoutMs(textLength: number): number {
  if (textLength < 500) return 15000;
  if (textLength < 1500) return 30000;
  return 60000;
}

function isProviderInCooldown(providerId: string): boolean {
  const until = providerCooldowns[providerId];
  if (!until) return false;
  if (Date.now() >= until) {
    delete providerCooldowns[providerId];
    return false;
  }
  return true;
}

async function streamWithProvider(
  provider: SavedProvider,
  options: StreamOptions,
  onChunk: (chunk: string) => void,
  timeoutMs: number
): Promise<string> {
  const meta = PROVIDERS[provider.id];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort());
  }

  const modelToUse = provider.model?.trim() || meta.defaultModel;

  const body: Record<string, unknown> = {
    model: modelToUse,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.65,
    max_tokens: options.maxTokens ?? 8192,
    stream: true,
  };

  // reasoning_effort solo aplica a Groq (Qwen)
  if (provider.id === 'groq' && options.reasoningEffort !== undefined) {
    body.reasoning_effort = options.reasoningEffort;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider.apiKey.trim()}`,
    'Content-Type': 'application/json',
  };

  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/Esteban342/smart-grammar-assistant';
    headers['X-Title'] = 'Smart Grammar Assistant';
  }

  let response: Response;
  try {
    response = await fetch(meta.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      if (options.signal?.aborted) throw err;
      throw new Error(`Tiempo de espera agotado con ${meta.name}.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Error HTTP ${response.status}`;

    if (response.status === 429) {
      providerCooldowns[provider.id] = Date.now() + COOLDOWN_MS;
    }

    const err: any = new Error(`[${meta.name}] ${message}`);
    err.__status = response.status;
    throw err;
  }

  if (!response.body) {
    throw new Error(`[${meta.name}] No se recibio flujo de datos.`);
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

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            const chunkText = parsed.choices?.[0]?.delta?.content || '';
            if (chunkText) {
              fullText += chunkText;
              onChunk(chunkText);
            }
          } catch {
            // Ignorar si el ultimo trozo no es JSON valido
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      if (options.signal?.aborted) throw err;
      throw new Error(`La conexion con ${meta.name} excedio el tiempo de espera.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  return fullText || '';
}

export async function streamCompletion(
  options: StreamOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const providers = await getConfiguredProviders();
  if (providers.length === 0) {
    throw new Error('API Key no configurada en la extension. Abre el popup y agrega al menos una API Key.');
  }

  const timeoutMs = computeTimeoutMs(options.userPrompt.length);

  // Ordenar: primero los que no estan en cooldown, luego los que si (por si todos estan en cooldown)
  const ready = providers.filter((p) => !isProviderInCooldown(p.id));
  const cooling = providers.filter((p) => isProviderInCooldown(p.id));
  const queue = [...ready, ...cooling];

  let lastError: Error | null = null;

  for (const provider of queue) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await streamWithProvider(provider, options, onChunk, timeoutMs);
    } catch (err: any) {
      if (err?.name === 'AbortError' && options.signal?.aborted) {
        throw err;
      }
      lastError = err;
      console.warn(`[SA:client] Fallo ${provider.id}, intentando siguiente proveedor:`, err?.message);
    }
  }

  throw lastError || new Error('Todos los proveedores de IA fallaron. Verifica tus API Keys.');
}