// Segnalibro Digitale v2.0 - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Segnalibro Digitale v2.0 installato con successo - Segnalibri multipli + Chat AI');
});

// Gestione dei comandi da tastiera
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;
  
  try {
    // Attendi un po' per assicurarsi che il content script sia caricato
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (command) {
      case 'add-bookmark':
        await chrome.tabs.sendMessage(tab.id, { action: 'addBookmark' });
        break;
      case 'navigate-bookmarks':
        await chrome.tabs.sendMessage(tab.id, { action: 'navigateBookmarks' });
        break;
      case 'show-all-bookmarks':
        await chrome.tabs.sendMessage(tab.id, { action: 'showAllBookmarks' });
        break;
    }
  } catch (error) {
    console.log('Content script non pronto o comando non disponibile:', error);
    
    // Prova a iniettare lo script se non è presente (fallback per Chrome)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Riprova il comando dopo l'iniezione
      setTimeout(async () => {
        try {
          switch (command) {
            case 'add-bookmark':
              await chrome.tabs.sendMessage(tab.id, { action: 'addBookmark' });
              break;
            case 'navigate-bookmarks':
              await chrome.tabs.sendMessage(tab.id, { action: 'navigateBookmarks' });
              break;
            case 'show-all-bookmarks':
              await chrome.tabs.sendMessage(tab.id, { action: 'showAllBookmarks' });
              break;
          }
        } catch (retryError) {
          console.log('Retry fallito:', retryError);
        }
      }, 200);
    } catch (injectError) {
      console.log('Impossibile iniettare content script:', injectError);
    }
  }
});

// Gestione del click sull'icona dell'estensione (aggiunge segnalibro rapido)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'addBookmark' });
  } catch (error) {
    console.log('Tab non pronto per click icona:', error);
  }
});