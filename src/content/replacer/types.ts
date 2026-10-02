// src/content/replacer/types.ts
// Tipos compartidos del modulo de reemplazo.

// Resultado de intentar reemplazar texto en una pagina.
//   inserted: se reemplazo automaticamente.
//   copied:   solo se pudo copiar al portapapeles (Docs sin debugger, etc).
export type ReplaceResult = 'inserted' | 'copied';