// Segnalibro Digitale v2.4 - Content Script con selezione manuale e supporto chat AI
class MultipleDigitalBookmarks {
  constructor() {
    this.bookmarks = new Map();
    this.currentNavigationIndex = -1;
    this.visualBookmarks = [];
    this.isInitialized = false;
    this.selectedElement = null;
    this.selectionMode = false;
    this.selectionOverlay = null;
    this.hoverElement = null;

    this.initWithDelay();
  }

  async initWithDelay() {
    await this.waitForPageReady();

    this.loadBookmarks();
    this.setupEventListeners();
    this.restoreVisualBookmarks();
    this.isInitialized = true;

    console.log('📖 Segnalibro Digitale v2.4 inizializzato');
  }

  async waitForPageReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 500);
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
    const url = window.location.href;
    // Per i siti AI, mantieni l'URL base per raggruppare i segnalibri
    if (url.includes('chat.openai.com')) return 'https://chat.openai.com/';
    if (url.includes('claude.ai')) return 'https://claude.ai/';
    if (url.includes('gemini.google.com')) return 'https://gemini.google.com/';
    if (url.includes('mistral.ai')) return 'https://mistral.ai/';
    if (url.includes('bard.google.com')) return 'https://bard.google.com/';
    if (url.includes('poe.com')) return 'https://poe.com/';
    // Per altri siti, rimuovi parametri query e hash
    return url.split('?')[0].split('#')[0];
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

  // Rileva il container scrollabile corretto
  getScrollableContainer() {
    // Per le chat AI, cerca contenitori specifici
    if (this.isAIChatSite()) {
      const aiSelectors = [
        '[data-testid*="conversation"]',
        '[class*="conversation"]',
        '[class*="chat"]',
        '[class*="messages"]',
        'main[class*="chat"]',
        '.overflow-y-auto',
        '.overflow-auto',
        '[role="main"]'
      ];

      for (const selector of aiSelectors) {
        const container = document.querySelector(selector);
        if (container && this.isScrollable(container)) {
          console.log('Container scrollabile trovato:', selector);
          return container;
        }
      }
    }

    // Fallback alla finestra principale
    return window;
  }

  isScrollable(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    const hasScroll = element.scrollHeight > element.clientHeight;
    const canScroll = ['auto', 'scroll'].includes(style.overflowY) || 
                      ['auto', 'scroll'].includes(style.overflow);
    return hasScroll && canScroll;
  }

  getScrollPosition(container = null) {
    if (!container) container = this.getScrollableContainer();
    
    if (container === window) {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    }
    return container.scrollTop;
  }

  setScrollPosition(position, container = null) {
    if (!container) container = this.getScrollableContainer();
    
    if (container === window) {
      window.scrollTo({
        top: position,
        behavior: 'smooth'
      });
    } else {
      container.scrollTo({
        top: position,
        behavior: 'smooth'
      });
    }
  }

  getContextualTitleAtPosition(scrollY, container = null) {
    if (!container) container = this.getScrollableContainer();
    
    // Per i siti AI, cerca messaggi/conversazioni nelle vicinanze
    if (this.isAIChatSite()) {
      const aiSelectors = [
        '[data-testid*="conversation"]',
        '[data-testid*="message"]', 
        '.message',
        '.chat-message',
        '[role="presentation"] > div',
        'article',
        '.prose',
        '[class*="message"]',
        '[class*="chat-"]'
      ];
      
      let bestTitle = `Chat posizione ${scrollY}px`;
      let minDistance = Infinity;

      aiSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          let elementY;
          
          if (container === window) {
            const rect = el.getBoundingClientRect();
            elementY = rect.top + window.scrollY;
          } else {
            elementY = el.offsetTop;
          }
          
          const distance = Math.abs(elementY - scrollY);
          
          if (distance < minDistance && distance < 300) {
            minDistance = distance;
            let text = el.textContent.trim().substring(0, 60);
            if (text && text.length > 10) {
              bestTitle = text + (text.length === 60 ? '...' : '');
            }
          }
        });
      });
      
      return bestTitle;
    }

    // Per siti normali, cerca headers e paragrafi
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div');
    let bestTitle = `Posizione ${scrollY}px`;
    let minDistance = Infinity;

    elements.forEach(el => {
      let elementY;
      
      if (container === window) {
        const rect = el.getBoundingClientRect();
        elementY = rect.top + window.scrollY;
      } else {
        elementY = el.offsetTop;
      }
      
      const distance = Math.abs(elementY - scrollY);
      
      if (distance < minDistance && distance < 200) {
        minDistance = distance;
        let text = el.textContent.trim().substring(0, 50);
        if (text) {
          bestTitle = text + (text.length === 50 ? '...' : '');
        }
      }
    });

    return bestTitle;
  }

  // --- MODALITÀ SELEZIONE MANUALE ---
  startSelectionMode() {
    if (this.selectionMode) {
      this.exitSelectionMode();
      return;
    }

    this.selectionMode = true;
    this.showNotification('🎯 Modalità selezione attiva - Clicca dove vuoi il segnalibro', 'info');
    
    // Crea overlay di selezione
    this.createSelectionOverlay();
    
    // Aggiungi eventi per la selezione
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleSelectionClick.bind(this));
    document.addEventListener('keydown', this.handleSelectionKeydown.bind(this));
    
    // Cambia cursore
    document.body.style.cursor = 'crosshair';
  }

  createSelectionOverlay() {
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'selection-mode-overlay';
    this.selectionOverlay.innerHTML = `
      <div class="selection-instructions">
        🎯 Modalità Selezione Attiva
        <br><small>Clicca dove vuoi posizionare il segnalibro • ESC per annullare</small>
      </div>
    `;
    document.body.appendChild(this.selectionOverlay);
  }

  handleMouseOver(e) {
    if (!this.selectionMode) return;
    
    // Ignora l'overlay stesso
    if (e.target.closest('.selection-mode-overlay')) return;
    
    // Rimuovi evidenziazione precedente
    if (this.hoverElement) {
      this.hoverElement.classList.remove('selection-hover');
    }
    
    // Evidenzia elemento corrente
    this.hoverElement = e.target;
    this.hoverElement.classList.add('selection-hover');
  }

  handleMouseOut(e) {
    if (!this.selectionMode) return;
    
    if (this.hoverElement) {
      this.hoverElement.classList.remove('selection-hover');
      this.hoverElement = null;
    }
  }

  handleSelectionClick(e) {
    if (!this.selectionMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Ignora click sull'overlay
    if (e.target.closest('.selection-mode-overlay')) return;
    
    // Crea segnalibro nella posizione selezionata
    this.addBookmarkAtElement(e.target);
    this.exitSelectionMode();
  }

  handleSelectionKeydown(e) {
    if (!this.selectionMode) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      this.exitSelectionMode();
      this.showNotification('❌ Selezione annullata', 'warning');
    }
  }

  exitSelectionMode() {
    this.selectionMode = false;
    
    // Rimuovi eventi
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleSelectionClick.bind(this));
    document.removeEventListener('keydown', this.handleSelectionKeydown.bind(this));
    
    // Rimuovi evidenziazione
    if (this.hoverElement) {
      this.hoverElement.classList.remove('selection-hover');
      this.hoverElement = null;
    }
    
    // Rimuovi overlay
    if (this.selectionOverlay) {
      this.selectionOverlay.remove();
      this.selectionOverlay = null;
    }
    
    // Ripristina cursore
    document.body.style.cursor = '';
  }

  addBookmarkAtElement(element) {
    const container = this.getScrollableContainer();
    let scrollPosition;
    
    if (container === window) {
      const rect = element.getBoundingClientRect();
      scrollPosition = Math.round(rect.top + window.scrollY);
    } else {
      scrollPosition = Math.round(element.offsetTop);
    }
    
    const url = this.getCurrentUrl();
    const timestamp = new Date().toLocaleString('it-IT');
    const title = this.getElementTitle(element);

    let urlBookmarks = this.bookmarks.get(url) || [];
    const existingIndex = urlBookmarks.findIndex(b => Math.abs(b.scrollY - scrollPosition) < 50);

    if (existingIndex !== -1) {
      urlBookmarks[existingIndex] = {
        ...urlBookmarks[existingIndex],
        scrollY: scrollPosition,
        timestamp,
        title,
        pageTitle: document.title
      };
      this.showNotification('📄 Segnalibro aggiornato', 'info');
    } else {
      const newBookmark = {
        id: Date.now(),
        scrollY: scrollPosition,
        timestamp,
        title,
        pageTitle: document.title
      };
      urlBookmarks.push(newBookmark);
      this.showNotification(`✅ Segnalibro ${urlBookmarks.length} aggiunto: ${title}`, 'success');
    }

    urlBookmarks.sort((a, b) => a.scrollY - b.scrollY);
    this.bookmarks.set(url, urlBookmarks);
    this.saveBookmarks();
    this.updateVisualBookmarks();
  }

  getElementTitle(element) {
    // Cerca il testo più significativo nell'elemento o nei suoi genitori
    let title = '';
    
    // Prima prova il testo dell'elemento stesso
    const text = element.textContent?.trim();
    if (text && text.length > 5 && text.length < 100) {
      title = text.substring(0, 60);
    }
    
    // Se non trovato, cerca negli elementi vicini
    if (!title) {
      const parent = element.parentElement;
      if (parent) {
        const parentText = parent.textContent?.trim();
        if (parentText && parentText.length > 5) {
          title = parentText.substring(0, 60);
        }
      }
    }
    
    // Se ancora vuoto, usa il tag name
    if (!title) {
      title = `Elemento ${element.tagName.toLowerCase()}`;
    }
    
    return title + (title.length === 60 ? '...' : '');
  }

  // --- Aggiunta bookmark standard (posizione scroll corrente) ---
  addBookmarkStandard() {
    const container = this.getScrollableContainer();
    const scrollPosition = this.getScrollPosition(container);
    const url = this.getCurrentUrl();
    const timestamp = new Date().toLocaleString('it-IT');
    const title = this.getContextualTitleAtPosition(scrollPosition, container);

    let urlBookmarks = this.bookmarks.get(url) || [];
    const existingIndex = urlBookmarks.findIndex(b => Math.abs(b.scrollY - scrollPosition) < 50);

    if (existingIndex !== -1) {
      urlBookmarks[existingIndex] = {
        ...urlBookmarks[existingIndex],
        scrollY: scrollPosition,
        timestamp,
        title,
        pageTitle: document.title
      };
      this.showNotification('📄 Segnalibro aggiornato', 'info');
    } else {
      const newBookmark = {
        id: Date.now(),
        scrollY: scrollPosition,
        timestamp,
        title,
        pageTitle: document.title
      };
      urlBookmarks.push(newBookmark);
      this.showNotification(`✅ Segnalibro ${urlBookmarks.length} aggiunto`, 'success');
    }

    urlBookmarks.sort((a, b) => a.scrollY - b.scrollY);
    this.bookmarks.set(url, urlBookmarks);
    this.saveBookmarks();
    this.updateVisualBookmarks();
  }

  // --- Navigazione ciclica ---
  navigateBookmarks() {
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];

    if (urlBookmarks.length === 0) {
      this.showNotification('⚠️ Nessun segnalibro in questa pagina', 'warning');
      return;
    }

    this.currentNavigationIndex = (this.currentNavigationIndex + 1) % urlBookmarks.length;
    const nextBookmark = urlBookmarks[this.currentNavigationIndex];

    this.goToBookmark(nextBookmark);
    this.highlightBookmark(nextBookmark);
  }

  // --- Vai al segnalibro ---
  goToBookmark(bookmark) {
    const container = this.getScrollableContainer();
    this.setScrollPosition(bookmark.scrollY, container);
    this.showNotification(`📖 ${bookmark.title}`, 'info');
  }

  isAIChatSite() {
    const url = window.location.href;
    return url.includes('chat.openai.com') || 
           url.includes('claude.ai') || 
           url.includes('gemini.google.com') ||
           url.includes('mistral.ai') ||
           url.includes('bard.google.com') ||
           url.includes('poe.com');
  }

  // --- Mostra tutti i segnalibri ---
  showAllBookmarks() {
    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];

    if (urlBookmarks.length === 0) {
      this.showNotification('⚠️ Nessun segnalibro in questa pagina', 'warning');
      return;
    }

    // Rimuovi navigator esistente
    const existing = document.getElementById('bookmark-navigator');
    if (existing) {
      existing.remove();
      return;
    }

    const navigator = document.createElement('div');
    navigator.id = 'bookmark-navigator';
    navigator.innerHTML = `
      <div class="navigator-header">
        <span>🔖 Segnalibri (${urlBookmarks.length})</span>
        <span style="cursor: pointer; font-size: 18px;">✕</span>
      </div>
      <div class="navigator-list">
        ${urlBookmarks.map((bookmark, index) => `
          <div class="navigator-item" data-bookmark-id="${bookmark.id}">
            <div>
              <strong>${index + 1}. ${bookmark.title}</strong>
              <small>${bookmark.timestamp}</small>
            </div>
            <div>
              <button class="go-btn" data-scroll="${bookmark.scrollY}">Vai</button>
              <button class="delete-btn" data-bookmark-id="${bookmark.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(navigator);

    // Eventi del navigator
    navigator.querySelector('.navigator-header span:last-child').addEventListener('click', () => {
      navigator.remove();
    });

    navigator.querySelectorAll('.go-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scrollY = parseInt(e.target.dataset.scroll);
        const container = this.getScrollableContainer();
        this.setScrollPosition(scrollY, container);
        navigator.remove();
      });
    });

    navigator.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookmarkId = parseInt(e.target.dataset.bookmarkId);
        this.deleteBookmark(bookmarkId);
        navigator.remove();
        // Rimostra la lista aggiornata
        setTimeout(() => this.showAllBookmarks(), 100);
      });
    });
  }

  // --- Elimina segnalibro ---
  deleteBookmark(bookmarkId) {
    const url = this.getCurrentUrl();
    let urlBookmarks = this.bookmarks.get(url) || [];
    
    const initialLength = urlBookmarks.length;
    urlBookmarks = urlBookmarks.filter(b => b.id !== bookmarkId);
    
    if (urlBookmarks.length < initialLength) {
      if (urlBookmarks.length === 0) {
        this.bookmarks.delete(url);
      } else {
        this.bookmarks.set(url, urlBookmarks);
      }
      this.saveBookmarks();
      this.updateVisualBookmarks();
      this.showNotification('🗑️ Segnalibro eliminato', 'info');
    }
  }

  // --- Indicatori visivi (ora cliccabili) ---
  updateVisualBookmarks() {
    // Rimuovi indicatori esistenti
    this.visualBookmarks.forEach(indicator => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
    this.visualBookmarks = [];

    const url = this.getCurrentUrl();
    const urlBookmarks = this.bookmarks.get(url) || [];

    urlBookmarks.forEach((bookmark, index) => {
      this.createVisualBookmark(bookmark, index + 1);
    });
  }

  createVisualBookmark(bookmark, number) {
    const container = this.getScrollableContainer();
    
    const indicator = document.createElement('div');
    indicator.className = 'digital-bookmark-indicator';
    indicator.style.cssText = `
      position: absolute !important;
      left: 10px !important;
      top: ${bookmark.scrollY + (container !== window ? 0 : 0)}px !important;
      z-index: 10000 !important;
      cursor: pointer !important;
      transition: opacity 0.3s ease !important;
      pointer-events: all !important;
    `;

    indicator.innerHTML = `
      <div class="bookmark-line"></div>
      <div class="bookmark-label">${number}. ${bookmark.title}</div>
    `;

    // Cliccabile per andare al segnalibro
    indicator.addEventListener("click", () => this.goToBookmark(bookmark));

    document.body.appendChild(indicator);
    this.visualBookmarks.push(indicator);

    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0.3';
      }
    }, 5000);
  }

  restoreVisualBookmarks() {
    this.updateVisualBookmarks();
  }

  // --- Evidenziazione temporanea ---
  highlightBookmark(bookmark) {
    // Trova elementi nelle vicinanze della posizione del bookmark
    const elements = document.elementsFromPoint(window.innerWidth / 2, 100);
    const target = elements.find(el => 
      el.tagName && 
      !['HTML', 'BODY', 'SCRIPT'].includes(el.tagName) && 
      el.offsetHeight > 20
    );

    if (target) {
      target.classList.add('bookmark-highlight');
      setTimeout(() => {
        target.classList.remove('bookmark-highlight');
      }, 2000);
    }
  }

  // --- Notifiche ---
  showNotification(message, type = 'info') {
    // Rimuovi notifica esistente
    const existing = document.querySelector('.digital-bookmark-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `digital-bookmark-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    // Animazione di entrata
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto-rimozione
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 3000);

    // Rimozione al click
    notification.addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    });
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.isInitialized) return;

      // Ctrl+M = segnalibro standard (posizione scroll corrente)
      if (e.ctrlKey && e.key === 'm' && !e.shiftKey) {
        e.preventDefault();
        this.addBookmarkStandard();
      }

      // Ctrl+Shift+M = modalità selezione manuale
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.startSelectionMode();
      }

      // Ctrl+J = naviga segnalibri
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        this.navigateBookmarks();
      }

      // Ctrl+Shift+J = mostra tutti i segnalibri
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        this.showAllBookmarks();
      }
    });

    // Listener per i messaggi dal background script e dal popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!this.isInitialized) {
          setTimeout(() => {
            this.handleMessage(request, sender, sendResponse);
          }, 100);
          return true;
        }

        this.handleMessage(request, sender, sendResponse);
        return true;
      });
    }
  }

  handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'addBookmark':
          this.addBookmarkStandard();
          sendResponse({ success: true });
          break;
        case 'addBookmarkManual':
          this.startSelectionMode();
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
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Inizializzazione globale - evita duplicati
if (!window.digitalBookmarks) {
  window.digitalBookmarks = new MultipleDigitalBookmarks();
}