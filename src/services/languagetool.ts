// src/services/languagetool.ts

export interface GrammarError {
  message: string;
  original: string;
  replacement: string;
}

export interface CorrectionResult {
  correctedText: string;
  errors: GrammarError[];
}

/**
 * Corrige el texto usando LanguageTool (motor de gramática open source).
 * No necesita API Key. Devuelve el texto corregido y la lista de cambios.
 */
export async function correctTextWithLanguageTool(text: string): Promise<CorrectionResult> {
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('language', 'es');
  // ✅ CLAVE: activar reglas avanzadas y de puntuación
  params.append('level', 'picky');
  params.append('motherTongue', 'es');
  params.append('enabledCategories', 'PUNCTUATION,TYPOGRAPHY,GRAMMAR,CASING,CONFUSED_WORDS');

  const response = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`LanguageTool error (${response.status})`);
  }

  const data = await response.json();
  const matches: any[] = data.matches || [];

  console.log('[SA:languagetool] Errores detectados:', matches.length);

  // Aplicar cambios de atrás hacia adelante para no alterar offsets
  let correctedText = text;
  const errors: GrammarError[] = [];

  const sortedMatches = [...matches].sort((a, b) => b.offset - a.offset);

  for (const match of sortedMatches) {
    if (!match.replacements || match.replacements.length === 0) continue;

    const original = text.slice(match.offset, match.offset + match.length);
    const replacement = match.replacements[0].value;

    if (original === replacement) continue;

    errors.push({
      message: match.message,
      original,
      replacement
    });

    correctedText =
      correctedText.slice(0, match.offset) +
      replacement +
      correctedText.slice(match.offset + match.length);
  }

  // Invertir para mostrar en orden del texto original
  errors.reverse();

  console.log('[SA:languagetool] Cambios aplicados:', errors.length);

  return {
    correctedText,
    errors
  };
}