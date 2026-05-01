// Batch Manager Component
// Provides batch operations for bookmarks

class BatchManager {
  constructor(options = {}) {
    this.options = {
      maxBatchSize: 100,
      batchDelay: 100, // ms between operations
      onProgress: null,
      onComplete: null,
      onError: null,
      ...options
    };
    
    this.selectedBookmarks = new Set();
    this.isProcessing = false;
    this.currentOperation = null;
  }
  
  // Selection management
  
  selectBookmark(bookmarkId) {
    this.selectedBookmarks.add(bookmarkId);
    return this.getSelectedCount();
  }
  
  deselectBookmark(bookmarkId) {
    this.selectedBookmarks.delete(bookmarkId);
    return this.getSelectedCount();
  }
  
  toggleSelection(bookmarkId) {
    if (this.selectedBookmarks.has(bookmarkId)) {
      this.deselectBookmark(bookmarkId);
    } else {
      this.selectBookmark(bookmarkId);
    }
    return this.getSelectedCount();
  }
  
  selectAll(bookmarks) {
    this.selectedBookmarks.clear();
    bookmarks.forEach(bookmark => {
      if (bookmark.url) { // Only select actual bookmarks, not folders
        this.selectedBookmarks.add(bookmark.id);
      }
    });
    return this.getSelectedCount();
  }
  
  deselectAll() {
    const count = this.getSelectedCount();
    this.selectedBookmarks.clear();
    return count;
  }
  
  getSelectedIds() {
    return Array.from(this.selectedBookmarks);
  }
  
  getSelectedCount() {
    return this.selectedBookmarks.size;
  }
  
  hasSelection() {
    return this.selectedBookmarks.size > 0;
  }
  
  // Batch operations
  
  async moveSelectedToFolder(folderId, _bookmarksData = []) {
    if (!this.hasSelection()) {
      throw new Error('No bookmarks selected');
    }
    
    const selectedIds = this.getSelectedIds();
    this.currentOperation = {
      type: 'move',
      folderId,
      total: selectedIds.length,
      completed: 0,
      failed: 0
    };
    
    this.isProcessing = true;
    
    if (this.options.onProgress) {
      this.options.onProgress(this.currentOperation);
    }
    
    const results = [];
    
    for (let i = 0; i < selectedIds.length; i++) {
      const bookmarkId = selectedIds[i];
      
      try {
        const result = await this.moveBookmark(bookmarkId, folderId, i);
        results.push({ success: true, id: bookmarkId, result });
        this.currentOperation.completed++;
      } catch (error) {
        results.push({ success: false, id: bookmarkId, error: error.message });
        this.currentOperation.failed++;
      }
      
      if (this.options.onProgress) {
        this.options.onProgress(this.currentOperation);
      }
      
      // Small delay to avoid rate limiting
      if (i < selectedIds.length - 1) {
        await this.delay(this.options.batchDelay);
      }
    }
    
    this.isProcessing = false;
    
    if (this.options.onComplete) {
      this.options.onComplete(this.currentOperation, results);
    }
    
    return results;
  }
  
  async addTagsToSelected(tags, _bookmarksData = []) {
    if (!this.hasSelection()) {
      throw new Error('No bookmarks selected');
    }
    
    if (!tags || tags.length === 0) {
      throw new Error('No tags provided');
    }
    
    const selectedIds = this.getSelectedIds();
    
    this.currentOperation = {
      type: 'addTags',
      tags,
      total: selectedIds.length,
      completed: 0,
      failed: 0
    };
    
    this.isProcessing = true;
    
    if (this.options.onProgress) {
      this.options.onProgress(this.currentOperation);
    }
    
    const results = [];
    
    for (let i = 0; i < selectedIds.length; i++) {
      const bookmarkId = selectedIds[i];
      
      try {
        // Add each tag
        const tagResults = [];
        for (const tag of tags) {
          await this.addTagToBookmark(bookmarkId, tag);
          tagResults.push({ tag, success: true });
        }
        
        results.push({ success: true, id: bookmarkId, results: tagResults });
        this.currentOperation.completed++;
      } catch (error) {
        results.push({ success: false, id: bookmarkId, error: error.message });
        this.currentOperation.failed++;
      }
      
      if (this.options.onProgress) {
        this.options.onProgress(this.currentOperation);
      }
      
      if (i < selectedIds.length - 1) {
        await this.delay(this.options.batchDelay);
      }
    }
    
    this.isProcessing = false;
    
    if (this.options.onComplete) {
      this.options.onComplete(this.currentOperation, results);
    }
    
    return results;
  }
  
  async removeTagsFromSelected(tags, _bookmarksData = []) {
    if (!this.hasSelection()) {
      throw new Error('No bookmarks selected');
    }
    
    if (!tags || tags.length === 0) {
      throw new Error('No tags provided');
    }
    
    const selectedIds = this.getSelectedIds();
    
    this.currentOperation = {
      type: 'removeTags',
      tags,
      total: selectedIds.length,
      completed: 0,
      failed: 0
    };
    
    this.isProcessing = true;
    
    if (this.options.onProgress) {
      this.options.onProgress(this.currentOperation);
    }
    
    const results = [];
    
    for (let i = 0; i < selectedIds.length; i++) {
      const bookmarkId = selectedIds[i];
      
      try {
        const tagResults = [];
        for (const tag of tags) {
          await this.removeTagFromBookmark(bookmarkId, tag);
          tagResults.push({ tag, success: true });
        }
        
        results.push({ success: true, id: bookmarkId, results: tagResults });
        this.currentOperation.completed++;
      } catch (error) {
        results.push({ success: false, id: bookmarkId, error: error.message });
        this.currentOperation.failed++;
      }
      
      if (this.options.onProgress) {
        this.options.onProgress(this.currentOperation);
      }
      
      if (i < selectedIds.length - 1) {
        await this.delay(this.options.batchDelay);
      }
    }
    
    this.isProcessing = false;
    
    if (this.options.onComplete) {
      this.options.onComplete(this.currentOperation, results);
    }
    
    return results;
  }
  
  async deleteSelected(_bookmarksData = []) {
    if (!this.hasSelection()) {
      throw new Error('No bookmarks selected');
    }
    
    const selectedIds = this.getSelectedIds();
    // Confirm deletion
    const confirmed = confirm(`Delete ${selectedIds.length} selected bookmark${selectedIds.length > 1 ? 's' : ''}?`);
    if (!confirmed) {
      return [];
    }
    
    this.currentOperation = {
      type: 'delete',
      total: selectedIds.length,
      completed: 0,
      failed: 0
    };
    
    this.isProcessing = true;
    
    if (this.options.onProgress) {
      this.options.onProgress(this.currentOperation);
    }
    
    const results = [];
    
    for (let i = 0; i < selectedIds.length; i++) {
      const bookmarkId = selectedIds[i];
      
      try {
        const result = await this.deleteBookmark(bookmarkId);
        results.push({ success: true, id: bookmarkId, result });
        this.currentOperation.completed++;
      } catch (error) {
        results.push({ success: false, id: bookmarkId, error: error.message });
        this.currentOperation.failed++;
      }
      
      if (this.options.onProgress) {
        this.options.onProgress(this.currentOperation);
      }
      
      if (i < selectedIds.length - 1) {
        await this.delay(this.options.batchDelay);
      }
    }
    
    this.isProcessing = false;
    
    // Clear selection after deletion
    this.deselectAll();
    
    if (this.options.onComplete) {
      this.options.onComplete(this.currentOperation, results);
    }
    
    return results;
  }
  
  async exportSelected(format = 'json', bookmarksData = []) {
    if (!this.hasSelection()) {
      throw new Error('No bookmarks selected');
    }
    
    const selectedIds = this.getSelectedIds();
    const selectedBookmarks = bookmarksData.filter(b => selectedIds.includes(b.id));
    
    let exportData;
    
    switch (format) {
      case 'json':
        exportData = this.exportAsJSON(selectedBookmarks);
        break;
      case 'html':
        exportData = this.exportAsHTML(selectedBookmarks);
        break;
      case 'csv':
        exportData = this.exportAsCSV(selectedBookmarks);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return exportData;
  }
  
  // Individual operation methods (delegated to background)
  
  async moveBookmark(bookmarkId, folderId, index = 0) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'MOVE_BOOKMARK',
        id: bookmarkId,
        parentId: folderId,
        index
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to move bookmark');
      }
      
      return response;
    } catch (error) {
      throw new Error(`Error moving bookmark ${bookmarkId}: ${error.message}`);
    }
  }
  
  async addTagToBookmark(bookmarkId, tag) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_TAG',
        bookmarkId,
        tag
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to add tag');
      }
      
      return response;
    } catch (error) {
      throw new Error(`Error adding tag to bookmark ${bookmarkId}: ${error.message}`);
    }
  }
  
  async removeTagFromBookmark(bookmarkId, tag) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_TAG',
        bookmarkId,
        tag
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove tag');
      }
      
      return response;
    } catch (error) {
      throw new Error(`Error removing tag from bookmark ${bookmarkId}: ${error.message}`);
    }
  }
  
  async deleteBookmark(bookmarkId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_BOOKMARK',
        id: bookmarkId
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete bookmark');
      }
      
      return response;
    } catch (error) {
      throw new Error(`Error deleting bookmark ${bookmarkId}: ${error.message}`);
    }
  }
  
  // Export methods
  
  exportAsJSON(bookmarks) {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: bookmarks.length,
      bookmarks: bookmarks.map(bookmark => ({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        tags: bookmark.tags || [],
        dateAdded: bookmark.dateAdded,
        parentId: bookmark.parentId
      }))
    };
    
    return {
      format: 'json',
      data: JSON.stringify(exportData, null, 2),
      filename: `bookmarks-export-${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    };
  }
  
  exportAsHTML(bookmarks) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bookmarks Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .bookmark { margin: 10px 0; padding: 10px; border-left: 3px solid #4f46e5; }
    .title { font-weight: bold; font-size: 16px; }
    .url { color: #666; font-size: 14px; margin: 5px 0; }
    .tags { margin-top: 5px; }
    .tag { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 5px; }
  </style>
</head>
<body>
  <h1>Bookmarks Export (${bookmarks.length} items)</h1>
  <p>Exported on ${new Date().toLocaleString()}</p>
  
  ${bookmarks.map(bookmark => `
    <div class="bookmark">
      <div class="title">${this.escapeHtml(bookmark.title)}</div>
      <div class="url"><a href="${this.escapeHtml(bookmark.url)}" target="_blank">${this.escapeHtml(bookmark.url)}</a></div>
      ${bookmark.tags && bookmark.tags.length > 0 ? `
        <div class="tags">
          ${bookmark.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;
    
    return {
      format: 'html',
      data: html,
      filename: `bookmarks-export-${new Date().toISOString().split('T')[0]}.html`,
      mimeType: 'text/html'
    };
  }
  
  exportAsCSV(bookmarks) {
    const headers = ['Title', 'URL', 'Tags', 'Date Added'];
    const rows = bookmarks.map(bookmark => [
      `"${(bookmark.title || '').replace(/"/g, '""')}"`,
      `"${(bookmark.url || '').replace(/"/g, '""')}"`,
      `"${(bookmark.tags || []).join(', ').replace(/"/g, '""')}"`,
      `"${bookmark.dateAdded ? new Date(bookmark.dateAdded).toISOString() : ''}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    return {
      format: 'csv',
      data: csv,
      filename: `bookmarks-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    };
  }
  
  // Download export
  
  downloadExport(exportData) {
    const blob = new Blob([exportData.data], { type: exportData.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // UI Helper Methods
  
  renderBatchActions(container, options = {}) {
    if (!container) {return;}
    
    const {
      showMove = true,
      showTag = true,
      showDelete = true,
      showExport = true,
      onMoveClick = null,
      onTagClick = null,
      onDeleteClick = null,
      onExportClick = null
    } = options;
    
    const selectedCount = this.getSelectedCount();
    
    const html = `
      <div class="batch-actions ${selectedCount > 0 ? 'has-selection' : ''}">
        <div class="batch-info">
          <span class="selected-count">${selectedCount} selected</span>
        </div>
        <div class="batch-buttons">
          ${showMove ? `
            <button class="batch-btn move-btn" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fas fa-folder"></i> Move
            </button>
          ` : ''}
          ${showTag ? `
            <button class="batch-btn tag-btn" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fas fa-tag"></i> Tag
            </button>
          ` : ''}
          ${showDelete ? `
            <button class="batch-btn delete-btn" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fas fa-trash"></i> Delete
            </button>
          ` : ''}
          ${showExport ? `
            <button class="batch-btn export-btn" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fas fa-download"></i> Export
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Attach event listeners
    if (showMove) {
      const moveBtn = container.querySelector('.move-btn');
      if (moveBtn) {
        moveBtn.addEventListener('click', () => {
          if (selectedCount > 0 && onMoveClick) {
            onMoveClick(this.getSelectedIds());
          }
        });
      }
    }
    
    if (showTag) {
      const tagBtn = container.querySelector('.tag-btn');
      if (tagBtn) {
        tagBtn.addEventListener('click', () => {
          if (selectedCount > 0 && onTagClick) {
            onTagClick(this.getSelectedIds());
          }
        });
      }
    }
    
    if (showDelete) {
      const deleteBtn = container.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (selectedCount > 0 && onDeleteClick) {
            onDeleteClick(this.getSelectedIds());
          }
        });
      }
    }
    
    if (showExport) {
      const exportBtn = container.querySelector('.export-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          if (selectedCount > 0 && onExportClick) {
            onExportClick(this.getSelectedIds());
          }
        });
      }
    }
  }
  
  renderProgress(container, operation) {
    if (!container || !operation) {return;}
    
    const percent = Math.round((operation.completed / operation.total) * 100);
    
    const html = `
      <div class="batch-progress">
        <div class="progress-header">
          <span class="progress-title">${this.getOperationTitle(operation.type)}</span>
          <span class="progress-count">${operation.completed}/${operation.total}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="progress-details">
          ${operation.failed > 0 ? `
            <span class="progress-failed">${operation.failed} failed</span>
          ` : ''}
          <span class="progress-percent">${percent}%</span>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  getOperationTitle(type) {
    const titles = {
      move: 'Moving bookmarks',
      addTags: 'Adding tags',
      removeTags: 'Removing tags',
      delete: 'Deleting bookmarks',
      export: 'Exporting bookmarks'
    };
    
    return titles[type] || 'Processing';
  }
  
  // Utility methods
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    this.selectedBookmarks.clear();
    this.isProcessing = false;
    this.currentOperation = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchManager;
}
