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
// Genera la pantalla de advertencia cuando el usuario selecciona
// un texto demasiado largo (mas de 3000 caracteres).
export function renderLongTextWarningHTML(charCount: number): string {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; width: 100%; box-sizing: border-box;">
      <div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>
      <strong style="color: #E05C52; font-size: 14px; margin-bottom: 6px;">El texto es muy largo</strong>
      <p style="font-size: 12px; line-height: 1.4; color: #64748B; margin-bottom: 20px; max-width: 320px;">
        Has seleccionado ${charCount.toLocaleString()} caracteres. Procesar esto puede tardar un minuto y consumir más cuota.
      </p>
      <div style="display: flex; gap: 8px; width: 100%; max-width: 260px; justify-content: center;">
        <button id="sa-cancel-long" class="sa-modal-btn" style="flex: 1; padding: 8px 10px; font-size: 12px; white-space: nowrap;">Cancelar</button>
        <button id="sa-confirm-long" class="sa-modal-btn sa-primary" style="flex: 1; padding: 8px 10px; font-size: 12px; white-space: nowrap;">Procesar igual</button>
      </div>
    </div>
  `;
}