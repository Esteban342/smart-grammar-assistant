import { getOwnShadowRoot } from './shadow';

export const LOADING_SPINNER_HTML = `
  <div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 70px;">
    <div style="
      width: 22px; 
      height: 22px; 
      border: 3px solid #E2E8F0; 
      border-top: 3px solid #0F1E35; 
      border-radius: 50%; 
      animation: sa-spin 0.8s linear infinite;
    "></div>
  </div>
`;

export function ensureSpinnerStyles() {
  // Inyectar los keyframes DENTRO del shadow root, no en document.head
  const root = getOwnShadowRoot();
  if (!root.getElementById('smart-assistant-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'smart-assistant-spinner-style';
    style.textContent = `
      @keyframes sa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    root.appendChild(style);
  }
}

export function renderApiKeyErrorHTML(): string {
  return `
    <div style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      text-align: center; 
      padding: 4px; 
      box-sizing: border-box;
    ">
      <div style="font-size: 20px; line-height: 1; margin-bottom: 6px;">🔑</div>
      <strong style="color: #0F1E35; font-size: 12px; display: block; margin-bottom: 4px;">Configuración requerida</strong>
      <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #64748B; max-width: 320px;">
        Haz clic en el icono de la extensión en Chrome y guarda tu <b>API Key</b> para empezar.
      </p>
    </div>
  `;
}