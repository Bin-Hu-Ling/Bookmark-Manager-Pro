// Bookmark Manager Popup - Redesigned UI Logic
// Language manager (inlined for extension compatibility)
const languageManager = (() => {
  const languages = {
    en: {
      appTitle: "Bookmark Manager",
      refresh: "Refresh",
      settings: "Settings",
      language: "Language",
      toggleFullscreen: "Toggle fullscreen",
      searchPlaceholder: "Search bookmarks by name, URL, or tags...",
      clearSearch: "Clear search",
      filterByTag: "Filter by Tag:",
      filterByFolder: "Filter by Folder:",
      allTags: "All Tags",
      allFolders: "All Folders",
      tagsTitle: "Tags",
      addTag: "Add Tag",
      noTags: "No tags yet",
      foldersTitle: "Folders",
      statisticsTitle: "Statistics",
      totalBookmarks: "Total Bookmarks",
      totalFolders: "Total Folders",
      taggedBookmarks: "Tagged Bookmarks",
      untaggedBookmarks: "Untagged Bookmarks",
      bookmarksTitle: "Bookmarks",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      bulkEdit: "Bulk Edit",
      bulkEditTooltip: "Edit multiple bookmarks at once (select bookmarks first)",
      newBookmark: "New Bookmark",
      nameColumn: "Name",
      urlColumn: "URL",
      tagsColumn: "Tags",
      actionsColumn: "Actions",
      editBookmark: "Edit",
      deleteBookmark: "Delete",
      addTagToBookmark: "Add Tag",
      expand: "Expand",
      collapse: "Collapse",
      loadingBookmarks: "Loading bookmarks...",
      noBookmarks: "No bookmarks found",
      errorLoading: "Error loading bookmarks",
      bookmarksCount: "bookmarks",
      selectedCount: "selected",
      import: "Import",
      export: "Export",
      editBookmarkTitle: "Edit Bookmark",
      manageTagsTitle: "Manage Tags",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      nameLabel: "Name",
      urlLabel: "URL",
      tagsLabel: "Tags",
      folderLabel: "Folder",
      bookmarkSaved: "Bookmark saved successfully",
      bookmarkDeleted: "Bookmark deleted",
      tagAdded: "Tag added",
      tagRemoved: "Tag removed",
      errorSaving: "Error saving bookmark",
      errorDeleting: "Error deleting bookmark",
      invalidUrl: "Please enter a valid URL",
      nameRequired: "Name is required",
      switchToChinese: "Switch to Chinese",
      switchToEnglish: "Switch to English",
      currentLanguage: "English"
    },
    zh: {
      appTitle: "书签管理器",
      refresh: "刷新",
      settings: "设置",
      language: "语言",
      toggleFullscreen: "切换全屏",
      searchPlaceholder: "按名称、URL或标签搜索书签...",
      clearSearch: "清除搜索",
      filterByTag: "按标签筛选:",
      filterByFolder: "按文件夹筛选:",
      allTags: "所有标签",
      allFolders: "所有文件夹",
      tagsTitle: "标签",
      addTag: "添加标签",
      noTags: "暂无标签",
      foldersTitle: "文件夹",
      statisticsTitle: "统计",
      totalBookmarks: "书签总数",
      totalFolders: "文件夹总数",
      taggedBookmarks: "已标签书签",
      untaggedBookmarks: "未标签书签",
      bookmarksTitle: "书签",
      selectAll: "全选",
      deselectAll: "取消全选",
      bulkEdit: "批量编辑",
      bulkEditTooltip: "批量编辑多个书签（请先选择书签）",
      newBookmark: "新建书签",
      nameColumn: "名称",
      urlColumn: "网址",
      tagsColumn: "标签",
      actionsColumn: "操作",
      editBookmark: "编辑",
      deleteBookmark: "删除",
      addTagToBookmark: "添加标签",
      expand: "展开",
      collapse: "收起",
      loadingBookmarks: "正在加载书签...",
      noBookmarks: "未找到书签",
      errorLoading: "加载书签时出错",
      bookmarksCount: "个书签",
      selectedCount: "个已选",
      import: "导入",
      export: "导出",
      editBookmarkTitle: "编辑书签",
      manageTagsTitle: "管理标签",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      nameLabel: "名称",
      urlLabel: "网址",
      tagsLabel: "标签",
      folderLabel: "文件夹",
      bookmarkSaved: "书签保存成功",
      bookmarkDeleted: "书签已删除",
      tagAdded: "标签已添加",
      tagRemoved: "标签已移除",
      errorSaving: "保存书签时出错",
      errorDeleting: "删除书签时出错",
      invalidUrl: "请输入有效的网址",
      nameRequired: "名称不能为空",
      switchToChinese: "切换到中文",
      switchToEnglish: "切换到英文",
      currentLanguage: "中文"
    }
  };

  class LanguageManager {
    constructor() {
      this.currentLang = 'en';
      this.loadLanguage();
    }

    async loadLanguage() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['language']);
          if (result.language && languages[result.language]) {
            this.currentLang = result.language;
          }
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    }

    async setLanguage(lang) {
      if (languages[lang]) {
        this.currentLang = lang;
        try {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ language: lang });
            return true;
          }
        } catch (error) {
          console.error('Error saving language:', error);
          return false;
        }
      }
      return false;
    }

    getCurrentLanguage() {
      return this.currentLang;
    }

    t(key) {
      const langData = languages[this.currentLang];
      if (langData && langData[key]) {
        return langData[key];
      }
      // Fallback to English
      return languages.en[key] || key;
    }

    getSupportedLanguages() {
      return Object.keys(languages).map(code => ({
        code,
        name: code === 'en' ? 'English' : '中文',
        nativeName: code === 'en' ? 'English' : '中文'
      }));
    }

    async toggleLanguage() {
      const newLang = this.currentLang === 'en' ? 'zh' : 'en';
      const success = await this.setLanguage(newLang);
      if (success) {
        return newLang;
      }
      return this.currentLang;
    }
  }

  return new LanguageManager();
})();

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Bookmark Manager (Redesigned) popup loaded');
  
  // Initialize language
  await initializeLanguage();
  
  // Initialize UI components
  await initializeUI();
  
  // Load bookmarks
  await loadBookmarks();
  
  // Load tags
  await loadTags();
  
  // Load statistics
  await loadStatistics();
  
  // Setup event listeners
  setupEventListeners();
});

// ========== Language Initialization ==========

async function initializeLanguage() {
  updateUIText();
  updateLanguageButton();
}

function updateUIText() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const text = languageManager.t(key);
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = text;
    } else {
      element.textContent = text;
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = languageManager.t(key);
  });
  
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.title = languageManager.t(key);
  });
  
  const appTitle = document.getElementById('app-title');
  if (appTitle) {
    appTitle.textContent = languageManager.t('appTitle');
  }
}

function updateLanguageButton() {
  const languageBtn = document.getElementById('language-btn');
  const languageBadge = document.getElementById('current-language');
  
  if (languageBtn && languageBadge) {
    const currentLang = languageManager.getCurrentLanguage();
    languageBadge.textContent = currentLang === 'en' ? 'EN' : '中';
    languageBtn.title = languageManager.t('language') + ': ' + languageManager.t('currentLanguage');
  }
}

function updateSelectAllButtonText(button, isAllSelected) {
  if (!button) return;
  
  const key = isAllSelected ? 'deselectAll' : 'selectAll';
  const translatedText = languageManager.t(key);
  
  button.innerHTML = `<span data-i18n="${key}">${translatedText}</span>`;
}

// ========== State Management ==========

let state = {
  bookmarks: [],
  filteredBookmarks: [],
  tags: [],
  selectedTags: new Set(),
  selectedBookmarks: new Set(),
  searchQuery: '',
  currentFolder: null,
  statistics: null,
  settings: null
};

// ========== UI Initialization ==========

async function initializeUI() {
  // Load settings
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  if (response.success) {
    state.settings = response.data;
    applySettings();
  }
  
  // Load fullscreen preference
  const result = await chrome.storage.local.get(['fullscreenMode']);
  if (result.fullscreenMode) {
    const appContainer = document.querySelector('.app-container');
    const body = document.body;
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    
    if (appContainer && body && fullscreenToggle) {
      appContainer.classList.add('fullscreen');
      body.classList.add('fullscreen');
      fullscreenToggle.classList.add('fullscreen-active');
      fullscreenToggle.title = 'Exit fullscreen';
      
      const icon = fullscreenToggle.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-compress';
      }
      
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
    }
  }
  
  // Initialize UI elements
  updateBookmarkCount();
  updateSelectedCount();
}

function applySettings() {
  if (!state.settings) return;
  
  // Apply theme
  if (state.settings.theme === 'dark' || 
      (state.settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
  }
}

// ========== Bookmark Loading ==========

async function loadBookmarks() {
  showLoading(true);
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
    
    if (response.success) {
      state.bookmarks = response.data;
      state.filteredBookmarks = [...state.bookmarks];
      renderBookmarkTable();
      updateBookmarkCount();
      populateFolderFilter();
      renderFolderTree(); // 添加文件夹树渲染
    } else {
      showError('Failed to load bookmarks: ' + response.error);
    }
  } catch (error) {
    showError('Error loading bookmarks: ' + error.message);
  } finally {
    showLoading(false);
  }
}

async function refreshBookmarks() {
  await loadBookmarks();
  await loadTags();
  await loadStatistics();
}

// ========== Tag Management ==========

async function loadTags() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAGS' });
    
    if (response.success) {
      state.tags = response.data;
      renderTagList();
      updateTagFilters();
    }
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

async function addTagToBookmark(bookmarkId, tagName) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ADD_TAG',
      bookmarkId,
      tag: tagName
    });
    
    if (response.success) {
      await refreshBookmarks();
    }
  } catch (error) {
    console.error('Error adding tag:', error);
  }
}

async function removeTagFromBookmark(bookmarkId, tagName) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'REMOVE_TAG',
      bookmarkId,
      tag: tagName
    });
    
    if (response.success) {
      await refreshBookmarks();
    }
  } catch (error) {
    console.error('Error removing tag:', error);
  }
}

// ========== Bookmark Table Rendering ==========

function renderBookmarkTable() {
  const tableBody = document.getElementById('bookmarks-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (state.filteredBookmarks.length === 0) {
    renderEmptyState(tableBody);
    return;
  }
  
  // Group bookmarks by folder for mixed display
  const groupedBookmarks = groupBookmarksByFolder(state.filteredBookmarks);
  
  // Render each group
  Object.entries(groupedBookmarks).forEach(([folderId, bookmarks]) => {
    // Render folder row if not "all"
    if (folderId !== 'all') {
      const folder = bookmarks[0]?.parentId ? 
        state.bookmarks.find(b => b.id === bookmarks[0].parentId) : null;
      if (folder) {
        renderFolderRow(tableBody, folder, bookmarks.length);
      }
    }
    
    // Render bookmarks in this folder
    bookmarks.forEach(bookmark => {
      if (!bookmark.url) return; // Skip folders
      renderBookmarkRow(tableBody, bookmark);
    });
  });
}

function groupBookmarksByFolder(bookmarks) {
  const groups = {};
  
  bookmarks.forEach(bookmark => {
    const folderId = bookmark.parentId || 'all';
    if (!groups[folderId]) {
      groups[folderId] = [];
    }
    groups[folderId].push(bookmark);
  });
  
  return groups;
}

function renderFolderRow(tableBody, folder, count) {
  const row = document.createElement('tr');
  row.className = 'folder-row';
  row.dataset.folderId = folder.id;
  
  row.innerHTML = `
    <td class="checkbox-col">
      <input type="checkbox" class="folder-checkbox" data-id="${folder.id}">
    </td>
    <td class="name-col">
      <div class="folder-info">
        <i class="fas fa-folder"></i>
        <span class="folder-name">${escapeHtml(folder.title)}</span>
        <span class="folder-count">${count}</span>
      </div>
    </td>
    <td class="url-col"></td>
    <td class="tags-col"></td>
    <td class="actions-col">
      <button class="table-action-btn edit-folder" data-id="${folder.id}" title="Edit Folder">
        <i class="fas fa-edit"></i>
      </button>
      <button class="table-action-btn delete-folder" data-id="${folder.id}" title="Delete Folder">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  
  tableBody.appendChild(row);
}

function renderBookmarkRow(tableBody, bookmark) {
  const row = document.createElement('tr');
  row.className = 'bookmark-row';
  row.dataset.id = bookmark.id;
  
  if (state.selectedBookmarks.has(bookmark.id)) {
    row.classList.add('selected');
  }
  
  // Extract domain for favicon
  const domain = bookmark.url ? new URL(bookmark.url).hostname : '';
  
  // Create table cells
  const checkboxCell = document.createElement('td');
  checkboxCell.className = 'checkbox-col';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'bookmark-checkbox';
  checkbox.dataset.id = bookmark.id;
  if (state.selectedBookmarks.has(bookmark.id)) {
    checkbox.checked = true;
  }
  checkboxCell.appendChild(checkbox);
  
  const nameCell = document.createElement('td');
  nameCell.className = 'name-col';
  
  const bookmarkInfo = document.createElement('div');
  bookmarkInfo.className = 'bookmark-info';
  
  const favicon = document.createElement('img');
  favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  favicon.alt = '';
  favicon.className = 'bookmark-favicon';
  
  // Add error handler for favicon
  favicon.addEventListener('error', function() {
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%236b7280" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
  });
  
  const infoDiv = document.createElement('div');
  const titleDiv = document.createElement('div');
  titleDiv.className = 'bookmark-title';
  titleDiv.textContent = bookmark.title;
  
  const urlDiv = document.createElement('div');
  urlDiv.className = 'bookmark-url';
  urlDiv.textContent = bookmark.url;
  
  infoDiv.appendChild(titleDiv);
  infoDiv.appendChild(urlDiv);
  
  bookmarkInfo.appendChild(favicon);
  bookmarkInfo.appendChild(infoDiv);
  nameCell.appendChild(bookmarkInfo);
  
  const urlCell = document.createElement('td');
  urlCell.className = 'url-col';
  
  const urlLink = document.createElement('a');
  urlLink.href = bookmark.url;
  urlLink.target = '_blank';
  urlLink.className = 'bookmark-url-link';
  urlLink.textContent = bookmark.url;
  urlCell.appendChild(urlLink);
  
  const tagsCell = document.createElement('td');
  tagsCell.className = 'tags-col';
  
  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'bookmark-tags-cell';
  
  if (bookmark.tags && bookmark.tags.length > 0) {
    bookmark.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'table-tag';
      tagSpan.dataset.tag = tag;
      tagSpan.textContent = tag;
      tagsDiv.appendChild(tagSpan);
    });
  }
  tagsCell.appendChild(tagsDiv);
  
  const actionsCell = document.createElement('td');
  actionsCell.className = 'actions-col';
  
  const editButton = document.createElement('button');
  editButton.className = 'table-action-btn edit-bookmark';
  editButton.dataset.id = bookmark.id;
  editButton.title = 'Edit Bookmark';
  
  const editIcon = document.createElement('i');
  editIcon.className = 'fas fa-edit';
  editButton.appendChild(editIcon);
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'table-action-btn delete-bookmark';
  deleteButton.dataset.id = bookmark.id;
  deleteButton.title = 'Delete Bookmark';
  
  const deleteIcon = document.createElement('i');
  deleteIcon.className = 'fas fa-trash';
  deleteButton.appendChild(deleteIcon);
  
  actionsCell.appendChild(editButton);
  actionsCell.appendChild(deleteButton);
  
  // Append all cells to row
  row.appendChild(checkboxCell);
  row.appendChild(nameCell);
  row.appendChild(urlCell);
  row.appendChild(tagsCell);
  row.appendChild(actionsCell);
  
  tableBody.appendChild(row);
}

function renderEmptyState(tableBody) {
  const row = document.createElement('tr');
  row.className = 'empty-row';
  
  row.innerHTML = `
    <td colspan="5">
      <div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <h3 data-i18n="noBookmarks">No Bookmarks Found</h3>
        <p data-i18n="noBookmarksDesc">Try adding some bookmarks or adjusting your filters.</p>
      </div>
    </td>
  `;
  
  tableBody.appendChild(row);
}

// ========== Folder Tree Rendering ==========

function renderFolderTree() {
  const foldersTree = document.getElementById('folders-tree');
  if (!foldersTree) return;
  
  // 清空现有内容（保留"所有书签"项）
  const allBookmarksItem = foldersTree.querySelector('[data-id="all"]');
  foldersTree.innerHTML = '';
  
  if (allBookmarksItem) {
    foldersTree.appendChild(allBookmarksItem);
  }
  
  // 提取文件夹（没有URL的书签项是文件夹）
  const folders = state.bookmarks.filter(bookmark => !bookmark.url);
  
  if (folders.length === 0) {
    return;
  }
  
  // 按层级组织文件夹
  const folderMap = new Map();
  const rootFolders = [];
  
  // 首先将所有文件夹放入map
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      element: null
    });
  });
  
  // 构建层级关系
  folders.forEach(folder => {
    const folderData = folderMap.get(folder.id);
    
    if (folder.parentId && folderMap.has(folder.parentId)) {
      // 这是子文件夹
      const parent = folderMap.get(folder.parentId);
      parent.children.push(folderData);
    } else {
      // 这是根文件夹
      rootFolders.push(folderData);
    }
  });
  
  // 渲染文件夹树
  rootFolders.forEach(folder => {
    renderFolderItem(foldersTree, folder, 0);
  });
}

function renderFolderItem(container, folder, depth) {
  const folderElement = document.createElement('div');
  folderElement.className = 'folder-item';
  folderElement.dataset.id = folder.id;
  folderElement.dataset.expanded = 'true'; // 默认展开
  folderElement.style.paddingLeft = `${depth * 20 + 10}px`;
  
  // 计算此文件夹中的书签数量
  const bookmarkCount = state.bookmarks.filter(b => 
    b.url && b.parentId === folder.id
  ).length;
  
  const childFolderCount = folder.children.length;
  const totalCount = bookmarkCount + childFolderCount;
  
  // 如果有子文件夹，添加折叠图标
  const toggleIcon = childFolderCount > 0 ? 
    `<i class="fas fa-chevron-down folder-toggle"></i>` : 
    `<i class="fas fa-chevron-right folder-toggle" style="visibility: hidden;"></i>`;
  
  folderElement.innerHTML = `
    ${toggleIcon}
    <i class="fas fa-folder${childFolderCount > 0 ? '-open' : ''}"></i>
    <span class="folder-name">${escapeHtml(folder.title)}</span>
    ${totalCount > 0 ? `<span class="folder-count">${totalCount}</span>` : ''}
  `;
  
  container.appendChild(folderElement);
  folder.element = folderElement;
  
  // 存储子元素引用，用于折叠/展开
  folder.childElements = [];
  
  // 递归渲染子文件夹
  if (folder.children.length > 0) {
    folder.children.forEach(child => {
      const childElement = renderFolderItem(container, child, depth + 1);
      folder.childElements.push(childElement);
    });
  }
  
  return folderElement;
}

// ========== Tag List Rendering ==========

function renderTagList() {
  const tagsList = document.getElementById('tags-list');
  if (!tagsList) return;
  
  // Clear existing tags (keep "All Tags")
  const allTagsElement = tagsList.querySelector('[data-tag=""]');
  tagsList.innerHTML = '';
  
  if (allTagsElement) {
    tagsList.appendChild(allTagsElement);
  }
  
  // Add each tag
  state.tags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag-pill';
    tagElement.dataset.tag = tag.name;
    
    if (state.selectedTags.has(tag.name)) {
      tagElement.classList.add('active');
    }
    
    tagElement.innerHTML = `
      <span class="tag-name">${escapeHtml(tag.name)}</span>
      <span class="tag-count">${tag.count}</span>
    `;
    
    tagsList.appendChild(tagElement);
  });
}

// ========== Statistics ==========

async function loadStatistics() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATISTICS' });
    
    if (response.success) {
      state.statistics = response.data;
      updateStatistics();
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

function updateStatistics() {
  if (!state.statistics) return;
  
  const bookmarkCount = document.getElementById('bookmark-count');
  if (bookmarkCount) {
    bookmarkCount.textContent = `${state.statistics.totalBookmarks} ${languageManager.t('bookmarks')}`;
  }
  
  const folderCount = document.getElementById('folder-count');
  if (folderCount) {
    folderCount.textContent = `${state.statistics.totalFolders} ${languageManager.t('folders')}`;
  }
}

// ========== Filter Management ==========

function populateFolderFilter() {
  const tagFilter = document.getElementById('tag-filter');
  if (!tagFilter) return;
  
  // Clear existing options (keep first option)
  while (tagFilter.options.length > 1) {
    tagFilter.remove(1);
  }
  
  // Add tag options
  state.tags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag.name;
    option.textContent = `${tag.name} (${tag.count})`;
    tagFilter.appendChild(option);
  });
}

function updateTagFilters() {
  const tagFilter = document.getElementById('tag-filter');
  if (tagFilter) {
    tagFilter.value = '';
  }
}

// ========== UI Updates ==========

function updateBookmarkCount() {
  const count = state.filteredBookmarks.length;
  const totalCount = document.getElementById('total-count');
  if (totalCount) {
    totalCount.textContent = `${count} ${languageManager.t('bookmarks')}`;
  }
}

function updateSelectedCount() {
  const count = state.selectedBookmarks.size;
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const selectAllButton = document.getElementById('select-all-btn');
  const selectedCountElement = document.getElementById('selected-count');
  
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = count > 0 && count === state.filteredBookmarks.length;
    selectAllCheckbox.indeterminate = count > 0 && count < state.filteredBookmarks.length;
  }
  
  if (selectAllButton) {
    updateSelectAllButtonText(selectAllButton, count === state.filteredBookmarks.length);
  }
  
  if (selectedCountElement) {
    selectedCountElement.textContent = `${count} ${languageManager.t('selected')}`;
  }
}

function showLoading(show) {
  const tableBody = document.getElementById('bookmarks-table-body');
  if (!tableBody) return;
  
  if (show) {
    tableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="5">
          <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <span data-i18n="loading">Loading...</span>
          </div>
        </td>
      </tr>
    `;
  }
}

function showError(message) {
  const tableBody = document.getElementById('bookmarks-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = `
    <tr class="error-row">
      <td colspan="5">
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>${escapeHtml(message)}</p>
        </div>
      </td>
    </tr>
  `;
}

// ========== Event Listeners ==========

function setupEventListeners() {
  // Language toggle
  const languageBtn = document.getElementById('language-btn');
  if (languageBtn) {
    languageBtn.addEventListener('click', toggleLanguage);
  }
  
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  
  const clearSearch = document.getElementById('clear-search');
  if (clearSearch) {
    clearSearch.addEventListener('click', clearSearchInput);
  }
  
  // Tag filter
  const tagFilter = document.getElementById('tag-filter');
  if (tagFilter) {
    tagFilter.addEventListener('change', handleTagFilterChange);
  }
  
  // Tag selection
  const tagsList = document.getElementById('tags-list');
  if (tagsList) {
    tagsList.addEventListener('click', handleTagClick);
  }
  
  // Folder selection and toggle
  const foldersTree = document.getElementById('folders-tree');
  if (foldersTree) {
    foldersTree.addEventListener('click', handleFolderTreeClick);
  }
  
  // Select all
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAllChange);
  }
  
  const selectAllButton = document.getElementById('select-all-btn');
  if (selectAllButton) {
    selectAllButton.addEventListener('click', handleSelectAllClick);
  }
  
  // Bookmark actions
  document.addEventListener('click', handleBookmarkAction);
  
  // New bookmark/folder buttons
  const newBookmarkBtn = document.getElementById('new-bookmark');
  if (newBookmarkBtn) {
    newBookmarkBtn.addEventListener('click', handleNewBookmark);
  }
  
  const newFolderBtn = document.getElementById('new-folder-btn');
  if (newFolderBtn) {
    newFolderBtn.addEventListener('click', handleNewFolder);
  }
  
  const addTagBtn = document.getElementById('add-tag-btn');
  if (addTagBtn) {
    addTagBtn.addEventListener('click', handleAddTag);
  }
  
  // Fullscreen toggle
  const fullscreenToggle = document.getElementById('fullscreen-toggle');
  if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', toggleFullscreen);
  }
}

// ========== Event Handlers ==========

function toggleFullscreen() {
  const appContainer = document.querySelector('.app-container');
  const body = document.body;
  const fullscreenToggle = document.getElementById('fullscreen-toggle');
  
  if (!appContainer || !fullscreenToggle) return;
  
  const isFullscreen = appContainer.classList.contains('fullscreen');
  
  if (isFullscreen) {
    appContainer.classList.remove('fullscreen');
    body.classList.remove('fullscreen');
    fullscreenToggle.classList.remove('fullscreen-active');
    fullscreenToggle.title = 'Enter fullscreen';
    
    const icon = fullscreenToggle.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-expand';
    }
    
    document.documentElement.style.width = '';
    document.documentElement.style.height = '';
  } else {
    appContainer.classList.add('fullscreen');
    body.classList.add('fullscreen');
    fullscreenToggle.classList.add('fullscreen-active');
    fullscreenToggle.title = 'Exit fullscreen';
    
    const icon = fullscreenToggle.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-compress';
    }
    
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
  }
  
  chrome.storage.local.set({ fullscreenMode: !isFullscreen });
}

async function toggleLanguage() {
  const currentLang = languageManager.getCurrentLanguage();
  const newLang = currentLang === 'en' ? 'zh' : 'en';
  
  await languageManager.setLanguage(newLang);
  updateUIText();
  updateLanguageButton();
}

function handleSearch(event) {
  state.searchQuery = event.target.value.trim().toLowerCase();
  filterBookmarks();
}

function clearSearchInput() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
    state.searchQuery = '';
    filterBookmarks();
  }
}

function handleTagFilterChange(event) {
  const tagName = event.target.value;
  if (tagName) {
    state.selectedTags.clear();
    state.selectedTags.add(tagName);
  } else {
    state.selectedTags.clear();
  }
  filterBookmarks();
}

function handleTagClick(event) {
  const tagPill = event.target.closest('.tag-pill');
  if (!tagPill) return;
  
  const tagName = tagPill.dataset.tag;
  
  const tagFilter = document.getElementById('tag-filter');
  if (tagFilter) {
    tagFilter.value = '';
  }
  
  if (tagName === '') {
    state.selectedTags.clear();
  } else {
    if (state.selectedTags.has(tagName)) {
      state.selectedTags.delete(tagName);
    } else {
      state.selectedTags.add(tagName);
    }
  }
  
  document.querySelectorAll('.tag-pill').forEach(pill => {
    const pillTag = pill.dataset.tag;
    if (pillTag === '') {
      pill.classList.toggle('active', state.selectedTags.size === 0);
    } else {
      pill.classList.toggle('active', state.selectedTags.has(pillTag));
    }
  });
  
  filterBookmarks();
}

function handleFolderTreeClick(event) {
  const folderItem = event.target.closest('.folder-item');
  if (!folderItem) return;
  
  const folderId = folderItem.dataset.id;
  
  // 检查是否点击了折叠图标
  const toggleIcon = event.target.closest('.folder-toggle');
  if (toggleIcon) {
    toggleFolder(folderItem);
    return;
  }
  
  // 否则是选择文件夹
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
  });
  folderItem.classList.add('active');
  
  state.currentFolder = folderId === 'all' ? null : folderId;
  
  const folderTitle = document.getElementById('current-folder-title');
  if (folderTitle) {
    if (folderId === 'all') {
      folderTitle.textContent = languageManager.t('allBookmarks');
    } else {
      const folderName = folderItem.querySelector('.folder-name').textContent;
      folderTitle.textContent = folderName;
    }
  }
  
  filterBookmarks();
}

function toggleFolder(folderElement) {
  const isExpanded = folderElement.dataset.expanded === 'true';
  const toggleIcon = folderElement.querySelector('.folder-toggle');
  const folderIcon = folderElement.querySelector('.fa-folder, .fa-folder-open');
  
  if (isExpanded) {
    // 折叠：隐藏所有子文件夹
    folderElement.dataset.expanded = 'false';
    if (toggleIcon) {
      toggleIcon.className = 'fas fa-chevron-right folder-toggle';
    }
    if (folderIcon) {
      folderIcon.className = 'fas fa-folder';
    }
    
    // 隐藏所有子元素
    let nextElement = folderElement.nextElementSibling;
    while (nextElement && nextElement.classList.contains('folder-item') && 
           parseInt(nextElement.style.paddingLeft) > parseInt(folderElement.style.paddingLeft)) {
      nextElement.style.display = 'none';
      nextElement = nextElement.nextElementSibling;
    }
  } else {
    // 展开：显示所有子文件夹
    folderElement.dataset.expanded = 'true';
    if (toggleIcon) {
      toggleIcon.className = 'fas fa-chevron-down folder-toggle';
    }
    if (folderIcon && folderElement.querySelector('.folder-count')) {
      folderIcon.className = 'fas fa-folder-open';
    }
    
    // 显示直接子元素
    let nextElement = folderElement.nextElementSibling;
    const currentDepth = parseInt(folderElement.style.paddingLeft);
    
    while (nextElement && nextElement.classList.contains('folder-item')) {
      const nextDepth = parseInt(nextElement.style.paddingLeft);
      
      if (nextDepth <= currentDepth) {
        break; // 遇到同级或上级文件夹，停止
      }
      
      if (nextDepth === currentDepth + 20) {
        // 直接子文件夹，显示它
        nextElement.style.display = '';
        
        // 如果子文件夹本身是展开的，也需要显示它的子文件夹
        if (nextElement.dataset.expanded === 'true') {
          let childElement = nextElement.nextElementSibling;
          const childDepth = parseInt(nextElement.style.paddingLeft);
          
          while (childElement && childElement.classList.contains('folder-item')) {
            const grandChildDepth = parseInt(childElement.style.paddingLeft);
            if (grandChildDepth <= childDepth) {
              break;
            }
            childElement.style.display = '';
            childElement = childElement.nextElementSibling;
          }
        }
      }
      
      nextElement = nextElement.nextElementSibling;
    }
  }
}

function handleSelectAllChange(event) {
  const isChecked = event.target.checked;
  
  if (isChecked) {
    state.filteredBookmarks.forEach(bookmark => {
      if (bookmark.url) {
        state.selectedBookmarks.add(bookmark.id);
      }
    });
  } else {
    state.selectedBookmarks.clear();
  }
  
  updateSelectedCount();
  updateBookmarkSelectionUI();
}

function handleSelectAllClick() {
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  if (!selectAllCheckbox) return;
  
  const isAllSelected = state.selectedBookmarks.size === state.filteredBookmarks.length;
  
  if (isAllSelected) {
    state.selectedBookmarks.clear();
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else {
    state.filteredBookmarks.forEach(bookmark => {
      if (bookmark.url) {
        state.selectedBookmarks.add(bookmark.id);
      }
    });
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  }
  
  updateSelectedCount();
  updateBookmarkSelectionUI();
}

function handleBookmarkAction(event) {
  if (event.target.classList.contains('bookmark-checkbox')) {
    const bookmarkId = event.target.dataset.id;
    const isChecked = event.target.checked;
    
    if (isChecked) {
      state.selectedBookmarks.add(bookmarkId);
    } else {
      state.selectedBookmarks.delete(bookmarkId);
    }
    
    updateSelectedCount();
    updateBookmarkSelectionUI();
    return;
  }
  
  if (event.target.classList.contains('folder-checkbox')) {
    const folderId = event.target.dataset.id;
    const isChecked = event.target.checked;
    
    const folderBookmarks = state.filteredBookmarks.filter(b => 
      b.parentId === folderId && b.url
    );
    
    if (isChecked) {
      folderBookmarks.forEach(b => state.selectedBookmarks.add(b.id));
    } else {
      folderBookmarks.forEach(b => state.selectedBookmarks.delete(b.id));
    }
    
    updateSelectedCount();
    updateBookmarkSelectionUI();
    return;
  }
  
  if (event.target.closest('.edit-bookmark')) {
    const button = event.target.closest('.edit-bookmark');
    const bookmarkId = button.dataset.id;
    editBookmark(bookmarkId);
    return;
  }
  
  if (event.target.closest('.delete-bookmark')) {
    const button = event.target.closest('.delete-bookmark');
    const bookmarkId = button.dataset.id;
    deleteBookmark(bookmarkId);
    return;
  }
  
  if (event.target.closest('.edit-folder')) {
    const button = event.target.closest('.edit-folder');
    const folderId = button.dataset.id;
    editFolder(folderId);
    return;
  }
  
  if (event.target.closest('.delete-folder')) {
    const button = event.target.closest('.delete-folder');
    const folderId = button.dataset.id;
    deleteFolder(folderId);
    return;
  }
}

async function handleNewBookmark() {
  // TODO: Implement new bookmark modal
  console.log('New bookmark clicked');
}

async function handleNewFolder() {
  // TODO: Implement new folder modal
  console.log('New folder clicked');
}

async function handleAddTag() {
  // TODO: Implement add tag modal
  console.log('Add tag clicked');
}

// ========== Bookmark Filtering ==========

function filterBookmarks() {
  let filtered = [...state.bookmarks];
  
  // Filter by search query
  if (state.searchQuery) {
    filtered = filtered.filter(bookmark => 
      bookmark.title.toLowerCase().includes(state.searchQuery) ||
      bookmark.url?.toLowerCase().includes(state.searchQuery) ||
      bookmark.tags?.some(tag => tag.toLowerCase().includes(state.searchQuery))
    );
  }
  
  // Filter by selected tags
  if (state.selectedTags.size > 0) {
    filtered = filtered.filter(bookmark => 
      bookmark.tags?.some(tag => state.selectedTags.has(tag))
    );
  }
  
  // Filter by current folder
  if (state.currentFolder) {
    filtered = filtered.filter(bookmark => 
      bookmark.parentId === state.currentFolder
    );
  }
  
  state.filteredBookmarks = filtered;
  renderBookmarkTable();
  updateBookmarkCount();
  updateSelectedCount();
}

// ========== Bookmark Operations ==========

async function editBookmark(bookmarkId) {
  // TODO: Implement edit bookmark modal
  console.log('Edit bookmark:', bookmarkId);
}

async function deleteBookmark(bookmarkId) {
  if (!confirm('Are you sure you want to delete this bookmark?')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_BOOKMARK',
      bookmarkId
    });
    
    if (response.success) {
      await refreshBookmarks();
    } else {
      alert('Failed to delete bookmark: ' + response.error);
    }
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    alert('Error deleting bookmark: ' + error.message);
  }
}

async function editFolder(folderId) {
  // TODO: Implement edit folder modal
  console.log('Edit folder:', folderId);
}

async function deleteFolder(folderId) {
  if (!confirm('Are you sure you want to delete this folder and all its contents?')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_FOLDER',
      folderId
    });
    
    if (response.success) {
      await refreshBookmarks();
    } else {
      alert('Failed to delete folder: ' + response.error);
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    alert('Error deleting folder: ' + error.message);
  }
}

// ========== UI Helpers ==========

function updateBookmarkSelectionUI() {
  document.querySelectorAll('.bookmark-row').forEach(row => {
    const bookmarkId = row.dataset.id;
    if (state.selectedBookmarks.has(bookmarkId)) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
  
  document.querySelectorAll('.bookmark-checkbox').forEach(checkbox => {
    const bookmarkId = checkbox.dataset.id;
    checkbox.checked = state.selectedBookmarks.has(bookmarkId);
  });
  
  document.querySelectorAll('.folder-checkbox').forEach(checkbox => {
    const folderId = checkbox.dataset.id;
    const folderBookmarks = state.filteredBookmarks.filter(b => 
      b.parentId === folderId && b.url
    );
    
    if (folderBookmarks.length === 0) {
      checkbox.checked = false;
      checkbox.indeterminate = false;
    } else {
      const selectedCount = folderBookmarks.filter(b => 
        state.selectedBookmarks.has(b.id)
      ).length;
      
      checkbox.checked = selectedCount === folderBookmarks.length;
      checkbox.indeterminate = selectedCount > 0 && selectedCount < folderBookmarks.length;
    }
  });
}

// ========== Utility Functions ==========

function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeLanguage,
    updateUIText,
    updateLanguageButton,
    renderBookmarkTable,
    renderTagList,
    updateStatistics,
    filterBookmarks,
    escapeHtml,
    debounce
  };
}