// src/services/groq/index.ts
// Punto de entrada publico del modulo de Groq.
// Re-exporta lo que otros archivos necesitan.

export { streamRewrite as streamGeminiTranslation } from './humanize';
export { correctWithQwen as correctTextWithQwen } from './grammar';