// Segnalibro Digitale v2.0 - Popup Script per segnalibri multipli

document.addEventListener('DOMContentLoaded', async () => {
  const addBookmarkBtn = document.getElementById('addBookmark');
  const navigateBookmarksBtn = document.getElementById('navigateBookmarks');
  const showAllBookmarksBtn = document.getElementById('showAllBookmarks');
  const statusDiv = document.getElementById('status');
  const bookmarksListDiv = document.getElementById('bookmarksList');

  let activeTab = null;
  let currentBookmarks = [];

  // Ottieni il tab corrente con retry per compatibilità Chrome
  async function getActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (error) {
      console.error('Errore nel recupero tab:', error);
      return null;
    }
  }

  // Invia messaggio al content script con retry
  async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Aggiorna lo status e la lista dei segnalibri
  async function updateStatus() {
    if (!activeTab) {
      statusDiv.textContent = '❌ Impossibile accedere alla pagina corrente';
      statusDiv.className = 'status error';
      disableAllButtons();
      return;
    }

    try {
      const response = await sendMessageWithRetry(activeTab.id, { 
        action: 'getBookmarkStatus' 
      });
      
      if (response && response.hasBookmarks) {
        currentBookmarks = response.bookmarks || [];
        statusDiv.innerHTML = `
          ✅ ${currentBookmarks.length} segnalibri salvati<br>
          <small>Ultimo: ${currentBookmarks[currentBookmarks.length - 1]?.timestamp || 'N/A'}</small>
        `;
        statusDiv.className = 'status has-bookmarks';
        
        navigateBookmarksBtn.disabled = false;
        showAllBookmarksBtn.disabled = false;
        
        displayBookmarksList();
      } else {
        currentBookmarks = [];
        statusDiv.textContent = '⚠️ Nessun segnalibro in questa pagina';
        statusDiv.className = 'status no-bookmarks';
        navigateBookmarksBtn.disabled = true;
        showAllBookmarksBtn.disabled = true;
        hideBookmarksList();
      }
    } catch (error) {
      console.error('Errore nel recupero status:', error);
      statusDiv.innerHTML = '🔄 Ricarica la pagina per usare l\'estensione<br><small>Compatibilità: Chat AI + tutti i siti</small>';
      statusDiv.className = 'status error';
      disableAllButtons();
      hideBookmarksList();
    }
  }

  function disableAllButtons() {
    addBookmarkBtn.disabled = true;
    navigateBookmarksBtn.disabled = true;
    showAllBookmarksBtn.disabled = true;
  }

  function hideBookmarksList() {
    bookmarksListDiv.style.display = 'none';
  }

  function displayBookmarksList() {
    if (currentBookmarks.length === 0) {
      hideBookmarksList();
      return;
    }

    bookmarksListDiv.innerHTML = '';
    
    currentBookmarks.forEach((bookmark, index) => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      
      item.innerHTML = `
        <div class="bookmark-info">
          <div class="bookmark-title">${index + 1}. ${bookmark.title}</div>
          <div class="bookmark-time">${bookmark.timestamp}</div>
        </div>
        <div class="bookmark-actions">
          <button class="bookmark-btn go" data-bookmark-id="${bookmark.id}">Vai</button>
          <button class="bookmark-btn delete" data-bookmark-id="${bookmark.id}">🗑</button>
        </div>
      `;
      
      bookmarksListDiv.appendChild(item);
    });

    // Event listeners per i pulsanti dei singoli bookmark
    bookmarksListDiv.querySelectorAll('.bookmark-btn.go').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bookmarkId = parseInt(e.target.dataset.bookmarkId);
        const bookmark = currentBookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
          try {
            // Usa goToBookmark direttamente con i dati del bookmark
            await chrome.tabs.sendMessage(activeTab.id, {
              action: 'goToSpecificBookmark',
              bookmark: bookmark
            });
            window.close();
          } catch (error) {
            console.error('Errore nel navigare al segnalibro:', error);
          }
        }
      });
    });

    bookmarksListDiv.querySelectorAll('.bookmark-btn.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bookmarkId = parseInt(e.target.dataset.bookmarkId);
        try {
          const response = await sendMessageWithRetry(activeTab.id, {
            action: 'deleteBookmark',
            bookmarkId: bookmarkId
          });
          if (response && response.success) {
            setTimeout(updateStatus, 100);
          }
        } catch (error) {
          console.error('Errore nell\'eliminare il segnalibro:', error);
        }
      });
    });

    bookmarksListDiv.style.display = 'block';
  }

  // Event listeners per i pulsanti principali
  addBookmarkBtn.addEventListener('click', async () => {
    try {
      await sendMessageWithRetry(activeTab.id, { action: 'addBookmark' });
      setTimeout(updateStatus, 200);
      // Non chiudere il popup per permettere di aggiungere più segnalibri rapidamente
    } catch (error) {
      console.error('Errore nell\'aggiungere il segnalibro:', error);
    }
  });

  navigateBookmarksBtn.addEventListener('click', async () => {
    try {
      await sendMessageWithRetry(activeTab.id, { action: 'navigateBookmarks' });
      window.close();
    } catch (error) {
      console.error('Errore nella navigazione:', error);
    }
  });

  showAllBookmarksBtn.addEventListener('click', async () => {
    try {
      await sendMessageWithRetry(activeTab.id, { action: 'showAllBookmarks' });
      window.close();
    } catch (error) {
      console.error('Errore nel mostrare tutti i segnalibri:', error);
    }
  });

  // Inizializzazione
  try {
    activeTab = await getActiveTab();
    if (activeTab) {
      // Verifica se è una pagina supportata
      const url = activeTab.url;
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
        statusDiv.textContent = '❌ Estensione non disponibile su questa pagina';
        statusDiv.className = 'status error';
        disableAllButtons();
      } else {
        // Attendi un po' per permettere al content script di inizializzarsi
        setTimeout(updateStatus, 500);
      }
    } else {
      statusDiv.textContent = '❌ Nessuna pagina attiva trovata';
      statusDiv.className = 'status error';
      disableAllButtons();
    }
  } catch (error) {
    console.error('Errore nell\'inizializzazione:', error);
    statusDiv.textContent = '❌ Errore di inizializzazione';
    statusDiv.className = 'status error';
    disableAllButtons();
  }
});
        