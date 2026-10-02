// src/services/groq/humanize.ts
// Funciones para humanizar y parafrasear texto.

import { streamCompletion } from './client';
import { buildRewritePrompt, REWRITE_SYSTEM_PROMPT } from './prompts';

const REWRITE_MODEL = 'openai/gpt-oss-120b';

// Reescribe el texto segun el modo indicado.
// Usa streaming y entrega cada fragmento con onChunk.
export async function streamRewrite(
  text: string,
  mode: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const prompt = buildRewritePrompt(text, mode);

  return streamCompletion(
    {
      model: REWRITE_MODEL,
      systemPrompt: REWRITE_SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 2048
    },
    onChunk
  );
}