// src/content/ui/modal/theme.ts
// Deteccion del tema de la pagina y devolucion de overrides CSS.

export type Theme = 'light' | 'dark';

function parseRgb(color: string): [number, number, number, number?] | null {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return null;
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  const a = match[4] !== undefined ? parseFloat(match[4]) : undefined;
  return a !== undefined ? [r, g, b, a] : [r, g, b];
}

function luminance(color: string): number | null {
  const rgb = parseRgb(color);
  if (!rgb) return null;
  const [r, g, b, a] = rgb;
  if (a !== undefined && a < 0.5) return null;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Busca el primer ancestro (o el propio) con un fondo visible.
function findBgUpwards(el: Element | null): string {
  let current: Element | null = el;
  let depth = 0;
  while (current && depth < 5) {
    const bg = getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    current = current.parentElement;
    depth++;
  }
  return '';
}

export function detectTheme(): Theme {
  try {
    // 1. color-scheme declarado por la pagina (YouTube, X, etc. lo usan).
    const htmlScheme = getComputedStyle(document.documentElement).colorScheme || '';
    if (htmlScheme.includes('dark') && !htmlScheme.includes('light')) return 'dark';

    const bodyScheme = getComputedStyle(document.body).colorScheme || '';
    if (bodyScheme.includes('dark') && !bodyScheme.includes('light')) return 'dark';

    // 2. Fondo visible en body, html o algun ancestro cercano.
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

    const bodyLum = luminance(bodyBg);
    if (bodyLum !== null) return bodyLum < 0.4 ? 'dark' : 'light';

    const htmlLum = luminance(htmlBg);
    if (htmlLum !== null) return htmlLum < 0.4 ? 'dark' : 'light';

    // 3. Buscar fondo en ancestros (para youtbe y similares).
    const anyBg = findBgUpwards(document.body);
    const anyLum = luminance(anyBg);
    if (anyLum !== null) return anyLum < 0.4 ? 'dark' : 'light';

    // 4. Respaldo final: media query del sistema operativo.
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';

    return 'light';
  } catch {
    return 'light';
  }
}

export function getDarkThemeOverrides(menuId: string, modalId: string): string {
  return `
    #${menuId} {
      background: #1A2436 !important;
      color: #E2E8F0 !important;
      border: 1px solid #2D3A52 !important;
    }
    #${menuId} .sa-trigger-icon {
      color: #E2E8F0 !important;
    }
    #${menuId} .sa-action {
      color: #94A3B8 !important;
    }
    #${menuId} .sa-action:hover {
      background: rgba(226, 232, 240, 0.1) !important;
      color: #E2E8F0 !important;
    }
    #${modalId} {
      background: #1A2436 !important;
      border-color: #2D3A52 !important;
    }
    #${modalId} .sa-modal-title {
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-modal-close {
      color: #64748B !important;
    }
    #${modalId} .sa-modal-close:hover {
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-modal-tabs {
      border-bottom-color: #2D3A52 !important;
    }
    #${modalId} .sa-modal-tab {
      color: #94A3B8 !important;
    }
    #${modalId} .sa-modal-tab:hover {
      background: #2D3A52 !important;
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-modal-tab.sa-active {
      background: #E2E8F0 !important;
      color: #0F1E35 !important;
    }
    #${modalId} .sa-modal-output {
      background: #0F1E35 !important;
      border-color: #2D3A52 !important;
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-grammar-counter {
      color: #94A3B8 !important;
    }
    #${modalId} .sa-grammar-apply-all {
      border-color: #2D3A52 !important;
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-grammar-apply-all:hover {
      background: #2D3A52 !important;
      border-color: #E2E8F0 !important;
    }
    #${modalId} .sa-grammar-suggestion {
      background: #0F1E35 !important;
      border-color: #2D3A52 !important;
    }
    #${modalId} .sa-grammar-suggestion:hover {
      background: #2D3A52 !important;
    }
    #${modalId} .sa-grammar-suggestion.sa-applied {
      background: #142E24 !important;
      border-color: #1F4E3E !important;
    }
    #${modalId} .sa-modal-btn {
      background: #0F1E35 !important;
      color: #E2E8F0 !important;
      border-color: #2D3A52 !important;
    }
    #${modalId} .sa-modal-btn:hover {
      background: #2D3A52 !important;
      color: #E2E8F0 !important;
    }
    #${modalId} .sa-modal-btn.sa-primary {
      background: #E2E8F0 !important;
      color: #0F1E35 !important;
      border: none !important;
    }
    #${modalId} .sa-modal-btn.sa-primary:hover {
      background: #FFFFFF !important;
    }
  `;
}