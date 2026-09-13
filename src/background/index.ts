console.log(" Background Service Worker cargado correctamente.");

// Escuchar cuando la extensión se instala
chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Grammar Assistant instalado exitosamente.");
});