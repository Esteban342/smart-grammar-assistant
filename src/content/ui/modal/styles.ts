// src/content/ui/modal/styles.ts
// Inyecta todos los estilos del menu y el modal dentro del shadow root.
// Base: diseno Void (dark-first con acento indigo).
// Si la pagina usa tema claro, se anaden overrides de claro.

import { getOwnShadowRoot } from '../shadow';
import { detectTheme, getLightThemeOverrides } from './theme';

export const MENU_ID = 'smart-assistant-menu';
export const MODAL_ID = 'smart-assistant-modal';

const STYLES_ID = 'smart-assistant-styles-v3';

export function ensureStyles(): void {
  const root = getOwnShadowRoot();
  if (root.getElementById(STYLES_ID)) return;

  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    /* ============ MENU FLOTANTE ============ */
    #${MENU_ID} {
      position: fixed !important;
      z-index: 2147483647 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 30px !important;
      width: 30px !important;
      background: linear-gradient(135deg, #1F1D1B 0%, #141412 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 50% !important;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.24),
        0 2px 6px rgba(0, 0, 0, 0.28),
        0 8px 20px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif !important;
      transition:
        width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
        border-radius 0.3s cubic-bezier(0.16, 1, 0.3, 1),
        padding 0.3s cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 0.18s ease !important;
      overflow: hidden !important;
      user-select: none !important;
      color: #E8E6E2 !important;
      padding: 0 !important;
      pointer-events: auto !important;
    }
    #${MENU_ID}:hover {
      box-shadow:
        0 0 0 1px rgba(107, 94, 248, 0.35),
        0 4px 10px rgba(0, 0, 0, 0.32),
        0 16px 32px rgba(0, 0, 0, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    }
    #${MENU_ID}:active { transform: scale(0.95) !important; }
    #${MENU_ID}.sa-expanded {
      width: auto !important;
      border-radius: 15px !important;
      padding: 0 5px !important;
      cursor: default !important;
    }
    #${MENU_ID} .sa-trigger-icon {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
    }
    #${MENU_ID} .sa-trigger-icon svg {
      width: 14px !important;
      height: 14px !important;
      stroke: #A89DF8 !important;
      stroke-width: 1.5 !important;
      fill: none !important;
    }
    #${MENU_ID}.sa-expanded .sa-trigger-icon { display: none !important; }
    #${MENU_ID} .sa-actions {
      display: none !important;
      align-items: center !important;
      gap: 1px !important;
    }
    #${MENU_ID}.sa-expanded .sa-actions { display: flex !important; }
    #${MENU_ID} .sa-action {
      all: unset !important;
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      font-family: inherit !important;
      font-size: 11.5px !important;
      font-weight: 500 !important;
      letter-spacing: 0.1px !important;
      color: #8A8680 !important;
      white-space: nowrap !important;
      padding: 7px 10px !important;
      border-radius: 10px !important;
      cursor: pointer !important;
      transition: background 0.15s, color 0.15s !important;
    }
    #${MENU_ID} .sa-action svg {
      width: 13px !important;
      height: 13px !important;
      stroke: currentColor !important;
      stroke-width: 1.5 !important;
      fill: none !important;
      flex-shrink: 0 !important;
    }
    #${MENU_ID} .sa-action:hover {
      background: rgba(107, 94, 248, 0.18) !important;
      color: #A89DF8 !important;
    }
    #${MENU_ID} .sa-action.sa-humanize:hover { color: #C4B7FB !important; }
    #${MENU_ID} .sa-action:active { background: rgba(107, 94, 248, 0.10) !important; }
    #${MENU_ID} .sa-sep {
      width: 1px !important;
      height: 14px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      flex-shrink: 0 !important;
    }

    /* ============ MODAL ============ */
    #${MODAL_ID} {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 460px !important;
      max-width: 90vw !important;
      background: #141412 !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 20px !important;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.4),
        0 8px 20px rgba(0, 0, 0, 0.36),
        0 24px 64px rgba(0, 0, 0, 0.44),
        0 60px 100px rgba(0, 0, 0, 0.24) !important;
      overflow: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      opacity: 0 !important;
      transition: opacity 0.25s ease !important;
    }
    #${MODAL_ID}.sa-modal-visible { opacity: 1 !important; }

    #${MODAL_ID} .sa-modal-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 15px 18px 13px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      cursor: move !important;
      user-select: none !important;
    }
    #${MODAL_ID} .sa-modal-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: rgba(107, 94, 248, 0.14) !important;
      border: 1px solid rgba(107, 94, 248, 0.24) !important;
      border-radius: 999px !important;
      padding: 4px 10px !important;
    }
    #${MODAL_ID} .sa-modal-badge-dot {
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: #6B5EF8 !important;
      box-shadow: 0 0 6px rgba(107, 94, 248, 0.7) !important;
    }
    #${MODAL_ID} .sa-modal-title {
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      color: #8A8680 !important;
    }
    #${MODAL_ID} .sa-modal-close {
      all: unset !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 26px !important;
      height: 26px !important;
      border-radius: 7px !important;
      color: #5C5A56 !important;
      transition: background 0.12s, color 0.12s !important;
    }
    #${MODAL_ID} .sa-modal-close svg {
      width: 13px !important;
      height: 13px !important;
      stroke: currentColor !important;
      stroke-width: 1.5 !important;
      fill: none !important;
    }
    #${MODAL_ID} .sa-modal-close:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #E8E6E2 !important;
    }
    #${MODAL_ID} .sa-modal-close:focus-visible {
      outline: 2px solid #6B5EF8 !important;
      outline-offset: 2px !important;
    }

    #${MODAL_ID} .sa-modal-tabs {
      display: flex !important;
      gap: 2px !important;
      padding: 10px 14px 0 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      overflow-x: auto !important;
    }
    #${MODAL_ID} .sa-modal-tab {
      all: unset !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-size: 11.5px !important;
      font-weight: 500 !important;
      color: #5C5A56 !important;
      padding: 7px 11px !important;
      border-radius: 8px 8px 0 0 !important;
      white-space: nowrap !important;
      transition: background 0.13s, color 0.13s !important;
      position: relative !important;
    }
    #${MODAL_ID} .sa-modal-tab::after {
      content: '' !important;
      position: absolute !important;
      bottom: -1px !important;
      left: 0 !important;
      right: 0 !important;
      height: 2px !important;
      border-radius: 2px 2px 0 0 !important;
      background: transparent !important;
      transition: background 0.13s !important;
    }
    #${MODAL_ID} .sa-modal-tab:hover {
      background: rgba(255, 255, 255, 0.05) !important;
      color: #C4B7FB !important;
    }
    #${MODAL_ID} .sa-modal-tab.sa-active {
      color: #E8E6E2 !important;
      font-weight: 600 !important;
    }
    #${MODAL_ID} .sa-modal-tab.sa-active::after { background: #6B5EF8 !important; }
    #${MODAL_ID} .sa-modal-tab:focus-visible {
      outline: 2px solid #6B5EF8 !important;
      outline-offset: 2px !important;
    }

    #${MODAL_ID} .sa-modal-output {
      font-size: 13.5px !important;
      line-height: 1.72 !important;
      color: #C4C0BA !important;
      min-height: 110px !important;
      max-height: 190px !important;
      overflow-y: auto !important;
      padding: 18px 20px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    #${MODAL_ID} .sa-modal-output::-webkit-scrollbar { width: 4px !important; }
    #${MODAL_ID} .sa-modal-output::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12) !important;
      border-radius: 4px !important;
    }
    #${MODAL_ID} .sa-modal-output::-webkit-scrollbar-track { background: transparent !important; }

    #${MODAL_ID} .sa-modal-divider {
      height: 1px !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }

    #${MODAL_ID} .sa-grammar-area {
      padding: 13px 18px 4px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
    }
    #${MODAL_ID} .sa-grammar-header-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 10px !important;
    }
    #${MODAL_ID} .sa-grammar-counter {
      font-size: 11px !important;
      font-weight: 500 !important;
      color: #5C5A56 !important;
    }
    #${MODAL_ID} .sa-grammar-apply-all {
      all: unset !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #A89DF8 !important;
      padding: 5px 10px !important;
      border-radius: 7px !important;
      border: 1px solid rgba(107, 94, 248, 0.3) !important;
      transition: background 0.13s, border-color 0.13s, color 0.13s !important;
    }
    #${MODAL_ID} .sa-grammar-apply-all:hover {
      background: rgba(107, 94, 248, 0.12) !important;
      border-color: rgba(107, 94, 248, 0.5) !important;
      color: #C4B7FB !important;
    }
    #${MODAL_ID} .sa-grammar-suggestions {
      max-height: 148px !important;
      overflow-y: auto !important;
      padding-right: 2px !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 9px 11px !important;
      border-radius: 10px !important;
      margin-bottom: 5px !important;
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.07) !important;
      font-size: 12.5px !important;
      cursor: pointer !important;
      transition: background 0.12s, border-color 0.12s !important;
      user-select: none !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion:hover {
      background: rgba(107, 94, 248, 0.08) !important;
      border-color: rgba(107, 94, 248, 0.2) !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied {
      background: rgba(107, 94, 248, 0.06) !important;
      border-color: rgba(107, 94, 248, 0.22) !important;
    }
    #${MODAL_ID} .sa-sug-original {
      color: #E05C52 !important;
      text-decoration: line-through !important;
      font-weight: 500 !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied .sa-sug-original {
      color: #4A4845 !important;
      text-decoration: line-through !important;
    }
    #${MODAL_ID} .sa-sug-arrow { color: #4A4845 !important; font-size: 11px !important; }
    #${MODAL_ID} .sa-sug-replacement { color: #7EB8A4 !important; font-weight: 600 !important; }
    #${MODAL_ID} .sa-sug-check {
      margin-left: auto !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      opacity: 0 !important;
      transition: opacity 0.14s, background 0.14s !important;
    }
    #${MODAL_ID} .sa-sug-check svg {
      width: 9px !important;
      height: 9px !important;
      stroke: #7EB8A4 !important;
      stroke-width: 2 !important;
      fill: none !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied .sa-sug-check {
      background: rgba(126, 184, 164, 0.14) !important;
      opacity: 1 !important;
    }

    #${MODAL_ID} .sa-modal-actions {
      display: flex !important;
      gap: 7px !important;
      padding: 14px 18px 16px !important;
    }
    #${MODAL_ID} .sa-modal-btn {
      all: unset !important;
      flex: 1 !important;
      text-align: center !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      padding: 9px 14px !important;
      border-radius: 10px !important;
      background: rgba(255, 255, 255, 0.05) !important;
      color: #8A8680 !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      transition: background 0.13s, border-color 0.13s, color 0.13s !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
    }
    #${MODAL_ID} .sa-modal-btn svg {
      width: 13px !important;
      height: 13px !important;
      stroke: currentColor !important;
      stroke-width: 1.5 !important;
      fill: none !important;
      flex-shrink: 0 !important;
    }
    #${MODAL_ID} .sa-modal-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
      color: #E8E6E2 !important;
    }
    #${MODAL_ID} .sa-modal-btn:active { background: rgba(255, 255, 255, 0.04) !important; }
    #${MODAL_ID} .sa-modal-btn:focus-visible {
      outline: 2px solid #6B5EF8 !important;
      outline-offset: 2px !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary {
      background: #6B5EF8 !important;
      color: #FFFFFF !important;
      border-color: transparent !important;
      box-shadow: 0 0 0 1px rgba(107, 94, 248, 0.4), 0 4px 14px rgba(107, 94, 248, 0.36) !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary:hover {
      background: #7B6EF8 !important;
      box-shadow: 0 0 0 1px rgba(107, 94, 248, 0.5), 0 6px 20px rgba(107, 94, 248, 0.4) !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary:active { background: #5A4EE0 !important; }
  `;

  root.appendChild(style);

  // Si la pagina usa tema claro, anadimos los overrides.
  const lightStyleId = STYLES_ID + '-light';
  const existingLight = root.getElementById(lightStyleId);
  if (existingLight) existingLight.remove();

  if (detectTheme() === 'light') {
    const lightStyle = document.createElement('style');
    lightStyle.id = lightStyleId;
    lightStyle.textContent = getLightThemeOverrides(MENU_ID, MODAL_ID);
    root.appendChild(lightStyle);
  }
}