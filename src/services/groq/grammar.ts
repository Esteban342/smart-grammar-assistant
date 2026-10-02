// src/services/groq/grammar.ts
// Funcion para corregir ortografia y gramatica con Qwen.

import { streamCompletion } from './client';
import { GRAMMAR_SYSTEM_PROMPT } from './prompts';

const GRAMMAR_MODEL = 'qwen/qwen3.8-27b';

// Corrige el texto con Qwen y devuelve el resultado completo.
export async function correctWithQwen(
  text: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const result = await streamCompletion(
    {
      model: GRAMMAR_MODEL,
      systemPrompt: GRAMMAR_SYSTEM_PROMPT,
      userPrompt: text,
      temperature: 0,
      maxTokens: 2048
    },
    onChunk
  );

  return result.trim() || text;
}