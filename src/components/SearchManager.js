// Search Manager Component
// Provides advanced search functionality for bookmarks

class SearchManager {
  constructor(options = {}) {
    this.options = {
      searchDebounce: 300,
      minQueryLength: 1,
      maxResults: 100,
      searchFields: ['title', 'url', 'tags'],
      fuzzySearch: true,
      highlightMatches: true,
      onSearchResults: null,
      onSearchStart: null,
      onSearchComplete: null,
      ...options
    };
    
    this.bookmarks = [];
    this.searchIndex = null;
    this.currentQuery = '';
    this.searchTimeout = null;
    this.isSearching = false;
    
    this.init();
  }
  
  init() {
    // Initialize search index
    this.buildSearchIndex();
  }
  
  async loadBookmarks() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
      
      if (response.success) {
        this.bookmarks = response.data;
        this.buildSearchIndex();
        return true;
      }
    } catch (error) {
      console.error('Error loading bookmarks for search:', error);
    }
    
    return false;
  }
  
  buildSearchIndex() {
    if (!this.bookmarks || this.bookmarks.length === 0) {
      this.searchIndex = [];
      return;
    }
    
    this.searchIndex = this.bookmarks.map(bookmark => {
      const searchText = this.getSearchableText(bookmark);
      const words = this.extractWords(searchText);
      
      return {
        id: bookmark.id,
        bookmark,
        searchText,
        words,
        wordMap: this.createWordMap(words)
      };
    });
  }
  
  getSearchableText(bookmark) {
    const parts = [];
    
    if (this.options.searchFields.includes('title') && bookmark.title) {
      parts.push(bookmark.title.toLowerCase());
    }
    
    if (this.options.searchFields.includes('url') && bookmark.url) {
      parts.push(bookmark.url.toLowerCase());
    }
    
    if (this.options.searchFields.includes('tags') && bookmark.tags) {
      parts.push(bookmark.tags.join(' ').toLowerCase());
    }
    
    return parts.join(' ');
  }
  
  extractWords(text) {
    if (!text) {return [];}
    
    // Split by non-alphanumeric characters, keep words with apostrophes and hyphens
    return text
      .split(/[^\w'-]+/)
      .filter(word => word.length > 1) // Ignore single characters
      .map(word => word.toLowerCase());
  }
  
  createWordMap(words) {
    const map = {};
    words.forEach(word => {
      if (!map[word]) {
        map[word] = 0;
      }
      map[word]++;
    });
    return map;
  }
  
  search(query, options = {}) {
    const searchOptions = {
      ...this.options,
      ...options
    };
    
    this.currentQuery = query.trim();
    
    if (this.currentQuery.length < searchOptions.minQueryLength) {
      this.emitResults([], this.currentQuery);
      return [];
    }
    
    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (searchOptions.onSearchStart) {
      searchOptions.onSearchStart(this.currentQuery);
    }
    
    this.isSearching = true;
    
    return new Promise((resolve) => {
      this.searchTimeout = setTimeout(() => {
        const results = this.performSearch(this.currentQuery, searchOptions);
        this.isSearching = false;
        
        this.emitResults(results, this.currentQuery);
        
        if (searchOptions.onSearchComplete) {
          searchOptions.onSearchComplete(results, this.currentQuery);
        }
        
        resolve(results);
      }, searchOptions.searchDebounce);
    });
  }
  
  performSearch(query, options) {
    if (!this.searchIndex || this.searchIndex.length === 0) {
      return [];
    }
    
    const queryWords = this.extractWords(query.toLowerCase());
    
    if (queryWords.length === 0) {
      return [];
    }
    
    // Score each bookmark
    const scoredResults = this.searchIndex.map(item => {
      const score = this.calculateScore(item, queryWords, options);
      return {
        ...item.bookmark,
        _searchScore: score,
        _matchedWords: this.getMatchedWords(item, queryWords)
      };
    });
    
    // Filter and sort results
    const filteredResults = scoredResults
      .filter(item => item._searchScore > 0)
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, options.maxResults);
    
    // Highlight matches if requested
    if (options.highlightMatches) {
      return filteredResults.map(item => this.highlightMatchesInResult(item, queryWords));
    }
    
    return filteredResults;
  }
  
  calculateScore(item, queryWords, options) {
    let totalScore = 0;
    
    queryWords.forEach(queryWord => {
      const wordScore = this.calculateWordScore(item, queryWord, options);
      totalScore += wordScore;
    });
    
    // Boost score for exact matches
    const exactMatch = item.searchText.includes(queryWords.join(' '));
    if (exactMatch) {
      totalScore *= 1.5;
    }
    
    // Boost score for title matches
    const titleMatch = item.bookmark.title && 
      item.bookmark.title.toLowerCase().includes(queryWords.join(' '));
    if (titleMatch) {
      totalScore *= 1.2;
    }
    
    return totalScore;
  }
  
  calculateWordScore(item, queryWord, options) {
    let score = 0;
    
    // Exact word match
    if (item.wordMap[queryWord]) {
      score += 10 * item.wordMap[queryWord]; // More occurrences = higher score
    }
    
    // Fuzzy match
    if (options.fuzzySearch) {
      Object.keys(item.wordMap).forEach(word => {
        const similarity = this.calculateSimilarity(queryWord, word);
        if (similarity > 0.7) { // Threshold for fuzzy match
          score += 5 * similarity * item.wordMap[word];
        }
      });
    }
    
    // Partial match (word contains query)
    Object.keys(item.wordMap).forEach(word => {
      if (word.includes(queryWord)) {
        score += 3 * item.wordMap[word];
      }
    });
    
    // Query contains indexed word (reverse partial)
    Object.keys(item.wordMap).forEach(word => {
      if (queryWord.includes(word)) {
        score += 2 * item.wordMap[word];
      }
    });
    
    return score;
  }
  
  calculateSimilarity(word1, word2) {
    // Simple Levenshtein distance-based similarity
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  getMatchedWords(item, queryWords) {
    const matchedWords = new Set();
    
    queryWords.forEach(queryWord => {
      // Exact matches
      if (item.wordMap[queryWord]) {
        matchedWords.add(queryWord);
      }
      
      // Partial matches
      Object.keys(item.wordMap).forEach(word => {
        if (word.includes(queryWord) || queryWord.includes(word)) {
          matchedWords.add(word);
        }
      });
    });
    
    return Array.from(matchedWords);
  }
  
  highlightMatchesInResult(bookmark, queryWords) {
    const highlighted = { ...bookmark };
    
    // Highlight in title
    if (bookmark.title) {
      highlighted.titleHighlighted = this.highlightText(bookmark.title, queryWords);
    }
    
    // Highlight in URL
    if (bookmark.url) {
      highlighted.urlHighlighted = this.highlightText(bookmark.url, queryWords);
    }
    
    // Highlight in tags
    if (bookmark.tags && bookmark.tags.length > 0) {
      highlighted.tagsHighlighted = bookmark.tags.map(tag => ({
        original: tag,
        highlighted: this.highlightText(tag, queryWords)
      }));
    }
    
    return highlighted;
  }
  
  highlightText(text, queryWords) {
    if (!text || queryWords.length === 0) {
      return text;
    }
    
    let highlighted = text;
    
    queryWords.forEach(queryWord => {
      if (queryWord.length < 2) {return;}
      
      const regex = new RegExp(`(${this.escapeRegex(queryWord)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }
  
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  emitResults(results, query) {
    if (this.options.onSearchResults) {
      this.options.onSearchResults(results, query);
    }
  }
  
  // Advanced search methods
  
  searchByTag(tag, options = {}) {
    if (!tag) {
      return this.getAllBookmarks();
    }
    
    const results = this.bookmarks.filter(bookmark => {
      return bookmark.tags && bookmark.tags.includes(tag);
    });
    
    if (options.highlightMatches) {
      return results.map(bookmark => this.highlightMatchesInResult(bookmark, [tag]));
    }
    
    return results;
  }
  
  searchByFolder(folderId, _options = {}) {
    if (!folderId) {
      return this.getAllBookmarks();
    }
    
    const results = this.bookmarks.filter(bookmark => {
      return bookmark.parentId === folderId;
    });
    
    return results;
  }
  
  searchByDate(range, _options = {}) {
    const now = Date.now();
    let startDate, endDate;
    
    switch (range) {
      case 'today':
        startDate = new Date().setHours(0, 0, 0, 0);
        endDate = now;
        break;
      case 'week':
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = now - (30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'year':
        startDate = now - (365 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      default:
        if (range && range.start && range.end) {
          startDate = range.start;
          endDate = range.end;
        } else {
          return this.getAllBookmarks();
        }
    }
    
    const results = this.bookmarks.filter(bookmark => {
      return bookmark.dateAdded && 
             bookmark.dateAdded >= startDate && 
             bookmark.dateAdded <= endDate;
    });
    
    return results;
  }
  
  searchByType(type, _options = {}) {
    if (type === 'bookmarks') {
      return this.bookmarks.filter(bookmark => bookmark.url);
    } else if (type === 'folders') {
      return this.bookmarks.filter(bookmark => !bookmark.url);
    } else {
      return this.getAllBookmarks();
    }
  }
  
  getAllBookmarks() {
    return [...this.bookmarks];
  }
  
  // Search history
  
  async saveSearchHistory(query) {
    if (!query || query.length < this.options.minQueryLength) {
      return;
    }
    
    try {
      const result = await chrome.storage.local.get('searchHistory');
      const history = result.searchHistory || [];
      
      const filtered = history.filter(item => item.query !== query);
      
      filtered.unshift({
        query,
        timestamp: Date.now(),
        count: 1
      });
      
      const trimmed = filtered.slice(0, 50);
      
      await chrome.storage.local.set({ searchHistory: trimmed });
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }
  
  async getSearchHistory(limit = 10) {
    try {
      const result = await chrome.storage.local.get('searchHistory');
      const history = result.searchHistory || [];
      return history.slice(0, limit);
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }
  
  async clearSearchHistory() {
    try {
      await chrome.storage.local.remove('searchHistory');
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }
  
  // Search suggestions
  
  async getSearchSuggestions(query, limit = 5) {
    if (!query || query.length < this.options.minQueryLength) {
      return [];
    }
    
    const suggestions = new Set();
    
    // From search history
    const history = await this.getSearchHistory(20);
    history.forEach(item => {
      if (item.query.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(item.query);
      }
    });
    
    // From bookmark titles
    this.bookmarks.forEach(bookmark => {
      if (bookmark.title && bookmark.title.toLowerCase().includes(query.toLowerCase())) {
        const words = bookmark.title.split(' ');
        words.forEach(word => {
          if (word.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(word);
          }
        });
      }
    });
    
    // From tags
    this.bookmarks.forEach(bookmark => {
      if (bookmark.tags) {
        bookmark.tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }
  
  // UI Helper Methods
  
  renderSearchInput(container, options = {}) {
    if (!container) {return;}
    
    const {
      placeholder = 'Search bookmarks...',
      value = '',
      showSuggestions = true,
      showHistory = true,
      onSearch = null,
      onInput = null
    } = options;
    
    container.innerHTML = `
      <div class="search-container">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" 
                 class="search-input" 
                 placeholder="${this.escapeHtml(placeholder)}"
                 value="${this.escapeHtml(value)}"
                 autocomplete="off">
          <button class="search-clear" title="Clear search">
            <i class="fas fa-times"></i>
          </button>
        </div>
        ${showSuggestions ? '<div class="search-suggestions"></div>' : ''}
      </div>
    `;
    
    const input = container.querySelector('.search-input');
    const clearBtn = container.querySelector('.search-clear');
    const suggestionsContainer = container.querySelector('.search-suggestions');
    
    // Input event
    if (input) {
      let inputTimeout;
      
      input.addEventListener('input', async (e) => {
        const query = e.target.value;
        
        if (onInput) {
          onInput(query);
        }
        
        // Debounce search
        if (inputTimeout) {
          clearTimeout(inputTimeout);
        }
        
        inputTimeout = setTimeout(async () => {
          if (query.length >= this.options.minQueryLength) {
            const results = await this.search(query);
            
            if (onSearch) {
              onSearch(results, query);
            }
            
            // Show suggestions
            if (showSuggestions && suggestionsContainer) {
              await this.renderSearchSuggestions(suggestionsContainer, query);
            }
          } else {
            // Clear results if query is too short
            if (onSearch) {
              onSearch([], query);
            }
            
            if (suggestionsContainer) {
              suggestionsContainer.innerHTML = '';
              suggestionsContainer.style.display = 'none';
            }
          }
        }, this.options.searchDebounce);
        
        // Show/hide clear button
        if (clearBtn) {
          clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        // Show suggestions on focus
        if (showSuggestions && suggestionsContainer && query.length > 0) {
          await this.renderSearchSuggestions(suggestionsContainer, query);
          suggestionsContainer.style.display = 'block';
        }
      });
      
      // Focus event
      input.addEventListener('focus', async () => {
        if (showHistory && suggestionsContainer && input.value.length === 0) {
          await this.renderSearchHistory(suggestionsContainer);
          suggestionsContainer.style.display = 'block';
        }
      });
      
      // Blur event
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
          }
        }, 200);
      });
      
      // Key events
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && onSearch) {
          const query = input.value;
          if (query.length >= this.options.minQueryLength) {
            this.saveSearchHistory(query);
            this.search(query).then(results => {
              onSearch(results, query);
            });
          }
        }
        
        if (e.key === 'Escape') {
          input.value = '';
          if (onSearch) {
            onSearch([], '');
          }
          if (clearBtn) {
            clearBtn.style.display = 'none';
          }
          if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
          }
        }
      });
    }
    
    // Clear button
    if (clearBtn) {
      clearBtn.style.display = value ? 'flex' : 'none';
      
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
          
          if (onSearch) {
            onSearch([], '');
          }
          
          clearBtn.style.display = 'none';
          
          if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
          }
        }
      });
    }
  }
  
  async renderSearchSuggestions(container, query) {
    if (!container) {return;}
    
    const suggestions = await this.getSearchSuggestions(query, 8);
    
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="no-suggestions">No suggestions found</div>';
      return;
    }
    
    const html = suggestions.map(suggestion => `
      <div class="search-suggestion" data-query="${this.escapeHtml(suggestion)}">
        <i class="fas fa-search"></i>
        <span class="suggestion-text">${this.highlightText(suggestion, [query])}</span>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    container.querySelectorAll('.search-suggestion').forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const query = suggestion.dataset.query;
        
        // Update input
        const input = container.closest('.search-container').querySelector('.search-input');
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Hide suggestions
        container.style.display = 'none';
      });
    });
  }
  
  async renderSearchHistory(container) {
    if (!container) {return;}
    
    const history = await this.getSearchHistory(8);
    
    if (history.length === 0) {
      container.innerHTML = '<div class="no-history">No search history</div>';
      return;
    }
    
    const html = `
      <div class="search-history-header">
        <span>Recent Searches</span>
        <button class="clear-history-btn" title="Clear history">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      ${history.map(item => `
        <div class="search-history-item" data-query="${this.escapeHtml(item.query)}">
          <i class="fas fa-history"></i>
          <span class="history-query">${this.escapeHtml(item.query)}</span>
          <span class="history-time">${this.formatTimeAgo(item.timestamp)}</span>
        </div>
      `).join('')}
    `;
    
    container.innerHTML = html;
    
    // History item clicks
    container.querySelectorAll('.search-history-item').forEach(item => {
      item.addEventListener('click', () => {
        const query = item.dataset.query;
        
        const input = container.closest('.search-container').querySelector('.search-input');
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
        
        container.style.display = 'none';
      });
    });
    
    // Clear history button
    const clearBtn = container.querySelector('.clear-history-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.clearSearchHistory();
        await this.renderSearchHistory(container);
      });
    }
  }
  
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) {return 'just now';}
    if (minutes < 60) {return `${minutes}m ago`;}
    if (hours < 24) {return `${hours}h ago`;}
    if (days < 7) {return `${days}d ago`;}
    
    return new Date(timestamp).toLocaleDateString();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchManager;
}
