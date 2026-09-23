const HOST_ID = 'smart-assistant-root';

let hostElement: HTMLDivElement | null = null;
let shadowRootRef: ShadowRoot | null = null;

export function ensureShadowHost(): ShadowRoot {
  if (shadowRootRef) return shadowRootRef;

  const existing = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (existing?.shadowRoot) {
    hostElement = existing;
    shadowRootRef = existing.shadowRoot;
    return shadowRootRef;
  }

  hostElement = document.createElement('div');
  hostElement.id = HOST_ID;
  Object.assign(hostElement.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  shadowRootRef = hostElement.attachShadow({ mode: 'open' });
  (document.body ?? document.documentElement).appendChild(hostElement);

  return shadowRootRef;
}

export function getOwnShadowRoot(): ShadowRoot {
  return ensureShadowHost();
}

export function getHostElement(): HTMLElement | null {
  return hostElement;
}

export function isEventFromOurUI(event: Event): boolean {
  const path = event.composedPath();
  for (const node of path) {
    if (node instanceof HTMLElement) {
      if (
        node.id === 'smart-assistant-root' ||
        node.id === 'smart-assistant-menu' ||
        node.id === 'smart-assistant-modal'
      ) {
        return true;
      }
    }
  }
  const host = document.getElementById('smart-assistant-root');
  return !!host && path.includes(host);
}