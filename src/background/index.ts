chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'humanize-selection',
    title: 'Humanizar texto con IA',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'paraphrase-selection',
    title: 'Parafrasear texto con IA',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;

  const mode = info.menuItemId === 'humanize-selection' ? 'humanize' : 'standard';
  chrome.tabs.sendMessage(tab.id, {
    action: 'OPEN_MODAL_FROM_CONTEXT',
    text: info.selectionText,
    mode: mode
  });
});