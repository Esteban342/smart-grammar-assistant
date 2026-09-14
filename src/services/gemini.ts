import { GoogleGenAI } from '@google/genai';

export async function processTextWithGemini(
  apiKey: string,
  text: string,
  mode: 'grammar' | 'humanize'
): Promise<string> {
  if (!apiKey) {
    throw new Error('No se ha proporcionado una API Key válida.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptGrammar = `Actúa como un corrector ortográfico y gramatical profesional. 
Corrige el siguiente texto manteniendo su sentido original y tono. Devuelve ÚNICAMENTE el texto corregido, sin introducciones ni explicaciones adicionales:

"${text}"`;

  const promptHumanize = `Actúa como un redactor experto. 
Reescribe el siguiente texto para que suene 100% natural, fluido y humano, evitando patrones típicos de texto generado por IA. Devuelve ÚNICAMENTE el texto reescrito:

"${text}"`;

  const prompt = mode === 'grammar' ? promptGrammar : promptHumanize;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return response.text || 'No se recibió respuesta del modelo.';
  } catch (error) {
    console.error('Error al conectar con Gemini API:', error);
    throw error;
  }
}