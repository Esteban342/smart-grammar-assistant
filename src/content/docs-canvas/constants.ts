// src/content/docs-canvas/constants.ts
// Constantes relacionadas con Google Docs.

export const IS_GOOGLE_DOCS = location.hostname === 'docs.google.com';

export const DOCS_IFRAME_SELECTOR = 'iframe.docs-texteventtarget-iframe';

export const DOCS_SELECTION_OVERLAY_SELECTORS = [
  '.kix-selection-overlay',
  '.kix-selection-overlay-element',
  '.kix-selection-overlay-outline',
  '.docs-text-ui-cursor-selection',
].join(', ');