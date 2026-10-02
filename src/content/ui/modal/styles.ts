// src/content/ui/modal/styles.ts
// Inyeccion de todos los estilos del menu y el modal dentro del shadow root.

import { getOwnShadowRoot } from '../shadow';

export const MENU_ID = 'smart-assistant-menu';
export const MODAL_ID = 'smart-assistant-modal';

const STYLES_ID = 'smart-assistant-styles-v2';

export function ensureStyles(): void {
  const root = getOwnShadowRoot();
  if (root.getElementById(STYLES_ID)) return;

  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    #${MENU_ID} {
      position: fixed !important;
      z-index: 2147483647 !important;
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      border-radius: 50% !important;
      border: none !important;
      box-shadow: 0 2px 6px rgba(15, 30, 53, 0.28) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 24px !important;
      width: 24px !important;
      padding: 0 !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  border-radius 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  padding 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      user-select: none !important;
    }
    #${MENU_ID}.sa-expanded {
      width: auto !important;
      border-radius: 12px !important;
      padding: 0 3px !important;
      cursor: default !important;
    }
    #${MENU_ID} .sa-trigger-icon {
      font-size: 11px !important;
      line-height: 1 !important;
      color: #FFFFFF !important;
      display: block !important;
    }
    #${MENU_ID}.sa-expanded .sa-trigger-icon { display: none !important; }
    #${MENU_ID} .sa-actions { display: none !important; gap: 2px !important; }
    #${MENU_ID}.sa-expanded .sa-actions { display: flex !important; }
    #${MENU_ID} .sa-action {
      background: transparent !important;
      color: #E2E8F0 !important;
      border: none !important;
      padding: 5px 11px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      font-family: inherit !important;
      cursor: pointer !important;
      border-radius: 10px !important;
      white-space: nowrap !important;
      transition: background 0.15s, color 0.15s !important;
      letter-spacing: 0.1px !important;
    }
    #${MENU_ID} .sa-action:hover {
      background: rgba(255, 255, 255, 0.12) !important;
      color: #FFFFFF !important;
    }
    #${MODAL_ID} {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 460px !important;
      max-width: 90vw !important;
      background: #F8FAFC !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 18px !important;
      box-shadow: 0 16px 48px rgba(15, 30, 53, 0.18) !important;
      padding: 22px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
      opacity: 0 !important;
      transition: opacity 0.25s ease !important;
    }
    #${MODAL_ID}.sa-modal-visible { opacity: 1 !important; }
    #${MODAL_ID} .sa-modal-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 16px !important;
      cursor: move !important;
      user-select: none !important;
    }
    #${MODAL_ID} .sa-modal-title {
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.8px !important;
      text-transform: uppercase !important;
      color: #0F1E35 !important;
    }
    #${MODAL_ID} .sa-modal-close {
      background: none !important;
      border: none !important;
      font-size: 16px !important;
      color: #94A3B8 !important;
      cursor: pointer !important;
      padding: 2px 4px !important;
      line-height: 1 !important;
      font-family: inherit !important;
      opacity: 0.6 !important;
      transition: opacity 0.15s !important;
    }
    #${MODAL_ID} .sa-modal-close:hover { opacity: 1 !important; color: #0F1E35 !important; }
    #${MODAL_ID} .sa-modal-tabs {
      display: flex !important;
      gap: 4px !important;
      margin-bottom: 14px !important;
      padding-bottom: 10px !important;
      border-bottom: 1px solid #E2E8F0 !important;
      overflow-x: auto !important;
    }
    #${MODAL_ID} .sa-modal-tab {
      padding: 6px 12px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      background: transparent !important;
      color: #64748B !important;
      white-space: nowrap !important;
      transition: all 0.15s !important;
    }
    #${MODAL_ID} .sa-modal-tab:hover { background: #EEF2F7 !important; color: #0F1E35 !important; }
    #${MODAL_ID} .sa-modal-tab.sa-active {
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      font-weight: 600 !important;
    }
    #${MODAL_ID} .sa-modal-output {
      background: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      font-size: 13px !important;
      line-height: 1.65 !important;
      color: #1A2436 !important;
      min-height: 100px !important;
      max-height: 180px !important;
      overflow-y: auto !important;
      margin-bottom: 14px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    #${MODAL_ID} .sa-grammar-header-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8px !important;
      padding: 0 2px !important;
    }
    #${MODAL_ID} .sa-grammar-counter {
      font-size: 11px !important;
      color: #64748B !important;
      font-weight: 500 !important;
    }
    #${MODAL_ID} .sa-grammar-apply-all {
      background: transparent !important;
      border: 1px solid #D5DDE8 !important;
      border-radius: 6px !important;
      padding: 4px 10px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #0F1E35 !important;
      cursor: pointer !important;
      font-family: inherit !important;
      transition: all 0.15s !important;
    }
    #${MODAL_ID} .sa-grammar-apply-all:hover {
      background: #EEF2F7 !important;
      border-color: #0F1E35 !important;
    }
    #${MODAL_ID} .sa-grammar-suggestions {
      max-height: 150px !important;
      overflow-y: auto !important;
      margin-bottom: 14px !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 9px 12px !important;
      border-radius: 8px !important;
      background: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      margin-bottom: 6px !important;
      font-size: 12px !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
      user-select: none !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion:hover {
      background: #EEF2F7 !important;
      border-color: #D5DDE8 !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied {
      background: #F0FDF9 !important;
      border-color: #A7F3D0 !important;
    }
    #${MODAL_ID} .sa-sug-original {
      color: #DC2626 !important;
      text-decoration: line-through !important;
      font-weight: 500 !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied .sa-sug-original {
      color: #94A3B8 !important;
    }
    #${MODAL_ID} .sa-sug-arrow {
      color: #94A3B8 !important;
      font-size: 11px !important;
    }
    #${MODAL_ID} .sa-sug-replacement {
      color: #0F6E5C !important;
      font-weight: 600 !important;
    }
    #${MODAL_ID} .sa-sug-check {
      margin-left: auto !important;
      color: #0F6E5C !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      opacity: 0 !important;
      transition: opacity 0.15s !important;
    }
    #${MODAL_ID} .sa-grammar-suggestion.sa-applied .sa-sug-check {
      opacity: 1 !important;
    }
    #${MODAL_ID} .sa-modal-actions {
      display: flex !important;
      gap: 8px !important;
    }
    #${MODAL_ID} .sa-modal-btn {
      flex: 1 !important;
      padding: 10px 14px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      font-family: inherit !important;
      background: #FFFFFF !important;
      color: #1A2436 !important;
      border: 1px solid #D5DDE8 !important;
      transition: all 0.15s !important;
      letter-spacing: 0.1px !important;
    }
    #${MODAL_ID} .sa-modal-btn:hover {
      border-color: #0F1E35 !important;
      color: #0F1E35 !important;
      background: #EEF2F7 !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary {
      background: #0F1E35 !important;
      color: #FFFFFF !important;
      border: none !important;
    }
    #${MODAL_ID} .sa-modal-btn.sa-primary:hover {
      background: #1A2E4A !important;
    }
  `;
  root.appendChild(style);
}