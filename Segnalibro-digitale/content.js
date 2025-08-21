// Segnalibro Digitale - Content Script
class DigitalBookmark {
  constructor() {
    this.bookmarks = new Map();
    this.currentBookmarkElement = null;
    this.init();
  }

  init() {
    this.loadBookmarks();
    this.setupKeyboardListeners();
    this.setupMessageListener();
    
    // Cleanup quando la pagina viene ricaricata
    window.addEventListener('beforeunload', () => {
      this.saveBookmarks();
    });

    // Ripristina i segnalibri visibili quando la pagina è caricata
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.restoreVisualBookmarks(), 100);
      });
    } else {
      setTimeout(() => this.restoreVisualBookmarks(), 100);
    }
  }

  getCurrentUrl() {
    return window.location.href;
  }

  async loadBookmarks() {
    try {
      const result = await chrome.storage.local.get(['digitalBookmarks']);
      this.bookmarks = new Map(Object.entries(result.digitalBookmarks || {}));
    } catch (error) {
      console.log('Inizializzazione bookmarks:', error);
      this.bookmarks = new Map();
    }
  }

  async saveBookmarks() {
    try {
      const bookmarksObj = Object.fromEntries(this.bookmarks);
      await chrome.storage.local.set({ digitalBookmarks: bookmarksObj });
    } catch (error) {
      console.error('Errore nel salvare i bookmarks:', error);
    }
  }

  setBookmark() {
    const url = this.getCurrentUrl();
    const scrollY = window.scrollY;
    const timestamp = new Date().toLocaleString('it-IT');
    
    // Rimuovi il segnalibro visuale precedente
    this.removeVisualBookmark();
    
    // Salva il nuovo segnalibro
    this.bookmarks.set(url, {
      scrollY: scrollY,
      timestamp: timestamp,
      title: document.title
    });
    
    this.saveBookmarks();
    this.addVisualBookmark(scrollY);
    this.showNotification(`✓ Segnalibro salvato (${timestamp})`, 'success');
  }

  goToBookmark() {
    const url = this.getCurrentUrl();
    const bookmark = this.bookmarks.get(url);
    
    if (bookmark) {
      window.scrollTo({
        top: bookmark.scrollY,
        behavior: 'smooth'
      });
      this.showNotification(`↑ Andando al segnalibro (${bookmark.timestamp})`, 'info');
    } else {
      this.showNotification('⚠ Nessun segnalibro trovato per questa pagina', 'warning');
    }
  }

  addVisualBookmark(scrollY) {
    this.removeVisualBookmark();
    
    const bookmark = document.createElement('div');
    bookmark.id = 'digital-bookmark-indicator';
    bookmark.innerHTML = `
      <div class="bookmark-line"></div>
      <div class="bookmark-label">📌 Segnalibro</div>
    `;
    
    // Posiziona il segnalibro alla posizione corretta nel documento
    bookmark.style.position = 'absolute';
    bookmark.style.top = `${scrollY + document.documentElement.scrollTop}px`;
    bookmark.style.left = '10px';
    bookmark.style.zIndex = '10000';
    
    document.body.appendChild(bookmark);
    this.currentBookmarkElement = bookmark;
    
    // Auto-hide dopo 3 secondi
    setTimeout(() => {
      if (bookmark && bookmark.parentNode) {
        bookmark.classList.add('fade-out');
        setTimeout(() => {
          if (bookmark && bookmark.parentNode) {
            bookmark.remove();
            if (this.currentBookmarkElement === bookmark) {
              this.currentBookmarkElement = null;
            }
          }
        }, 300);
      }
    }, 3000);
  }

  removeVisualBookmark() {
    const existing = document.getElementById('digital-bookmark-indicator');
    if (existing) {
      existing.remove();
    }
    this.currentBookmarkElement = null;
  }

  restoreVisualBookmarks() {
    const url = this.getCurrentUrl();
    const bookmark = this.bookmarks.get(url);
    
    if (bookmark) {
      // Mostra brevemente dove si trova il segnalibro
      const indicator = document.createElement('div');
      indicator.className = 'bookmark-indicator-restore';
      indicator.innerHTML = `📌 Segnalibro salvato qui (${bookmark.timestamp})`;
      indicator.style.position = 'fixed';
      indicator.style.top = '20px';
      indicator.style.right = '20px';
      indicator.style.zIndex = '10001';
      
      document.body.appendChild(indicator);
      
      setTimeout(() => {
        if (indicator && indicator.parentNode) {
          indicator.remove();
        }
      }, 2000);
    }
  }

  deleteBookmark() {
    const url = this.getCurrentUrl();
    if (this.bookmarks.has(url)) {
      this.bookmarks.delete(url);
      this.saveBookmarks();
      this.removeVisualBookmark();
      this.showNotification('🗑 Segnalibro eliminato', 'success');
      return true;
    }
    return false;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `digital-bookmark-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animazione di entrata
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Rimozione automatica
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 2500);
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+M per impostare segnalibro
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        this.setBookmark();
      }
      
      // Ctrl+J per andare al segnalibro
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        this.goToBookmark();
      }
      
      // Ctrl+Shift+M per eliminare segnalibro
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.deleteBookmark();
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'setBookmark':
          this.setBookmark();
          sendResponse({ success: true });
          break;
        case 'goToBookmark':
          this.goToBookmark();
          sendResponse({ success: true });
          break;
        case 'deleteBookmark':
          const deleted = this.deleteBookmark();
          sendResponse({ success: deleted });
          break;
        case 'getBookmarkStatus':
          const url = this.getCurrentUrl();
          const hasBookmark = this.bookmarks.has(url);
          const bookmark = hasBookmark ? this.bookmarks.get(url) : null;
          sendResponse({ 
            hasBookmark, 
            bookmark,
            currentScroll: window.scrollY 
          });
          break;
      }
    });
  }
}

// Inizializza l'applicazione
const digitalBookmark = new DigitalBookmark();