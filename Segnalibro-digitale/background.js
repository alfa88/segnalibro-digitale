// Segnalibro Digitale v2.4 - Background Service Worker Ottimizzato

chrome.runtime.onInstalled.addListener(() => {
  console.log('Segnalibro Digitale v2.4 installato con successo');
});

// Mapping comandi tastiera → azioni del content.js
const mapping = {
  "add-bookmark": "addBookmark",
  "add-bookmark-manual": "addBookmarkManual",
  "navigate-bookmarks": "navigateBookmarks", 
  "show-all-bookmarks": "showAllBookmarks"
};

async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0] : null;
  } catch (error) {
    console.error('Errore nel recuperare il tab attivo:', error);
    return null;
  }
}

function isRestrictedUrl(url) {
  if (!url) return true;
  return url.startsWith('chrome://') ||
         url.startsWith('chrome-extension://') ||
         url.startsWith('edge://') ||
         url.startsWith('moz-extension://') ||
         url.startsWith('about:') ||
         url.startsWith('moz-extension://');
}

async function ensureContentScriptLoaded(tabId) {
  try {
    // Tenta di iniettare il content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles.css']
    });

    console.log('Content script iniettato con successo');
    return true;
  } catch (error) {
    console.error('Errore durante iniezione script:', error);
    return false;
  }
}

async function sendMessageToContentScript(tabId, message, retryCount = 0) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    if (retryCount < 2) {
      console.log('Content script non presente, tentativo di iniezione...');
      
      const injected = await ensureContentScriptLoaded(tabId);
      if (injected) {
        // Attendi l'inizializzazione
        await new Promise(resolve => setTimeout(resolve, 500));
        return sendMessageToContentScript(tabId, message, retryCount + 1);
      }
    }
    
    console.error('Impossibile comunicare con il content script:', error);
    return null;
  }
}

// Gestione dei comandi da tastiera
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tab = await getActiveTab();
    if (!tab) {
      console.error('Nessun tab attivo trovato');
      return;
    }

    const url = tab.url || "";
    if (isRestrictedUrl(url)) {
      console.log('URL non supportato per i comandi:', url);
      return;
    }

    const action = mapping[command];
    if (!action) {
      console.error('Comando non riconosciuto:', command);
      return;
    }

    const message = { action };
    console.log('Invio comando:', command, '→', action);

    await sendMessageToContentScript(tab.id, message);

  } catch (error) {
    console.error('Errore nel gestire il comando:', command, error);
  }
});

// Gestione messaggi dal popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Messaggio ricevuto nel background:', request);
  
  // Se il messaggio arriva dal popup, inoltralo al content script
  if (request.action && !sender.tab) {
    (async () => {
      try {
        const tab = await getActiveTab();
        if (tab && !isRestrictedUrl(tab.url)) {
          await sendMessageToContentScript(tab.id, request);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Tab non valido o URL ristretto' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Mantiene aperto il canale per la risposta asincrona
  }
  
  sendResponse({ success: true });
});