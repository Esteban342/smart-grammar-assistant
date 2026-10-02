// src/content/ui/modal/modal-drag.ts
// Permite arrastrar el modal agarrando su encabezado.

export function makeModalDraggable(modal: HTMLElement): void {
  const handle = modal.querySelector('#sa-modal-drag-handle') as HTMLElement;
  if (!handle) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('#sa-modal-close')) return;
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    modal.style.setProperty('transform', 'none', 'important');
    modal.style.setProperty('top', rect.top + 'px', 'important');
    modal.style.setProperty('left', rect.left + 'px', 'important');
    document.body.style.cursor = 'move';
    e.preventDefault();
  });

  const onMove = (e: MouseEvent) => {
    if (!isDragging) return;
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    const maxLeft = window.innerWidth - modal.offsetWidth;
    const maxTop = window.innerHeight - modal.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
    modal.style.setProperty('left', newLeft + 'px', 'important');
    modal.style.setProperty('top', newTop + 'px', 'important');
  };

  const onUp = () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}