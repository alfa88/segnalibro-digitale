// Popup script per Segnalibro Digitale v2.4

async function sendMessageToActiveTab(action) {
  try {
    // Ottieni il tab attivo
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('Nessun tab attivo trovato');
      return;
    }

    // Controlla se è un URL ristretto
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('edge://') || 
        tab.url.startsWith('moz-extension://')) {
      console.log('URL non supportato:', tab.url);
      showStatus('❌ URL non supportato', 'error');
      return;
    }

    try {
      // Prova a inviare il messaggio
      const response = await chrome.tabs.sendMessage(tab.id, { action });
      console.log('Messaggio inviato con successo:', response);
      showStatus('✅ Comando eseguito', 'success');
    } catch (error) {
      console.log('Content script non presente, tentativo di iniezione...');
      
      try {
        // Inietta il content script se non è presente
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles.css']
        });

        showStatus('⏳ Inizializzazione...', 'info');

        // Attendi un momento per l'inizializzazione
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, { action });
            console.log('Messaggio inviato dopo iniezione');
            showStatus('✅ Comando eseguito', 'success');
          } catch (retryError) {
            console.error('Errore dopo iniezione:', retryError);
            showStatus('❌ Errore di comunicazione', 'error');
          }
        }, 500);
      } catch (injectError) {
        console.error('Errore durante iniezione script:', injectError);
        showStatus('❌ Impossibile inizializzare', 'error');
      }
    }
  } catch (error) {
    console.error('Errore generale nel popup:', error);
    showStatus('❌ Errore generale', 'error');
  }
}

function showStatus(message, type) {
  // Rimuovi status esistenti
  const existingStatus = document.querySelector('.status-message');
  if (existingStatus) {
    existingStatus.remove();
  }

  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message status-${type}`;
  statusDiv.textContent = message;
  statusDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    animation: statusSlide 0.3s ease;
  `;

  document.body.appendChild(statusDiv);

  // Rimuovi dopo 2 secondi
  setTimeout(() => {
    if (statusDiv.parentNode) {
      statusDiv.remove();
    }
  }, 2000);
}

// Aggiungi CSS per l'animazione
const style = document.createElement('style');
style.textContent = `
  @keyframes statusSlide {
    from { 
      opacity: 0; 
      transform: translateX(-50%) translateY(-10px); 
    }
    to { 
      opacity: 1; 
      transform: translateX(-50%) translateY(0); 
    }
  }
`;
document.head.appendChild(style);

// Event listeners per i pulsanti
document.addEventListener('DOMContentLoaded', () => {
  // Pulsante segnalibro rapido (posizione scroll corrente)
  const addBtn = document.getElementById("add");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      sendMessageToActiveTab("addBookmark");
      setTimeout(() => window.close(), 800); // Chiude dopo aver mostrato lo status
    });
  }

  // Pulsante selezione manuale
  const addManualBtn = document.getElementById("addManual");
  if (addManualBtn) {
    addManualBtn.addEventListener("click", () => {
      sendMessageToActiveTab("addBookmarkManual");
      window.close(); // Chiude immediatamente per permettere la selezione
    });
  }

  // Pulsante naviga segnalibri
  const navigateBtn = document.getElementById("navigate");
  if (navigateBtn) {
    navigateBtn.addEventListener("click", () => {
      sendMessageToActiveTab("navigateBookmarks");
      setTimeout(() => window.close(), 800);
    });
  }

  // Pulsante mostra tutti
  const showAllBtn = document.getElementById("showAll");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      sendMessageToActiveTab("showAllBookmarks");
      setTimeout(() => window.close(), 800);
    });
  }
});