// src/services/groq/prompts.ts

export type RewriteMode = 'humanize' | 'standard' | 'formal' | 'academic' | 'simple' | 'creative';

export const REWRITE_SYSTEM_PROMPT =
`Eres una herramienta de reformulacion de texto. Tu trabajo es cambiar como se dice algo, no mejorar lo que dice.

IDIOMA: Responde en el mismo idioma del original.

PERSONA: Copia exactamente la persona gramatical. Si el original tiene "yo/me/mi", el resultado tambien. Si no los tiene, no los uses.

VERBOS: No sustituyas verbos. Si el original dice "pase", el resultado dice "pase" o un sinonimo directo. No cambies "pase" por "converti", "traslade" ni "traduje".

TIEMPO: Manten el tiempo verbal de cada frase sin excepcion. Pasado -> pasado. Presente -> presente.

NOMBRES: Copia exactamente nombres propios, fechas y cifras.

FIDELIDAD: Reformula solo lo que esta escrito. No añadas, no interpretes, no resumas. Extension similar al original.

VOCABULARIO: Sustituye: "asimismo"->"tambien"; "constituyo"->"fue"; "en definitiva"->"al final"; "resulta fundamental"->"es clave"; "cabe destacar"-> di directamente lo que destacas.

RITMO: Alterna frases cortas (5-10 palabras) con largas (20-30). Maximo dos frases cortas seguidas.

Devuelve solo el texto reformulado. Sin comillas.`;

const REWRITE_INSTRUCTIONS: Record<RewriteMode, string> = {

  // Instruccion que describe el estado final en vez de la operacion.
  // Evita que el modelo interprete "mejora legibilidad" como "cortar frases".
  humanize:
    'Reescribe de forma que suene como prosa escrita por una persona, ' +
    'no como una lista de hechos. ' +
    'La estructura de parrafos del original se respeta: ' +
    'si es un parrafo, el resultado es un parrafo. ' +
    'Las ideas que el original conecta en una sola frase larga ' +
    'permanecen en una sola frase, no las separes. ' +
    'Cambia el vocabulario y el orden de las palabras, ' +
    'pero no la arquitectura del texto.',

  standard:
    'Reformula cambiando la estructura de las frases. Manten el significado exacto.',

  formal:
    'Reformula con tono profesional y preciso. Sin relleno retorico.',

  academic:
    'Reformula con rigor conceptual. Vocabulario tecnico solo donde aporte precision real.',

  simple:
    'Reformula para cualquier lector. Frases cortas. Palabras cotidianas.',

  creative:
    'Reformula con personalidad y ritmo propio. Puedes cambiar el orden de las ideas.',
};

const MODE_TEMPERATURES: Record<string, number> = {
  humanize:  0.70,
  standard:  0.60,
  formal:    0.50,
  academic:  0.50,
  simple:    0.60,
  creative:  0.80,
};

export function getTemperatureForMode(mode: string): number {
  return MODE_TEMPERATURES[mode] ?? 0.60;
}

export function buildRewritePrompt(text: string, mode: string): string {
  const instruction =
    REWRITE_INSTRUCTIONS[mode as RewriteMode] || REWRITE_INSTRUCTIONS.standard;
  return `${instruction}

"""
${text}
"""`;
}

export const GRAMMAR_SYSTEM_PROMPT = `Eres un corrector profesional. Detecta el idioma del texto original y responde SIEMPRE en ese mismo idioma.

Reglas generales:
- Corrige ortografia, gramatica y puntuacion segun las reglas del idioma del texto.
- Anade signos de interrogacion cuando correspondan.
- Anade punto y seguido entre oraciones pegadas.
- Mayuscula al inicio de cada oracion.
- No cambies el significado ni el registro del texto.

Reglas especificas del espanol (aplicar solo si el texto esta en espanol):
- Los participios en -ado/-ido NUNCA llevan tilde. Ejemplo: "he estado" (no "he estado").
- El verbo estar SI lleva tilde: "esta", "estas", "esten".

Devuelve solo el texto corregido, sin explicaciones.`;