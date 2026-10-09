// src/content/ui/modal/theme.ts
// Deteccion del tema de la pagina y overrides para el tema claro.
// Base del diseno: dark-first (Void). Override: light.

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
    const htmlScheme = getComputedStyle(document.documentElement).colorScheme || '';
    if (htmlScheme.includes('dark') && !htmlScheme.includes('light')) return 'dark';

    const bodyScheme = getComputedStyle(document.body).colorScheme || '';
    if (bodyScheme.includes('dark') && !bodyScheme.includes('light')) return 'dark';

    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

    const bodyLum = luminance(bodyBg);
    if (bodyLum !== null) return bodyLum < 0.4 ? 'dark' : 'light';

    const htmlLum = luminance(htmlBg);
    if (htmlLum !== null) return htmlLum < 0.4 ? 'dark' : 'light';

    const anyBg = findBgUpwards(document.body);
    const anyLum = luminance(anyBg);
    if (anyLum !== null) return anyLum < 0.4 ? 'dark' : 'light';

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';

    return 'light';
  } catch {
    return 'light';
  }
}

// Overrides para el tema claro. Se inyectan solo cuando la pagina es clara.
// El diseno base (Void) es oscuro, asi que el claro es el override.
export function getLightThemeOverrides(menuId: string, modalId: string): string {
  return `
    /* Menu flotante en paginas claras: Variante 2 "Cristal elevado" */
    #${menuId} {
      background: #FFFFFF !important;
      border: 1.5px solid #E0DBFF !important;
      color: #1A1917 !important;
      box-shadow:
        0 1px 0 rgba(107, 94, 248, 0.06),
        0 2px 6px rgba(0, 0, 0, 0.08),
        0 8px 20px rgba(0, 0, 0, 0.1),
        0 0 0 3px rgba(107, 94, 248, 0.08) !important;
    }
    /* Hover: borde, icono y halo en indigo (como el menu expandido) */
    #${menuId}:hover {
      border-color: #6B5EF8 !important;
      background: #FAFAFF !important;
      box-shadow:
        0 0 0 4px rgba(107, 94, 248, 0.15),
        0 4px 10px rgba(107, 94, 248, 0.25),
        0 12px 28px rgba(107, 94, 248, 0.18),
        0 0 0 3px rgba(107, 94, 248, 0.12) !important;
    }
    /* El icono del lapiz se intensifica en hover */
    #${menuId}:hover .sa-trigger-icon svg {
      stroke: #5A4EE0 !important;
    }
    #${menuId} .sa-trigger-icon svg { stroke: #6B5EF8 !important; }
    #${menuId} .sa-action { color: #7A7470 !important; }
    #${menuId} .sa-action:hover {
      background: rgba(107, 94, 248, 0.08) !important;
      color: #6B5EF8 !important;
    }
    #${menuId} .sa-action.sa-humanize:hover { color: #6B5EF8 !important; }
    #${menuId} .sa-action:active { background: rgba(107, 94, 248, 0.05) !important; }
    #${menuId} .sa-sep { background: rgba(0, 0, 0, 0.08) !important; }

    #${modalId} {
      background: #FAFAF9 !important;
      border-color: #E3DDD6 !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.12) !important;
    }
    #${modalId} .sa-modal-header,
    #${modalId} .sa-modal-tabs,
    #${modalId} .sa-grammar-area,
    #${modalId} .sa-modal-divider { border-color: #E3DDD6 !important; }
    #${modalId} .sa-modal-badge {
      background: rgba(107, 94, 248, 0.08) !important;
      border-color: rgba(107, 94, 248, 0.2) !important;
    }
    #${modalId} .sa-modal-title { color: #6B6157 !important; }
    #${modalId} .sa-modal-close { color: #9C9188 !important; }
    #${modalId} .sa-modal-close:hover {
      background: #EDE8E2 !important;
      color: #2C2826 !important;
    }
    #${modalId} .sa-modal-tab { color: #7A7470 !important; }
    #${modalId} .sa-modal-tab:hover {
      background: #F0EDE8 !important;
      color: #2C2826 !important;
    }
    #${modalId} .sa-modal-tab.sa-active { color: #2C2826 !important; }
    #${modalId} .sa-modal-output { color: #2C2826 !important; }
    #${modalId} .sa-grammar-counter { color: #7A7470 !important; }
    #${modalId} .sa-grammar-apply-all {
      color: #6B5EF8 !important;
      border-color: rgba(107, 94, 248, 0.25) !important;
    }
    #${modalId} .sa-grammar-apply-all:hover { background: rgba(107, 94, 248, 0.06) !important; }
    #${modalId} .sa-grammar-suggestion {
      background: #FAFAF9 !important;
      border-color: #E3DDD6 !important;
    }
    #${modalId} .sa-grammar-suggestion:hover {
      background: #F0EDE8 !important;
      border-color: #C8BCB0 !important;
    }
    #${modalId} .sa-grammar-suggestion.sa-applied {
      background: #F3F8F5 !important;
      border-color: #B4D6C4 !important;
    }
    #${modalId} .sa-modal-btn {
      background: #FAFAF9 !important;
      color: #4A4540 !important;
      border-color: #D6CFC8 !important;
    }
    #${modalId} .sa-modal-btn:hover { background: #F0EDE8 !important; color: #2C2826 !important; }
    #${modalId} .sa-modal-btn.sa-primary {
      background: #6B5EF8 !important;
      color: #FFFFFF !important;
      border-color: transparent !important;
    }
  `;
}