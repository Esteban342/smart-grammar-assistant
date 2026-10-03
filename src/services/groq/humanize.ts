// src/services/groq/humanize.ts
// Funciones para humanizar y parafrasear texto.

import { streamCompletion } from './client';
import { buildRewritePrompt, REWRITE_SYSTEM_PROMPT } from './prompts';
import { getCachedResult, setCachedResult } from '../cache';

const REWRITE_MODEL = 'openai/gpt-oss-120b';

export async function streamRewrite(
  text: string,
  mode: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  // 1. Intentar leer del cache
  const cached = await getCachedResult(text, mode);
  if (cached) {
    onChunk(cached);
    return cached;
  }

  // 2. Llamar a la API
  const prompt = buildRewritePrompt(text, mode);

  const result = await streamCompletion(
    {
      model: REWRITE_MODEL,
      systemPrompt: REWRITE_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 2048
    },
    onChunk
  );

  // 3. Guardar en cache sin bloquear
  if (result) {
    void setCachedResult(text, mode, result);
  }

  return result;
}