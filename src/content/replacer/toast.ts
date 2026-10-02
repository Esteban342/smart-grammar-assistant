// src/content/replacer/toast.ts
// Aviso flotante temporal que aparece abajo de la pantalla.

export function showToast(message: string): void {
  const existing = document.getElementById('sa-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'sa-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed !important;
    bottom: 30px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: #0F1E35 !important;
    color: #FFFFFF !important;
    padding: 12px 20px !important;
    border-radius: 10px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    box-shadow: 0 8px 24px rgba(15, 30, 53, 0.3) !important;
    z-index: 2147483647 !important;
    opacity: 0 !important;
    transition: opacity 0.2s ease !important;
    pointer-events: none !important;
    letter-spacing: 0.1px !important;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.setProperty('opacity', '1', 'important');
  });

  setTimeout(() => {
    toast.style.setProperty('opacity', '0', 'important');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}