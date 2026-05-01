// Drag Manager Component
// Provides drag-and-drop functionality for bookmarks

class DragManager {
  constructor(options = {}) {
    this.options = {
      dragHandleSelector: '.drag-handle',
      draggableSelector: '.draggable',
      dropZoneSelector: '.drop-zone',
      onDragStart: null,
      onDragEnd: null,
      onDrop: null,
      ...options
    };
    
    this.isDragging = false;
    this.dragSource = null;
    this.dragData = null;
    this.dropTarget = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile
    document.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  enableForElement(element, data = {}) {
    if (!element) {return;}
    
    element.classList.add('draggable');
    element.setAttribute('draggable', 'true');
    element.dataset.dragData = JSON.stringify(data);
    
    element.addEventListener('dragstart', this.handleDragStart.bind(this));
    element.addEventListener('dragend', this.handleDragEnd.bind(this));
  }
  
  enableAsDropZone(element, options = {}) {
    if (!element) {return;}
    
    element.classList.add('drop-zone');
    
    element.addEventListener('dragover', this.handleDragOver.bind(this));
    element.addEventListener('dragenter', this.handleDragEnter.bind(this));
    element.addEventListener('dragleave', this.handleDragLeave.bind(this));
    element.addEventListener('drop', this.handleDrop.bind(this));
    
    element.dataset.dropOptions = JSON.stringify(options);
  }
  
  // Mouse-based drag (fallback)
  
  handleMouseDown(e) {
    const draggable = e.target.closest(this.options.draggableSelector);
    if (!draggable) {return;}
    
    this.isDragging = true;
    this.dragSource = draggable;
    
    try {
      this.dragData = JSON.parse(draggable.dataset.dragData || '{}');
    } catch {
      this.dragData = {};
    }
    
    // Add dragging class
    draggable.classList.add('dragging');
    
    // Create drag image
    this.createDragImage(draggable, e);
    
    if (this.options.onDragStart) {
      this.options.onDragStart(this.dragData, draggable);
    }
    
    e.preventDefault();
  }
  
  handleMouseMove(e) {
    if (!this.isDragging) {return;}
    
    if (this.dragImage) {
      this.dragImage.style.left = e.clientX + 10 + 'px';
      this.dragImage.style.top = e.clientY + 10 + 'px';
    }
    
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const dropZone = elements.find(el => el.classList.contains('drop-zone'));
    
    this.updateDropTarget(dropZone);
    
    e.preventDefault();
  }
  
  handleMouseUp(e) {
    if (!this.isDragging) {return;}
    
    this.isDragging = false;
    
    this.removeDragImage();
    
    if (this.dragSource) {
      this.dragSource.classList.remove('dragging');
    }
    
    if (this.dropTarget) {
      this.handleDropEvent(this.dragSource, this.dropTarget, this.dragData);
    }
    
    this.dragSource = null;
    this.dragData = null;
    this.dropTarget = null;
    
    if (this.options.onDragEnd) {
      this.options.onDragEnd();
    }
    
    e.preventDefault();
  }
  
  // Touch events
  
  handleTouchStart(e) {
    if (e.touches.length !== 1) {return;}
    
    const touch = e.touches[0];
    const draggable = document.elementFromPoint(touch.clientX, touch.clientY)
      .closest(this.options.draggableSelector);
    
    if (!draggable) {return;}
    
    this.isDragging = true;
    this.dragSource = draggable;
    
    try {
      this.dragData = JSON.parse(draggable.dataset.dragData || '{}');
    } catch {
      this.dragData = {};
    }
    
    draggable.classList.add('dragging');
    
    this.createDragImage(draggable, { clientX: touch.clientX, clientY: touch.clientY });
    
    if (this.options.onDragStart) {
      this.options.onDragStart(this.dragData, draggable);
    }
    
    e.preventDefault();
  }
  
  handleTouchMove(e) {
    if (!this.isDragging || e.touches.length !== 1) {return;}
    
    const touch = e.touches[0];
    
    if (this.dragImage) {
      this.dragImage.style.left = touch.clientX + 10 + 'px';
      this.dragImage.style.top = touch.clientY + 10 + 'px';
    }
    
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const dropZone = elements.find(el => el.classList.contains('drop-zone'));
    
    this.updateDropTarget(dropZone);
    
    e.preventDefault();
  }
  
  handleTouchEnd(e) {
    if (!this.isDragging) {return;}
    
    this.isDragging = false;
    this.removeDragImage();
    
    if (this.dragSource) {
      this.dragSource.classList.remove('dragging');
    }
    
    if (this.dropTarget) {
      this.handleDropEvent(this.dragSource, this.dropTarget, this.dragData);
    }
    
    this.dragSource = null;
    this.dragData = null;
    this.dropTarget = null;
    
    if (this.options.onDragEnd) {
      this.options.onDragEnd();
    }
    
    e.preventDefault();
  }
  
  // HTML5 Drag and Drop API
  
  handleDragStart(e) {
    const draggable = e.target;
    
    try {
      const dragData = JSON.parse(draggable.dataset.dragData || '{}');
      
      // Set drag data
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';
      
      // Add visual feedback
      draggable.classList.add('dragging');
      
      if (this.options.onDragStart) {
        this.options.onDragStart(dragData, draggable);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
  }
  
  handleDragEnd(e) {
    const draggable = e.target;
    draggable.classList.remove('dragging');
    
    if (this.options.onDragEnd) {
      this.options.onDragEnd();
    }
  }
  
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  handleDragEnter(e) {
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (dropZone) {
      dropZone.classList.add('drag-over');
      this.dropTarget = dropZone;
    }
  }
  
  handleDragLeave(e) {
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
      this.dropTarget = null;
    }
  }
  
  handleDrop(e) {
    e.preventDefault();
    
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (!dropZone) {return;}
    
    dropZone.classList.remove('drag-over');
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      this.handleDropEvent(null, dropZone, dragData);
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  }
  
  // Helper methods
  
  createDragImage(element, position) {
    // Create a clone of the element as drag image
    const clone = element.cloneNode(true);
    clone.id = 'drag-image';
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.8';
    clone.style.transform = 'scale(0.9)';
    clone.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
    clone.style.left = position.clientX + 10 + 'px';
    clone.style.top = position.clientY + 10 + 'px';
    clone.style.width = element.offsetWidth + 'px';
    
    document.body.appendChild(clone);
    this.dragImage = clone;
  }
  
  removeDragImage() {
    if (this.dragImage && this.dragImage.parentNode) {
      this.dragImage.parentNode.removeChild(this.dragImage);
    }
    this.dragImage = null;
  }
  
  updateDropTarget(newTarget) {
    // Remove old target highlight
    if (this.dropTarget && this.dropTarget !== newTarget) {
      this.dropTarget.classList.remove('drag-over');
    }
    
    // Add new target highlight
    if (newTarget && newTarget !== this.dropTarget) {
      newTarget.classList.add('drag-over');
    }
    
    this.dropTarget = newTarget;
  }
  
  handleDropEvent(sourceElement, dropZone, dragData) {
    let dropOptions = {};
    try {
      dropOptions = JSON.parse(dropZone.dataset.dropOptions || '{}');
    } catch {
      dropOptions = {};
    }
    
    if (this.options.onDrop) {
      this.options.onDrop(dragData, dropZone, dropOptions, sourceElement);
    }
  }
  
  // Bookmark-specific drag methods
  
  enableBookmarkDrag(bookmarkElement, bookmarkData) {
    if (!bookmarkElement) {return;}
    
    const dragData = {
      type: 'bookmark',
      id: bookmarkData.id,
      title: bookmarkData.title,
      url: bookmarkData.url,
      parentId: bookmarkData.parentId,
      index: bookmarkData.index
    };
    
    this.enableForElement(bookmarkElement, dragData);
    
    // Add drag handle if not present
    if (!bookmarkElement.querySelector('.drag-handle')) {
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
      bookmarkElement.prepend(dragHandle);
    }
  }
  
  enableFolderDrop(folderElement, folderData) {
    if (!folderElement) {return;}
    
    const dropOptions = {
      type: 'folder',
      id: folderData.id,
      acceptTypes: ['bookmark', 'folder']
    };
    
    this.enableAsDropZone(folderElement, dropOptions);
    
    // Add drop indicator
    folderElement.classList.add('accepts-drops');
  }
  
  enableTrashDrop(trashElement) {
    if (!trashElement) {return;}
    
    const dropOptions = {
      type: 'trash',
      acceptTypes: ['bookmark', 'folder'],
      action: 'delete'
    };
    
    this.enableAsDropZone(trashElement, dropOptions);
  }
  
  // Move bookmark via API
  
  async moveBookmark(bookmarkId, destination) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'MOVE_BOOKMARK',
        id: bookmarkId,
        parentId: destination.parentId,
        index: destination.index || 0
      });
      
      return response.success;
    } catch (error) {
      console.error('Error moving bookmark:', error);
      return false;
    }
  }
  
  // Utility methods
  
  destroy() {
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    // Remove all drag images
    this.removeDragImage();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragManager;
}