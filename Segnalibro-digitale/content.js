// Segnalibro Digitale v2.0 - Content Script con segnalibri multipli
class MultipleDigitalBookmarks {
  constructor() {
    this.bookmarks = new Map();
    this.currentNavigationIndex = 0;
    this.visualBookmarks = [];
    this.isInitialized = false;
    
    // Delay di inizializzazione per chat AI
    this.initWithDelay();
  }

  async initWithDelay() {
    // Attendi che la pagina sia completamente caricata
    await this.waitForPageReady();
    
    this.loadBookmarks();
    this.setupEventListeners();
    this.restoreVisualBookmarks();
    this.isInitialized = true;
    
    console.log('🔖 Segnalibro Digitale v2.0 inizializzato');
  }

  async waitForPageReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 500); // Delay extra per chat AI
      } else {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 500);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      }
    });
  }

  getCurrentUrl() {
    // Normalizza URL per chat AI (rimuovi parametri dinamici)
    const url = window.location.href;
    if (url.includes('chat.openai.com')) {
      return 'https://chat.openai.com/';
    }
    if (url.includes('claude.ai')) {
      return 'https://claude.ai/';
    }
    if (url.includes('gemini.google.com')) {
      return 'https://gemini.google.com/';
    }
    return url.split('?')[0].split('#')[0]; // Rimuovi parametri e hash
  }

  async loadBookmarks() {
    try {
      const result = await chrome.storage.local.get(['multipleBookmarks']);
      const stored = result.multipleBookmarks || {};
      this.bookmarks = new Map();
      
      Object.keys(stored).forEach(url => {
        this.bookmarks.set(url, stored[url]);
      });
    } catch (error) {
      console.log('Inizializzazione bookmarks multipli:', error);
      this.bookmarks = new Map();
    }
  }

  async saveBookmarks() {
    try {
      const bookmarksObj = {};
      this.bookmarks.forEach((bookmarks, url) => {
        bookmarksObj[url] = bookmarks;
      });
      await chrome.storage.local.set({ multipleBookmarks: bookmarksObj });
    } catch (error) {
      console.error('Errore nel salvare i bookmarks:', error);
    }
  }

  addBookmark() {
    const url = this.getCurrentUrl();
    const scrollY = Math.round(window.scrollY);
    const timestamp = new Date().toLocaleString('it-IT');
    const title = this.getContextualTitle();
    
    // Ottieni bookmarks esistenti per questa URL
    let urlBookmarks = this.bookmarks.get(url) || [];
    
    // Controlla se esiste già un bookmark molto vicino (entro 50px)
    const existingIndex = urlBookmarks.findIndex(b => Math.abs(b.scrollY - scrollY) < 50);
    
    if (existingIndex !== -1) {
      // Aggiorna bookmark esistente
      urlBookmarks[existingIndex] = {
        id: urlBookmarks[existingIndex].id,
        scrollY: scrollY,
        timestamp: timestamp,
        title: title,
        pageTitle: document.title
      };
      this.showNotification('🔄 Segnalibro aggiornato', 'info');
    } else {
      // Aggiungi nuovo bookmark
      const newBookmark = {
        id: Date.now(),
        scrollY: scrollY,
        timestamp: timestamp,
        title: title,
        pageTitle: document.title
      };
      urlBookmarks.push(newBookmark);
      this.showNotification(`✅ Segnalibro ${urlBookmarks.length} aggiunto`, 'success');
    }
    
    // Ordina per posizione sulla pagina
    urlBookmarks.sort((a, b) => a.scrollY - b.scrollY);
    
    this.bookmarks.set(url, urlBookmarks);
    this.saveBookmarks();
    this.updateVisualBookmarks();
  }

  getContextualTitle() {
    // Prova a ottenere un titolo contextuale basato sul contenuto visibile
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    
    // Cerca headers vicini alla posizione corrente
    const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .message-header, [role="heading"]');
    let nearestHeader = null;
    let minDistance = Infinity;
    
    headers.forEach(header => {
      const rect = header.getBoundingClientRect();
      const headerY = scrollY + rect.top;
      const distance = Math.abs(headerY - scrollY);
      
      if (distance < minDistance && distance < viewportHeight) {
        minDistance = distance;
        nearestHeader = header;
      }
    });
    
    if (nearestHeader) {
      const text = nearestHeader.textContent.trim();
      return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
    
    // Fallback per chat AI - cerca il messaggio più vicino
    const messages = document.querySelectorAll('[data-message-author-role], .conversation-turn, .message');
    if (messages.length > 0) {
      for (const message of messages) {
        const rect = message.getBoundingClientRect();
        if (rect.top >= -100 && rect.top <= viewportHeight / 2) {
          const text = message.textContent.trim();
          return `Messaggio: ${text.length > 30 ? text.substring(0, 27) + '...' : text}`;
        }
      }
    }
    
    return `Posizione ${Math.round(scrollY)}px`;
  }

  navigateBookmarks() {
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];
    
    if (urlBookmarks.length === 0) {
      this.showNotification('⚠️ Nessun segnalibro in questa pagina', 'warning');
      return;
    }
    
    if (urlBookmarks.length === 1) {
      // Un solo bookmark - vai direttamente
      this.goToBookmark(urlBookmarks[0]);
      return;
    }
    
    // Trova il prossimo bookmark da visitare
    const currentScroll = window.scrollY;
    let nextBookmark = null;
    
    // Trova il primo bookmark sotto la posizione corrente
    for (const bookmark of urlBookmarks) {
      if (bookmark.scrollY > currentScroll + 10) {
        nextBookmark = bookmark;
        break;
      }
    }
    
    // Se non trovato, vai al primo
    if (!nextBookmark) {
      nextBookmark = urlBookmarks[0];
    }
    
    this.goToBookmark(nextBookmark);
  }

  goToBookmark(bookmark) {
    const smoothScroll = () => {
      window.scrollTo({
        top: bookmark.scrollY,
        behavior: 'smooth'
      });
    };
    
    // Per chat AI, usa un approccio più robusto
    if (this.isAIChatSite()) {
      // Scroll immediato + smooth
      window.scrollTo(0, bookmark.scrollY);
      setTimeout(smoothScroll, 50);
    } else {
      smoothScroll();
    }
    
    this.showNotification(`📍 ${bookmark.title}`, 'info');
    this.highlightBookmark(bookmark);
  }

  isAIChatSite() {
    const url = window.location.href;
    return url.includes('chat.openai.com') || 
           url.includes('claude.ai') || 
           url.includes('gemini.google.com') ||
           url.includes('bard.google.com') ||
           url.includes('poe.com');
  }

  showAllBookmarks() {
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];
    
    if (urlBookmarks.length === 0) {
      this.showNotification('⚠️ Nessun segnalibro in questa pagina', 'warning');
      return;
    }
    
    this.createBookmarkNavigator(urlBookmarks);
  }

  createBookmarkNavigator(bookmarks) {
    // Rimuovi navigatore esistente
    const existingNav = document.getElementById('bookmark-navigator');
    if (existingNav) existingNav.remove();
    
    const navigator = document.createElement('div');
    navigator.id = 'bookmark-navigator';
    navigator.className = 'bookmark-navigator';
    
    const header = document.createElement('div');
    header.className = 'navigator-header';
    header.innerHTML = `
      <span>📌 Segnalibri (${bookmarks.length})</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">×</button>
    `;
    
    const list = document.createElement('div');
    list.className = 'navigator-list';
    
    bookmarks.forEach((bookmark, index) => {
      const item = document.createElement('div');
      item.className = 'navigator-item';
      item.innerHTML = `
        <div class="bookmark-info">
          <strong>${bookmark.title}</strong>
          <small>${bookmark.timestamp}</small>
        </div>
        <div class="bookmark-actions">
          <button onclick="window.digitalBookmarks.goToBookmark(${JSON.stringify(bookmark).replace(/"/g, '&quot;')})">Vai</button>
          <button onclick="window.digitalBookmarks.deleteBookmark(${bookmark.id})" class="delete-btn">🗑</button>
        </div>
      `;
      list.appendChild(item);
    });
    
    navigator.appendChild(header);
    navigator.appendChild(list);
    document.body.appendChild(navigator);
    
    // Auto-hide dopo 10 secondi
    setTimeout(() => {
      if (navigator.parentNode) navigator.remove();
    }, 10000);
  }

  deleteBookmark(bookmarkId) {
    const url = this.getCurrentUrl();
    let urlBookmarks = this.bookmarks.get(url) || [];
    
    const initialLength = urlBookmarks.length;
    urlBookmarks = urlBookmarks.filter(b => b.id !== bookmarkId);
    
    if (urlBookmarks.length < initialLength) {
      this.bookmarks.set(url, urlBookmarks);
      this.saveBookmarks();
      this.updateVisualBookmarks();
      this.showNotification('🗑️ Segnalibro eliminato', 'success');
      
      // Aggiorna il navigatore se aperto
      const navigator = document.getElementById('bookmark-navigator');
      if (navigator) {
        navigator.remove();
        if (urlBookmarks.length > 0) {
          this.createBookmarkNavigator(urlBookmarks);
        }
      }
      
      return true;
    }
    return false;
  }

  updateVisualBookmarks() {
    // Rimuovi indicatori esistenti
    this.clearVisualBookmarks();
    
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];
    
    urlBookmarks.forEach((bookmark, index) => {
      this.createVisualBookmark(bookmark, index + 1);
    });
  }

  createVisualBookmark(bookmark, number) {
    const indicator = document.createElement('div');
    indicator.className = 'digital-bookmark-indicator';
    indicator.style.cssText = `
      position: absolute !important;
      left: 10px !important;
      top: ${bookmark.scrollY}px !important;
      z-index: 10000 !important;
      pointer-events: none !important;
    `;
    
    indicator.innerHTML = `
      <div class="bookmark-line"></div>
      <div class="bookmark-label">${number}. ${bookmark.title}</div>
    `;
    
    document.body.appendChild(indicator);
    this.visualBookmarks.push(indicator);
    
    // Auto-fade dopo 5 secondi
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0.3';
      }
    }, 5000);
  }

  clearVisualBookmarks() {
    this.visualBookmarks.forEach(indicator => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    });
    this.visualBookmarks = [];
  }

  highlightBookmark(bookmark) {
    // Crea indicatore temporaneo di highlight
    const highlight = document.createElement('div');
    highlight.className = 'bookmark-highlight';
    highlight.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      top: ${bookmark.scrollY - 5}px !important;
      height: 30px !important;
      background: rgba(255, 107, 107, 0.2) !important;
      border: 2px solid #ff6b6b !important;
      z-index: 9999 !important;
      pointer-events: none !important;
      animation: highlightPulse 2s ease-out !important;
    `;
    
    document.body.appendChild(highlight);
    
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.remove();
      }
    }, 2000);
  }

  restoreVisualBookmarks() {
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];
    
    if (urlBookmarks.length > 0) {
      setTimeout(() => {
        this.updateVisualBookmarks();
        this.showNotification(`📌 ${urlBookmarks.length} segnalibri ripristinati`, 'info');
      }, 1000);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `digital-bookmark-notification ${type}`;
    notification.textContent = message;
    
    // Posizionamento intelligente per chat AI
    if (this.isAIChatSite()) {
      notification.style.cssText += `
        position: fixed !important;
        top: 80px !important;
        right: 20px !important;
        z-index: 10001 !important;
      `;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  setupEventListeners() {
    // Keyboard listeners
    document.addEventListener('keydown', (e) => {
      if (!this.isInitialized) return;
      
      if (e.ctrlKey && e.key === 'm' && !e.shiftKey) {
        e.preventDefault();
        this.addBookmark();
      }
      
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        this.navigateBookmarks();
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.showAllBookmarks();
      }
    });

    // Message listener
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!this.isInitialized) {
          sendResponse({ success: false, error: 'Not initialized' });
          return;
        }
        
        try {
          switch (request.action) {
            case 'addBookmark':
              this.addBookmark();
              sendResponse({ success: true });
              break;
            case 'navigateBookmarks':
              this.navigateBookmarks();
              sendResponse({ success: true });
              break;
            case 'showAllBookmarks':
              this.showAllBookmarks();
              sendResponse({ success: true });
              break;
            case 'getBookmarkStatus':
              const url = this.getCurrentUrl();
              const bookmarks = this.bookmarks.get(url) || [];
              sendResponse({ 
                hasBookmarks: bookmarks.length > 0,
                bookmarks: bookmarks,
                currentScroll: window.scrollY 
              });
              break;
            case 'deleteBookmark':
              const deleted = this.deleteBookmark(request.bookmarkId);
              sendResponse({ success: deleted });
              break;
            case 'goToSpecificBookmark':
              if (request.bookmark) {
                this.goToBookmark(request.bookmark);
                sendResponse({ success: true });
              }
              break;
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.saveBookmarks();
      this.clearVisualBookmarks();
    });

    // Re-update visual bookmarks on resize
    window.addEventListener('resize', () => {
      setTimeout(() => this.updateVisualBookmarks(), 100);
    });
  }
}

// Inizializzazione globale
window.digitalBookmarks = new MultipleDigitalBookmarks();