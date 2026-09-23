export const SA_DEBUG = true;

function log(...args: unknown[]): void {
  if (SA_DEBUG) console.log('[SA:selection]', ...args);
}

type ShadowRootWithSelection = ShadowRoot & {
  getSelection?: () => Selection | null;
};

type SelectionWithComposedRanges = Selection & {
  getComposedRanges?: (options?: { shadowRoots?: ShadowRoot[] }) => StaticRange[];
};

type ChromeDomApi = {
  openOrClosedShadowRoot: (element: Element) => ShadowRoot | null;
};

function getChromeDomApi(): ChromeDomApi | null {
  const c = (globalThis as unknown as { chrome?: { dom?: ChromeDomApi } }).chrome;
  return c?.dom ?? null;
}

const MAX_SHADOW_DEPTH = 20;

export function getShadowRoot(el: Element): ShadowRoot | null {
  if (el.shadowRoot) return el.shadowRoot;
  try {
    const api = getChromeDomApi();
    if (!api) {
      log('chrome.dom no disponible en este contexto', el.tagName);
      return null;
    }
    const closed = api.openOrClosedShadowRoot(el);
    log('chrome.dom.openOrClosedShadowRoot(', el.tagName, ') ->', closed ? 'shadow root encontrada' : 'null');
    return closed ?? null;
  } catch (err) {
    log('openOrClosedShadowRoot error en', el.tagName, err);
    return null;
  }
}

export function resolveDeepTarget(
  x: number,
  y: number
): { element: Element | null; chain: ShadowRoot[] } {
  const chain: ShadowRoot[] = [];
  let scope: Document | ShadowRoot = document;
  let element: Element | null = scope.elementFromPoint(x, y);
  log('elementFromPoint inicial:', element?.tagName, element?.id || '(sin id)');

  for (let depth = 0; element && depth < MAX_SHADOW_DEPTH; depth++) {
    const root = getShadowRoot(element);
    if (!root) break;
    chain.push(root);
    const inner = root.elementFromPoint(x, y);
    log(`nivel ${depth}: dentro de shadow root de <${element.tagName.toLowerCase()}>, elementFromPoint interno ->`, inner?.tagName);
    if (!inner || inner === element) break;
    element = inner;
    scope = root;
  }

  log('cadena de shadow roots atravesados:', chain.length, '- elemento final:', element?.tagName);
  return { element, chain };
}

function staticRangeToText(range: StaticRange): string {
  try {
    const live = new Range();
    live.setStart(range.startContainer, range.startOffset);
    live.setEnd(range.endContainer, range.endOffset);
    return live.toString();
  } catch (err) {
    log('staticRangeToText falló:', err);
    return '';
  }
}

export function readSelectedText(chain: ShadowRoot[]): string {
  const topSelection = document.getSelection() as SelectionWithComposedRanges | null;

  const flat = topSelection?.toString() ?? '';
  log('estrategia 1 (document.getSelection plano) ->', JSON.stringify(flat.slice(0, 40)));
  if (flat.trim().length > 0) return flat;

  if (topSelection?.getComposedRanges && chain.length > 0) {
    try {
      const ranges = topSelection.getComposedRanges({ shadowRoots: chain }) ?? [];
      const composed = ranges.map(staticRangeToText).join('');
      log('estrategia 2 (getComposedRanges, ' + ranges.length + ' rango(s)) ->', JSON.stringify(composed.slice(0, 40)));
      if (composed.trim().length > 0) return composed;
    } catch (err) {
      log('estrategia 2 lanzó un error:', err);
    }
  }

  for (let i = chain.length - 1; i >= 0; i--) {
    const root = chain[i] as ShadowRootWithSelection;
    const inner = root.getSelection?.();
    const text = inner?.toString() ?? '';
    log(`estrategia 3 (ShadowRoot.getSelection en nivel ${i}) ->`, JSON.stringify(text.slice(0, 40)));
    if (text.trim().length > 0) return text;
  }

  log('las tres estrategias devolvieron vacío');
  return '';
}