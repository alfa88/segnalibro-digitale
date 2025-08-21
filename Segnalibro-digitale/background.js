// Segnalibro Digitale - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Segnalibro Digitale installato con successo');
});

// Gestione dei comandi da tastiera
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) return;
  
  try {
    switch (command) {
      case 'set-bookmark':
        await chrome.tabs.sendMessage(tab.id, { action: 'setBookmark' });
        break;
      case 'go-to-bookmark':
        await chrome.tabs.sendMessage(tab.id, { action: 'goToBookmark' });
        break;
    }
  } catch (error) {
    console.log('Tab non pronto o comando non disponibile:', error);
  }
});

// Gestione del click sull'icona dell'estensione
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'setBookmark' });
  } catch (error) {
    console.log('Tab non pronto:', error);
  }
});