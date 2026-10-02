// src/services/groq/prompts.ts
// Todos los prompts que se envian a la API de Groq.

export type RewriteMode = 'humanize' | 'standard' | 'formal' | 'academic' | 'simple' | 'creative';

const REWRITE_INSTRUCTIONS: Record<RewriteMode, string> = {
  humanize: 'Reescribe el siguiente texto para que suene completamente natural, fluido y humano en español cotidiano. Conserva el significado original.',
  standard: 'Parafrasea el siguiente texto manteniendo equilibrio entre claridad y fluidez.',
  formal: 'Reescribe el siguiente texto utilizando un tono corporativo, profesional y elegante.',
  academic: 'Reescribe el siguiente texto usando vocabulario técnico y precisión conceptual.',
  simple: 'Reescribe el siguiente texto con oraciones cortas y lenguaje muy accesible.',
  creative: 'Reescribe el siguiente texto con un estilo expresivo, dinámico y original.'
};

// Prompt para humanizar o parafrasear.
export function buildRewritePrompt(text: string, mode: string): string {
  const instruction = REWRITE_INSTRUCTIONS[mode as RewriteMode] || REWRITE_INSTRUCTIONS.standard;
  return `${instruction}

REGLAS ESTRICTAS:
- Devuelve únicamente el texto reescrito.
- No añadas comillas, explicaciones, ni notas.
- No repitas la instrucción.

TEXTO ORIGINAL:
"""
${text}
"""`;
}

// System prompt para reescritura (humanizar, parafrasear).
export const REWRITE_SYSTEM_PROMPT =
  'Eres un asistente experto en reescritura de textos en español. Devuelve únicamente el texto reescrito, sin explicaciones ni comentarios.';

// System prompt para corrección gramatical.
export const GRAMMAR_SYSTEM_PROMPT = `Corrige este texto. Reglas:
- Los participios en -ado/-ido NUNCA llevan tilde. Ejemplo: "he estado" (no "he estádo").
- El verbo estar SI lleva tilde: "está", "estás", "estén".
- Añade signos de interrogación cuando correspondan.
- Añade punto y seguido entre oraciones pegadas.
- Mayúscula al inicio de cada oración.
Devuelve solo el texto corregido, sin explicaciones.`;