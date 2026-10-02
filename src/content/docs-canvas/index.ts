// src/content/docs-canvas/index.ts
// Punto de entrada publico del modulo de Google Docs.
// Re-exporta lo que otros archivos necesitan.

export { IS_GOOGLE_DOCS } from './constants';
export {
  initDocsClipboardBridge,
  getLastDocsClipboardText,
  forceCaptureSelectionViaCopy,
} from './clipboard';
export { getDocsSelectionRect } from './selection-rect';
export { looksLikeDocsInternalId } from './validators';