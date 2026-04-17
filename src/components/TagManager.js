// Tag Manager Component
// Provides tag management functionality for bookmarks

class TagManager {
  constructor(options = {}) {
    this.options = {
      onTagAdded: null,
      onTagRemoved: null,
      onTagUpdated: null,
      ...options
    };
    
    this.tags = new Map(); // tagName -> { count, color, createdAt }
    this.bookmarkTags = new Map(); // bookmarkId -> Set(tagName)
    
    this.loadTags();
  }
  
  async loadTags() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TAGS' });
      
      if (response.success) {
        this.tags.clear();
        response.data.forEach(tag => {
          this.tags.set(tag.name, {
            count: tag.count || 0,
            color: tag.color || this.generateColor(tag.name),
            createdAt: tag.createdAt || Date.now()
          });
        });
        
        // Also load bookmark-tag associations
        await this.loadBookmarkTags();
        
        return true;
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
    
    return false;
  }
  
  async loadBookmarkTags() {
    try {
      const result = await chrome.storage.local.get('tagDatabase');
      if (result.tagDatabase && result.tagDatabase.bookmarkTags) {
        this.bookmarkTags.clear();
        Object.entries(result.tagDatabase.bookmarkTags).forEach(([bookmarkId, tags]) => {
          this.bookmarkTags.set(bookmarkId, new Set(tags));
        });
      }
    } catch (error) {
      console.error('Error loading bookmark tags:', error);
    }
  }
  
  async addTag(tagName, color = null) {
    const normalizedTag = this.normalizeTagName(tagName);
    
    if (!normalizedTag || normalizedTag.length === 0) {
      throw new Error('Tag name cannot be empty');
    }
    
    if (this.tags.has(normalizedTag)) {
      // Tag already exists, update count if needed
      const existing = this.tags.get(normalizedTag);
      this.tags.set(normalizedTag, {
        ...existing,
        color: color || existing.color
      });
    } else {
      // Create new tag
      this.tags.set(normalizedTag, {
        count: 0,
        color: color || this.generateColor(normalizedTag),
        createdAt: Date.now()
      });
    }
    
    await this.saveTags();
    
    if (this.options.onTagAdded) {
      this.options.onTagAdded(normalizedTag, this.tags.get(normalizedTag));
    }
    
    return normalizedTag;
  }
  
  async removeTag(tagName) {
    const normalizedTag = this.normalizeTagName(tagName);
    
    if (!this.tags.has(normalizedTag)) {
      return false;
    }
    
    for (const [bookmarkId, tags] of this.bookmarkTags.entries()) {
      if (tags.has(normalizedTag)) {
        await this.removeTagFromBookmark(bookmarkId, normalizedTag, false);
      }
    }
    
    this.tags.delete(normalizedTag);
    await this.saveTags();
    
    if (this.options.onTagRemoved) {
      this.options.onTagRemoved(normalizedTag);
    }
    
    return true;
  }
  
  async updateTag(oldName, newName, newColor = null) {
    const normalizedOld = this.normalizeTagName(oldName);
    const normalizedNew = this.normalizeTagName(newName);
    
    if (!this.tags.has(normalizedOld)) {
      throw new Error(`Tag "${oldName}" not found`);
    }
    
    if (normalizedOld === normalizedNew && !newColor) {
      return; // Nothing to update
    }
    
    const oldTagData = this.tags.get(normalizedOld);
    
    if (normalizedOld !== normalizedNew) {
      // Rename tag - update all bookmarks
      for (const [bookmarkId, tags] of this.bookmarkTags.entries()) {
        if (tags.has(normalizedOld)) {
          tags.delete(normalizedOld);
          tags.add(normalizedNew);
          
          // Update in background
          await chrome.runtime.sendMessage({
            type: 'REMOVE_TAG',
            bookmarkId,
            tag: normalizedOld
          });
          
          await chrome.runtime.sendMessage({
            type: 'ADD_TAG',
            bookmarkId,
            tag: normalizedNew
          });
        }
      }
      
      // Remove old tag and create new one
      this.tags.delete(normalizedOld);
    }
    
    // Create/update tag with new data
    this.tags.set(normalizedNew, {
      count: oldTagData.count,
      color: newColor || oldTagData.color,
      createdAt: oldTagData.createdAt
    });
    
    await this.saveTags();
    
    if (this.options.onTagUpdated) {
      this.options.onTagUpdated(normalizedOld, normalizedNew, this.tags.get(normalizedNew));
    }
    
    return normalizedNew;
  }
  
  async addTagToBookmark(bookmarkId, tagName) {
    const normalizedTag = this.normalizeTagName(tagName);
    
    // Ensure tag exists
    if (!this.tags.has(normalizedTag)) {
      await this.addTag(normalizedTag);
    }
    
    // Add to bookmark
    if (!this.bookmarkTags.has(bookmarkId)) {
      this.bookmarkTags.set(bookmarkId, new Set());
    }
    
    const bookmarkTags = this.bookmarkTags.get(bookmarkId);
    
    if (!bookmarkTags.has(normalizedTag)) {
      bookmarkTags.add(normalizedTag);
      
      // Update tag count
      const tagData = this.tags.get(normalizedTag);
      this.tags.set(normalizedTag, {
        ...tagData,
        count: (tagData.count || 0) + 1
      });
      
      // Save to storage
      await this.saveTags();
      
      // Notify background
      await chrome.runtime.sendMessage({
        type: 'ADD_TAG',
        bookmarkId,
        tag: normalizedTag
      });
      
      return true;
    }
    
    return false;
  }
  
  async removeTagFromBookmark(bookmarkId, tagName, updateCount = true) {
    const normalizedTag = this.normalizeTagName(tagName);
    
    if (!this.bookmarkTags.has(bookmarkId)) {
      return false;
    }
    
    const bookmarkTags = this.bookmarkTags.get(bookmarkId);
    
    if (bookmarkTags.has(normalizedTag)) {
      bookmarkTags.delete(normalizedTag);
      
      if (updateCount) {
        // Update tag count
        const tagData = this.tags.get(normalizedTag);
        if (tagData) {
          const newCount = Math.max(0, (tagData.count || 0) - 1);
          
          if (newCount === 0) {
            // Remove tag if no bookmarks use it
            this.tags.delete(normalizedTag);
          } else {
            this.tags.set(normalizedTag, {
              ...tagData,
              count: newCount
            });
          }
        }
      }
      
      // Save to storage
      await this.saveTags();
      
      // Notify background
      await chrome.runtime.sendMessage({
        type: 'REMOVE_TAG',
        bookmarkId,
        tag: normalizedTag
      });
      
      return true;
    }
    
    return false;
  }
  
  async setBookmarkTags(bookmarkId, tags) {
    const normalizedTags = tags.map(tag => this.normalizeTagName(tag)).filter(tag => tag.length > 0);
    
    // Get current tags
    const currentTags = this.bookmarkTags.get(bookmarkId) || new Set();
    
    // Tags to add
    const tagsToAdd = normalizedTags.filter(tag => !currentTags.has(tag));
    
    // Tags to remove
    const tagsToRemove = Array.from(currentTags).filter(tag => !normalizedTags.includes(tag));
    
    // Process additions
    for (const tag of tagsToAdd) {
      await this.addTagToBookmark(bookmarkId, tag);
    }
    
    // Process removals
    for (const tag of tagsToRemove) {
      await this.removeTagFromBookmark(bookmarkId, tag);
    }
    
    return true;
  }
  
  getBookmarkTags(bookmarkId) {
    const tags = this.bookmarkTags.get(bookmarkId);
    return tags ? Array.from(tags) : [];
  }
  
  getAllTags() {
    return Array.from(this.tags.entries()).map(([name, data]) => ({
      name,
      count: data.count || 0,
      color: data.color,
      createdAt: data.createdAt
    }));
  }
  
  getPopularTags(limit = 10) {
    const allTags = this.getAllTags();
    return allTags
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  getRecentTags(limit = 10) {
    const allTags = this.getAllTags();
    return allTags
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
  
  searchTags(query) {
    const searchTerm = query.toLowerCase();
    return this.getAllTags().filter(tag => 
      tag.name.toLowerCase().includes(searchTerm)
    );
  }
  
  getTagColor(tagName) {
    const normalizedTag = this.normalizeTagName(tagName);
    const tagData = this.tags.get(normalizedTag);
    return tagData ? tagData.color : this.generateColor(normalizedTag);
  }
  
  async saveTags() {
    // Convert Maps to objects for storage
    const tagsObj = {};
    this.tags.forEach((data, name) => {
      tagsObj[name] = data;
    });
    
    const bookmarkTagsObj = {};
    this.bookmarkTags.forEach((tags, bookmarkId) => {
      bookmarkTagsObj[bookmarkId] = Array.from(tags);
    });
    
    await chrome.storage.local.set({
      tagDatabase: {
        tags: tagsObj,
        bookmarkTags: bookmarkTagsObj,
        updatedAt: Date.now()
      }
    });
  }
  
  normalizeTagName(tagName) {
    return tagName.trim().toLowerCase();
  }
  
  generateColor(tagName) {
    // Generate consistent color based on tag name hash
    const colors = [
      '#4f46e5', '#7c3aed', '#a855f7', // Purple
      '#3b82f6', '#0ea5e9', '#06b6d4', // Blue
      '#10b981', '#22c55e', '#84cc16', // Green
      '#f59e0b', '#f97316', '#ef4444'  // Orange/Red
    ];
    
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // UI Helper Methods
  
  renderTagList(container, options = {}) {
    if (!container) return;
    
    const {
      showCount = true,
      clickable = true,
      selectedTags = new Set(),
      onTagClick = null,
      maxTags = null
    } = options;
    
    const tags = this.getAllTags();
    const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
    
    const html = displayTags.map(tag => {
      const isSelected = selectedTags.has(tag.name);
      
      return `
        <div class="tag-item ${isSelected ? 'selected' : ''}" 
             data-tag="${this.escapeHtml(tag.name)}"
             style="--tag-color: ${tag.color}">
          <span class="tag-name">${this.escapeHtml(tag.name)}</span>
          ${showCount ? `<span class="tag-count">${tag.count}</span>` : ''}
        </div>
      `;
    }).join('');
    
    container.innerHTML = html || '<div class="no-tags">No tags yet</div>';
    
    if (clickable) {
      container.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', () => {
          const tag = item.dataset.tag;
          
          if (onTagClick) {
            onTagClick(tag);
          }
        });
      });
    }
  }
  
  renderTagInput(container, options = {}) {
    if (!container) return;
    
    const {
      placeholder = 'Add tags...',
      value = '',
      onInput = null,
      onKeyDown = null,
      suggestions = true
    } = options;
    
    container.innerHTML = `
      <div class="tag-input-container">
        <div class="tag-input-tags"></div>
        <input type="text" 
               class="tag-input" 
               placeholder="${placeholder}"
               value="${this.escapeHtml(value)}">
        ${suggestions ? '<div class="tag-suggestions"></div>' : ''}
      </div>
    `;
    
    const input = container.querySelector('.tag-input');
    const tagsContainer = container.querySelector('.tag-input-tags');
    const suggestionsContainer = container.querySelector('.tag-suggestions');
    
    if (onInput && input) {
      input.addEventListener('input', (e) => {
        onInput(e.target.value);
        
        if (suggestions && suggestionsContainer) {
          this.renderTagSuggestions(suggestionsContainer, e.target.value);
        }
      });
    }
    
    if (onKeyDown && input) {
      input.addEventListener('keydown', (e) => {
        onKeyDown(e);
      });
    }
    
    if (suggestions && suggestionsContainer) {
      input.addEventListener('focus', () => {
        this.renderTagSuggestions(suggestionsContainer, input.value);
        suggestionsContainer.style.display = 'block';
      });
      
      input.addEventListener('blur', () => {
        setTimeout(() => {
          suggestionsContainer.style.display = 'none';
        }, 200);
      });
    }
  }
  
  renderTagSuggestions(container, query) {
    if (!container) return;
    
    const suggestions = this.searchTags(query).slice(0, 5);
    
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="no-suggestions">No matching tags</div>';
      return;
    }
    
    const html = suggestions.map(tag => `
      <div class="tag-suggestion" data-tag="${this.escapeHtml(tag.name)}">
        <span class="tag-color" style="background-color: ${tag.color}"></span>
        <span class="tag-name">${this.escapeHtml(tag.name)}</span>
        <span class="tag-count">${tag.count}</span>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    container.querySelectorAll('.tag-suggestion').forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const tag = suggestion.dataset.tag;
        
        // Trigger event on parent container
        const event = new CustomEvent('tagsuggestionselected', {
          detail: { tag }
        });
        container.dispatchEvent(event);
      });
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TagManager;
}