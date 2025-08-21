// Segnalibro Digitale - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const setBookmarkBtn = document.getElementById('setBookmark');
  const goToBookmarkBtn = document.getElementById('goToBookmark');
  const deleteBookmarkBtn = document.getElementById('deleteBookmark');
  const statusDiv = document.getElementById('status');

  // Ottieni il tab corrente
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab) {
    statusDiv.textContent = '❌ Impossibile accedere alla pagina corrente';
    statusDiv.className = 'status no-bookmark';
    return;
  }

  // Controlla lo stato del segnalibro per la pagina corrente
  async function updateStatus() {
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { 
        action: 'getBookmarkStatus' 
      });
      
      if (response.hasBookmark) {
        statusDiv.innerHTML = `
          ✅ Segnalibro salvato<br>
          <small>${response.bookmark.timestamp}</small>
        `;
        statusDiv.className = 'status has-bookmark';
        goToBookmarkBtn.disabled = false;
        deleteBookmarkBtn.disabled = false;
      } else {
        statusDiv.textContent = '⚠️ Nessun segnalibro in questa pagina';
        statusDiv.className = 'status no-bookmark';
        goToBookmarkBtn.disabled = true;
        deleteBookmarkBtn.disabled = true;
      }
    } catch (error) {
      statusDiv.textContent = '🔄 Ricarica la pagina per usare l\'estensione';
      statusDiv.className = 'status no-bookmark';
      setBookmarkBtn.disabled = true;
      goToBookmarkBtn.disabled = true;
      deleteBookmarkBtn.disabled = true;
    }
  }

  // Event listeners per i pulsanti
  setBookmarkBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'setBookmark' });
      setTimeout(updateStatus, 100);
      window.close();
    } catch (error) {
      console.error('Errore nell\'impostare il segnalibro:', error);
    }
  });

  goToBookmarkBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'goToBookmark' });
      window.close();
    } catch (error) {
      console.error('Errore nel navigare al segnalibro:', error);
    }
  });

  deleteBookmarkBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { 
        action: 'deleteBookmark' 
      });
      if (response.success) {
        setTimeout(updateStatus, 100);
      }
    } catch (error) {
      console.error('Errore nell\'eliminare il segnalibro:', error);
    }
  });

  // Inizializza lo stato
  await updateStatus();
});