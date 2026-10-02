// src/content/docs-canvas/validators.ts
// Detecta si un texto capturado del portapapeles parece un ID
// interno de Docs en lugar de contenido real del usuario.

export function looksLikeDocsInternalId(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  if (trimmed.startsWith('AQ.')) return true;

  if (
    trimmed.length > 15 &&
    trimmed.length < 200 &&
    !trimmed.includes(' ') &&
    !trimmed.includes('\n') &&
    /^[A-Za-z0-9._\-+/=]+$/.test(trimmed)
  ) {
    return true;
  }

  return false;
}