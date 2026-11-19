// src/services/groq/grammar.ts
// Funcion para corregir ortografia y gramatica con Qwen.

import { streamCompletion } from './client';
import { GRAMMAR_SYSTEM_PROMPT } from './prompts';
import { getCachedResult, setCachedResult } from '../cache';

const GRAMMAR_MODEL = 'qwen/qwen3.8-27b';

export async function correctWithQwen(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  skipCache = false
): Promise<string> {
  // 1. Intentar leer del cache
  if (!skipCache) {
    const cached = await getCachedResult(text, 'grammar');
    if (cached) {
      onChunk(cached);
      return cached;
    }
  }

  // 2. Llamar a la API
  const result = await streamCompletion(
    {
      model: GRAMMAR_MODEL,
      systemPrompt: GRAMMAR_SYSTEM_PROMPT,
      userPrompt: text,
      temperature: 0,
      maxTokens: 8192,
      reasoningEffort: 'none',
      signal: signal
    },
    onChunk
  );

  const finalResult = result.trim() || text;

  // 3. Guardar en cache sin bloquear
  if (finalResult) {
    void setCachedResult(text, 'grammar', finalResult);
  }

  return finalResult;
}