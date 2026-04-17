// Bookmark Tree Component
// Provides hierarchical tree view of bookmarks with expand/collapse functionality

class BookmarkTree {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.options = {
      showFavicons: true,
      showTags: true,
      selectable: true,
      draggable: false,
      onSelect: null,
      onOpen: null,
      onEdit: null,
      onDelete: null,
      ...options
    };
    
    this.bookmarks = [];
    this.selectedIds = new Set();
    this.expandedFolders = new Set();
    this.eventListeners = new Map();
    
    this.init();
  }
  
  init() {
    this.renderLoading();
  }
  
  async loadBookmarks() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
      
      if (response.success) {
        this.bookmarks = response.data;
        this.render();
        return true;
      } else {
        this.renderError('Failed to load bookmarks');
        return false;
      }
    } catch (error) {
      this.renderError('Error loading bookmarks: ' + error.message);
      return false;
    }
  }
  
  render() {
    if (!this.bookmarks || this.bookmarks.length === 0) {
      this.renderEmpty();
      return;
    }
    
    // Build tree structure
    const tree = this.buildTreeStructure();
    
    // Render tree
    this.container.innerHTML = this.renderTreeNodes(tree);
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  buildTreeStructure() {
    // Create map of all items
    const items = new Map();
    this.bookmarks.forEach(bookmark => {
      items.set(bookmark.id, {
        ...bookmark,
        children: []
      });
    });
    
    // Build tree
    const rootNodes = [];
    
    items.forEach(item => {
      if (item.parentId === '0' || item.parentId === '1' || !items.has(item.parentId)) {
        // Root node or parent not found
        rootNodes.push(item);
      } else {
        // Add as child of parent
        const parent = items.get(item.parentId);
        if (parent) {
          parent.children.push(item);
        } else {
          // Parent not found, treat as root
          rootNodes.push(item);
        }
      }
    });
    
    // Sort children
    rootNodes.forEach(node => this.sortNodeChildren(node));
    
    return rootNodes;
  }
  
  sortNodeChildren(node) {
    if (node.children && node.children.length > 0) {
      // Sort folders first, then bookmarks
      node.children.sort((a, b) => {
        const aIsFolder = !a.url;
        const bIsFolder = !b.url;
        
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        
        // Both are same type, sort by title
        return a.title.localeCompare(b.title);
      });
      
      // Recursively sort children
      node.children.forEach(child => this.sortNodeChildren(child));
    }
  }
  
  renderTreeNodes(nodes, level = 0) {
    if (!nodes || nodes.length === 0) return '';
    
    return nodes.map(node => this.renderTreeNode(node, level)).join('');
  }
  
  renderTreeNode(node, level = 0) {
    const isFolder = !node.url;
    const isExpanded = this.expandedFolders.has(node.id);
    const isSelected = this.selectedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 20;
    
    let html = '';
    
    if (isFolder) {
      // Folder node
      html = `
        <div class="tree-folder ${isSelected ? 'selected' : ''}" 
             data-id="${node.id}" 
             data-type="folder"
             style="padding-left: ${indent}px;">
          <div class="folder-header">
            <span class="folder-toggle ${hasChildren ? '' : 'hidden'}">
              <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
            </span>
            <span class="folder-icon">
              <i class="fas fa-folder${isExpanded ? '-open' : ''}"></i>
            </span>
            <span class="folder-title">${this.escapeHtml(node.title)}</span>
            ${hasChildren ? `<span class="folder-count">${node.children.length}</span>` : ''}
            <span class="folder-actions">
              <button class="action-btn" data-action="add-bookmark" title="Add bookmark here">
                <i class="fas fa-plus"></i>
              </button>
              <button class="action-btn" data-action="edit-folder" title="Edit folder">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn" data-action="delete-folder" title="Delete folder">
                <i class="fas fa-trash"></i>
              </button>
            </span>
          </div>
          ${hasChildren && isExpanded ? `
            <div class="folder-children">
              ${this.renderTreeNodes(node.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Bookmark node
      const faviconUrl = node.url ? `chrome://favicon/${node.url}` : '';
      
      html = `
        <div class="tree-bookmark ${isSelected ? 'selected' : ''}" 
             data-id="${node.id}" 
             data-type="bookmark"
             style="padding-left: ${indent}px;">
          <div class="bookmark-content">
            ${this.options.selectable ? `
              <input type="checkbox" class="bookmark-checkbox" ${isSelected ? 'checked' : ''}>
            ` : ''}
            ${this.options.showFavicons && faviconUrl ? `
              <img src="${faviconUrl}" class="bookmark-favicon" alt="">
            ` : ''}
            <div class="bookmark-info">
              <div class="bookmark-title">${this.escapeHtml(node.title)}</div>
              <div class="bookmark-url">${this.escapeHtml(node.url || '')}</div>
              ${this.options.showTags && node.tags && node.tags.length > 0 ? `
                <div class="bookmark-tags">
                  ${node.tags.map(tag => `
                    <span class="tag-badge">${this.escapeHtml(tag)}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="bookmark-actions">
              <button class="action-btn" data-action="open" title="Open bookmark">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button class="action-btn" data-action="edit" title="Edit bookmark">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn" data-action="delete" title="Delete bookmark">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }
    
    return html;
  }
  
  renderLoading() {
    this.container.innerHTML = `
      <div class="tree-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading bookmarks...</span>
      </div>
    `;
  }
  
  renderEmpty() {
    this.container.innerHTML = `
      <div class="tree-empty">
        <i class="fas fa-bookmark"></i>
        <h3>No bookmarks found</h3>
        <p>You don't have any bookmarks yet, or your search returned no results.</p>
        <button class="btn-primary" id="add-first-bookmark">
          <i class="fas fa-plus"></i> Add Your First Bookmark
        </button>
      </div>
    `;
    
    // Add event listener for the button
    const button = this.container.querySelector('#add-first-bookmark');
    if (button) {
      button.addEventListener('click', () => {
        if (this.options.onAddBookmark) {
          this.options.onAddBookmark();
        }
      });
    }
  }
  
  renderError(message) {
    this.container.innerHTML = `
      <div class="tree-error">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Bookmarks</h3>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn-primary" id="retry-loading">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
    
    // Add event listener for retry button
    const button = this.container.querySelector('#retry-loading');
    if (button) {
      button.addEventListener('click', () => {
        this.loadBookmarks();
      });
    }
  }
  
  attachEventListeners() {
    this.removeEventListeners();
    
    // Folder toggle
    this.container.querySelectorAll('.folder-toggle').forEach(toggle => {
      this.addEventListener(toggle, 'click', (e) => {
        e.stopPropagation();
        const folder = e.target.closest('.tree-folder');
        const folderId = folder.dataset.id;
        
        if (this.expandedFolders.has(folderId)) {
          this.collapseFolder(folderId);
        } else {
          this.expandFolder(folderId);
        }
      });
    });
    
    // Selection
    if (this.options.selectable) {
      this.container.querySelectorAll('.bookmark-checkbox').forEach(checkbox => {
        this.addEventListener(checkbox, 'change', (e) => {
          const item = e.target.closest('[data-id]');
          const itemId = item.dataset.id;
          
          if (e.target.checked) {
            this.selectItem(itemId);
          } else {
            this.deselectItem(itemId);
          }
        });
      });
      
      // Click on item to select
      this.container.querySelectorAll('.tree-bookmark, .tree-folder').forEach(item => {
        this.addEventListener(item, 'click', (e) => {
          if (e.target.closest('.action-btn') || e.target.closest('.folder-toggle')) {
            return; // Don't select when clicking actions or toggle
          }
          
          const itemId = item.dataset.id;
          const checkbox = item.querySelector('.bookmark-checkbox');
          
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          } else {
            this.toggleSelection(itemId);
          }
        });
      });
    }
    
    // Actions
    this.container.querySelectorAll('.action-btn').forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        e.stopPropagation();
        const item = e.target.closest('[data-id]');
        const itemId = item.dataset.id;
        const action = button.dataset.action;
        
        this.handleAction(itemId, action);
      });
    });
  }
  
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    
    const key = `${element.dataset.id || 'global'}-${event}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({ element, event, handler });
  }
  
  removeEventListeners() {
    this.eventListeners.forEach((listeners, key) => {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventListeners.clear();
  }
  
  handleAction(itemId, action) {
    const item = this.findItemById(itemId);
    if (!item) return;
    
    switch (action) {
      case 'open':
        if (item.url) {
          chrome.tabs.create({ url: item.url });
        }
        if (this.options.onOpen) {
          this.options.onOpen(item);
        }
        break;
        
      case 'edit':
      case 'edit-folder':
        if (this.options.onEdit) {
          this.options.onEdit(item);
        }
        break;
        
      case 'delete':
      case 'delete-folder':
        if (confirm(`Delete "${item.title}"?`)) {
          if (this.options.onDelete) {
            this.options.onDelete(item);
          }
        }
        break;
        
      case 'add-bookmark':
        if (this.options.onAddBookmark) {
          this.options.onAddBookmark(item.id);
        }
        break;
    }
  }
  
  findItemById(id) {
    return this.bookmarks.find(b => b.id === id);
  }
  
  expandFolder(folderId) {
    this.expandedFolders.add(folderId);
    this.render();
  }
  
  collapseFolder(folderId) {
    this.expandedFolders.delete(folderId);
    this.render();
  }
  
  expandAll() {
    this.bookmarks.forEach(item => {
      if (!item.url) { // Folder
        this.expandedFolders.add(item.id);
      }
    });
    this.render();
  }
  
  collapseAll() {
    this.expandedFolders.clear();
    this.render();
  }
  
  selectItem(itemId) {
    this.selectedIds.add(itemId);
    if (this.options.onSelect) {
      this.options.onSelect(Array.from(this.selectedIds));
    }
  }
  
  deselectItem(itemId) {
    this.selectedIds.delete(itemId);
    if (this.options.onSelect) {
      this.options.onSelect(Array.from(this.selectedIds));
    }
  }
  
  toggleSelection(itemId) {
    if (this.selectedIds.has(itemId)) {
      this.deselectItem(itemId);
    } else {
      this.selectItem(itemId);
    }
  }
  
  selectAll() {
    this.bookmarks.forEach(item => {
      if (item.url) { // Only select bookmarks, not folders
        this.selectedIds.add(item.id);
      }
    });
    this.render();
    
    if (this.options.onSelect) {
      this.options.onSelect(Array.from(this.selectedIds));
    }
  }
  
  deselectAll() {
    this.selectedIds.clear();
    this.render();
    
    if (this.options.onSelect) {
      this.options.onSelect([]);
    }
  }
  
  getSelectedIds() {
    return Array.from(this.selectedIds);
  }
  
  getSelectedItems() {
    return this.bookmarks.filter(item => this.selectedIds.has(item.id));
  }
  
  filterBySearch(query) {
    if (!query) {
      this.render();
      return;
    }
    
    const filtered = this.bookmarks.filter(item => {
      const searchText = query.toLowerCase();
      
      // Search in title
      if (item.title.toLowerCase().includes(searchText)) {
        return true;
      }
      
      // Search in URL
      if (item.url && item.url.toLowerCase().includes(searchText)) {
        return true;
      }
      
      // Search in tags
      if (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchText))) {
        return true;
      }
      
      return false;
    });
    
    // Show filtered results
    const originalBookmarks = this.bookmarks;
    this.bookmarks = filtered;
    this.render();
    this.bookmarks = originalBookmarks;
  }
  
  filterByTag(tag) {
    if (!tag) {
      this.render();
      return;
    }
    
    const filtered = this.bookmarks.filter(item => {
      return item.tags && item.tags.includes(tag);
    });
    
    // Show filtered results
    const originalBookmarks = this.bookmarks;
    this.bookmarks = filtered;
    this.render();
    this.bookmarks = originalBookmarks;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    this.removeEventListeners();
    this.container.innerHTML = '';
  }
}

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookmarkTree;
}