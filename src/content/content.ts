import { showFloatingMenu, removeFloatingMenu } from './modal';

let currentSelectedText = '';

document.addEventListener('mouseup', (event) => {
  const target = event.target as HTMLElement;
  if (target && (target.closest('#smart-assistant-menu') || target.closest('#smart-assistant-modal'))) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 2) {
      currentSelectedText = selectedText;
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        showFloatingMenu(rect.left + window.scrollX, rect.bottom + window.scrollY, currentSelectedText);
      }
    } else {
      removeFloatingMenu();
    }
  }, 100);
});