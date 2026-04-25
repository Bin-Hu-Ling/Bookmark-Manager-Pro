// ============================================================
// Bookmark Manager Pro - Dual Mode Logic v2
// 小窗模式 + 大屏模式 双布局支持
// 移除无效标签系统，修复 favicon 崩溃问题
// ============================================================

// ==================== I18N ====================
const i18n = (() => {
  const dict = {
    en: {
      appTitle: 'Bookmark Manager',
      searchPlaceholder: 'Search bookmarks...',
      allBookmarks: 'All Bookmarks',
      foldersTitle: 'Folders',
      selectAll: 'Select All',
      bulkEdit: 'Batch',
      newBookmark: 'New',
      nameColumn: 'Name',
      urlColumn: 'URL',
      actionsColumn: 'Actions',
      loadingBookmarks: 'Loading...',
      noBookmarks: 'No bookmarks found',
      noBookmarksDesc: 'Try adjusting your search',
      editBookmarkTitle: 'Edit Bookmark',
      newBookmarkTitle: 'New Bookmark',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      nameLabel: 'Name',
      urlLabel: 'URL',
      folderLabel: 'Folder',
      confirmDelete: 'Are you sure?',
      bookmarkSaved: 'Bookmark saved',
      bookmarkDeleted: 'Bookmark deleted',
      importSuccess: 'Imported {0} bookmarks',
      importFailed: 'Import failed',
      exportSuccess: 'Exported successfully',
      editFolder: 'Edit Folder',
      newFolder: 'New Folder',
      folderCreated: 'Folder created',
      folderUpdated: 'Folder updated',
      folderDeleted: 'Folder deleted',
      confirmDeleteFolder: 'Delete folder and all contents?',
      folderBookmarksBar: 'Favorites Bar',
      folderFavorites: 'Favorites',
      folderOtherBookmarks: 'Other Bookmarks',
      folderMobileBookmarks: 'Mobile Bookmarks',
      expandFullscreen: 'Fullscreen',
      exitFullscreen: 'Exit',
    },
    zh: {
      appTitle: '书签管理器',
      searchPlaceholder: '搜索书签...',
      allBookmarks: '所有书签',
      foldersTitle: '文件夹',
      selectAll: '全选',
      bulkEdit: '批量',
      newBookmark: '新建',
      nameColumn: '名称',
      urlColumn: '网址',
      actionsColumn: '操作',
      loadingBookmarks: '加载中...',
      noBookmarks: '未找到书签',
      noBookmarksDesc: '请调整搜索条件',
      editBookmarkTitle: '编辑书签',
      newBookmarkTitle: '新建书签',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      nameLabel: '名称',
      urlLabel: '网址',
      folderLabel: '文件夹',
      confirmDelete: '确认删除？',
      bookmarkSaved: '书签已保存',
      bookmarkDeleted: '书签已删除',
      importSuccess: '已导入 {0} 个书签',
      importFailed: '导入失败',
      exportSuccess: '导出成功',
      editFolder: '编辑文件夹',
      newFolder: '新建文件夹',
      folderCreated: '文件夹已创建',
      folderUpdated: '文件夹已更新',
      folderDeleted: '文件夹已删除',
      confirmDeleteFolder: '删除文件夹及所有内容？',
      folderBookmarksBar: '收藏夹栏',
      folderFavorites: '收藏夹',
      folderOtherBookmarks: '其他书签',
      folderMobileBookmarks: '移动设备书签',
      expandFullscreen: '全屏',
      exitFullscreen: '退出',
    }
  };

  let currentLang = 'en';

  async function init() {
    try {
      const r = await chrome.storage.local.get('language');
      if (r.language && dict[r.language]) {currentLang = r.language;}
    } catch (e) {
      console.warn('Failed to load language setting:', e.message);
    }
  }

  async function set(lang) {
    if (dict[lang]) {
      currentLang = lang;
      await chrome.storage.local.set({ language: lang });
    }
  }

  function t(key, ...args) {
    let text = (dict[currentLang] && dict[currentLang][key]) || dict.en[key] || key;
    args.forEach((arg, i) => { text = text.replace(`{${i}}`, arg); });
    return text;
  }

  function lang() { return currentLang; }

  async function toggle() {
    const next = currentLang === 'en' ? 'zh' : 'en';
    await set(next);
    return next;
  }

  return { init, set, t, lang, toggle };
})();

// ==================== 状态 ====================
const state = {
  bookmarks: [],
  folders: [],
  filtered: [],
  searchIndex: new Map(),
  selected: new Set(),
  currentFolder: null,
  searchQuery: '',
  settings: {},
  isFullscreen: false,
  collapsedFolders: new Set(),
};

// Chrome 系统根文件夹ID，不可编辑/删除
const SYSTEM_FOLDER_IDS = new Set(['0', '1', '2', '3']);

// 系统文件夹名称翻译映射（case-insensitive key）
const SYSTEM_FOLDER_NAMES_MAP = {
  'bookmarks bar': 'folderBookmarksBar',
  'bookmarks': 'folderBookmarksBar',
  'favorites bar': 'folderBookmarksBar',
  'favorites': 'folderFavorites',
  'other bookmarks': 'folderOtherBookmarks',
  'other favorites': 'folderOtherBookmarks',
  'mobile bookmarks': 'folderMobileBookmarks',
  'mobile favorites': 'folderMobileBookmarks',
};

// 根据文件夹名获取翻译（case-insensitive）
function getSystemFolderI18nKey(title) {
  if (!title) {return null;}
  const lower = title.trim().toLowerCase();
  if (SYSTEM_FOLDER_NAMES_MAP[lower]) {return SYSTEM_FOLDER_NAMES_MAP[lower];}
  if (lower.includes('favorites bar') || lower.includes('bookmarks bar')) {return 'folderBookmarksBar';}
  if (lower.startsWith('other ')) {return 'folderOtherBookmarks';}
  if (lower.startsWith('mobile ')) {return 'folderMobileBookmarks';}
  return null;
}

// 根据文件夹ID获取系统文件夹的 i18n key
function getSystemFolderI18nKeyById(id) {
  const map = {
    '0': 'folderFavorites',
    '1': 'folderBookmarksBar',
    '2': 'folderOtherBookmarks',
    '3': 'folderMobileBookmarks',
  };
  return map[id] || null;
}

// ==================== DOM 工具 ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  initMode();
  await i18n.init();
  await loadSettings();
  applyTheme();
  applyI18n();
  await loadData();
  bindEvents();
});

// ==================== 模式检测 ====================
function initMode() {
  const urlParams = new URLSearchParams(window.location.search);
  state.isFullscreen = urlParams.get('fullscreen') === 'true';
  
  if (state.isFullscreen) {
    document.body.classList.add('fullscreen-mode');
  } else {
    document.body.classList.add('popup-mode');
  }
}

function openFullscreen() {
  // 在当前浏览器窗口中打开新标签页（而非新窗口）
  // 动态获取当前页面URL，兼容 dev (src/popup/) 和 dist (根目录) 两种路径
  const currentUrl = window.location.href.split('?')[0];
  const fullscreenUrl = currentUrl + '?fullscreen=true';
  chrome.tabs.create({ url: fullscreenUrl });
  // 关闭 popup
  window.close();
}

function exitFullscreen() {
  // 在标签页中退出全屏 = 关闭当前标签页
  chrome.tabs.getCurrent((tab) => {
    if (tab) {chrome.tabs.remove(tab.id);}
  });
}

// ==================== 设置 ====================
async function loadSettings() {
  try {
    const r = await sendMessage('GET_SETTINGS');
    state.settings = r.success ? r.data : {};
  } catch (e) {
    state.settings = {};
  }
}

function applyTheme() {
  const theme = state.settings.theme || 'auto';
  let resolved = theme;
  if (theme === 'auto') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
  
  const icon = state.isFullscreen 
    ? $('#btn-fs-theme i') 
    : $('#btn-popup-theme i');
  if (icon) {icon.className = resolved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';}
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  state.settings.theme = next;
  await chrome.storage.local.set({ theme: next });
  applyTheme();
}

// ==================== i18n ====================
function applyI18n() {
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT') {
      el.placeholder = i18n.t(key);
    } else {
      el.textContent = i18n.t(key);
    }
  });
  
  $$('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = i18n.t(el.getAttribute('data-i18n-placeholder'));
  });
  
  const label = state.isFullscreen ? $('#fs-lang-label') : $('#popup-lang-label');
  if (label) {label.textContent = i18n.lang() === 'en' ? 'EN' : '中';}
  
  updateFolderTitle();
}

async function toggleLanguage() {
  await i18n.toggle();
  applyI18n();
  buildSearchIndex();
  renderAll();
}

// ==================== 数据加载 ====================
async function loadData() {
  await loadBookmarks();
  updateStats();
  updateResultCount();
  updateSelectionUI();
}

async function loadBookmarks() {
  try {
    const r = await sendMessage('GET_BOOKMARKS');
    if (r.success) {
      state.bookmarks = r.data;
      buildFolders();
      buildSearchIndex();
      filterAndRender();
    }
  } catch (e) {
    console.error('Load bookmarks error:', e);
  }
}

function buildFolders() {
  const folders = state.bookmarks.filter(b => !b.url);
  const map = new Map();
  folders.forEach(f => map.set(f.id, { ...f, children: [] }));
  
  const roots = [];
  folders.forEach(f => {
    const node = map.get(f.id);
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  state.folders = roots;
  renderFolders();
}

function buildSearchIndex() {
  state.searchIndex = new Map();
  state.bookmarks.forEach(bookmark => {
    if (!bookmark.url) {return;}

    const folderPath = getBookmarkFolderPath(bookmark, { includeCurrent: true });
    const domain = getUrlDomain(bookmark.url);
    const tagsText = Array.isArray(bookmark.tags) ? bookmark.tags.join(' ') : '';
    const title = bookmark.title || '';
    const url = bookmark.url || '';

    state.searchIndex.set(bookmark.id, {
      title: normalizeSearchText(title),
      url: normalizeSearchText(url),
      domain: normalizeSearchText(domain),
      tags: normalizeSearchText(tagsText),
      folderPath: normalizeSearchText(folderPath),
      all: normalizeSearchText(`${title} ${url} ${domain} ${tagsText} ${folderPath}`),
      folderPathDisplay: folderPath,
      domainDisplay: domain,
    });
  });
}

// 递归获取指定文件夹的所有后代文件夹ID
function getAllDescendantFolderIds(folderId) {
  const ids = new Set();
  function walk(nodes) {
    for (const node of nodes) {
      if (node.id === folderId) {
        collectDescendants(node, ids);
        return true;
      }
      if (node.children && walk(node.children)) {return true;}
    }
    return false;
  }
  function collectDescendants(node, ids) {
    if (node.children) {
      for (const child of node.children) {
        ids.add(child.id);
        collectDescendants(child, ids);
      }
    }
  }
  walk(state.folders);
  return ids;
}

// 统计文件夹及其子文件夹下的书签总数
function countBookmarksInFolder(folderNode) {
  let count = state.bookmarks.filter(b => b.url && b.parentId === folderNode.id).length;
  if (folderNode.children) {
    for (const child of folderNode.children) {
      count += countBookmarksInFolder(child);
    }
  }
  return count;
}

// ==================== Favicon 工具 ====================
// 生成首字母头像（替代外部 favicon，避免加载崩溃）
function getFaviconHtml(url, title, cssClass) {
  const letter = (title || '?')[0].toUpperCase();
  const color = stringToColor(title || url || '');
  return `<div class="${cssClass}" style="background:${color}">${esc(letter)}</div>`;
}

// 根据字符串生成柔和的色相
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

// 根据文件夹名生成文件夹图标颜色（柔和背景 + 深色图标）
function getFolderColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // 预定义一组美观的文件夹色板（避免随机生成过暗/过亮的色相）
  const palette = [
    { bg: 'rgba(91, 95, 199, 0.12)', fg: '#5b5fc7' },   // 紫蓝
    { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6' },   // 蓝
    { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10b981' },   // 绿
    { bg: 'rgba(245, 158, 11, 0.12)', fg: '#f59e0b' },   // 琥珀
    { bg: 'rgba(239, 68, 68, 0.12)', fg: '#ef4444' },    // 红
    { bg: 'rgba(236, 72, 153, 0.12)', fg: '#ec4899' },   // 粉
    { bg: 'rgba(139, 92, 246, 0.12)', fg: '#8b5cf6' },   // 紫
    { bg: 'rgba(14, 165, 233, 0.12)', fg: '#0ea5e9' },   // 天蓝
    { bg: 'rgba(34, 197, 94, 0.12)', fg: '#22c55e' },    // 翠绿
    { bg: 'rgba(249, 115, 22, 0.12)', fg: '#f97316' },   // 橙
    { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' },   // 亮紫
    { bg: 'rgba(20, 184, 166, 0.12)', fg: '#14b8a6' },   // 青绿
  ];
  const idx = Math.abs(hash) % palette.length;
  return palette[idx].bg;
}

// 获取文件夹图标的前景色（用于CSS自定义）
function getFolderIconColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    '#5b5fc7', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#8b5cf6', '#0ea5e9',
    '#22c55e', '#f97316', '#a855f7', '#14b8a6',
  ];
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

// ==================== 渲染 ====================
function renderAll() {
  renderFolders();
  filterAndRender();
}

function renderFolders() {
  const container = state.isFullscreen 
    ? $('#fs-folder-tree') 
    : $('#popup-folder-tree');
  if (!container) {return;}
  
  let html = `
    <div class="folder-item ${!state.currentFolder ? 'active' : ''}" data-id="all">
      <span class="folder-icon" style="background:rgba(91, 95, 199, 0.12);color:#5b5fc7">
        <i class="fas fa-layer-group"></i>
      </span>
      <span class="folder-name">${esc(i18n.t('allBookmarks'))}</span>
    </div>
  `;
  
  function renderNode(node, depth = 0) {
    const count = countBookmarksInFolder(node);
    const isActive = state.currentFolder === node.id;
    const hasChildren = node.children.length > 0;
    const isCollapsed = state.collapsedFolders.has(node.id);
    const indent = depth * 16;
    
    // 翻译系统文件夹名称（优先按ID，其次按名称）
    const i18nKeyById = getSystemFolderI18nKeyById(node.id);
    const i18nKey = i18nKeyById || getSystemFolderI18nKey(node.title);
    const folderTitle = i18nKey 
      ? i18n.t(i18nKey) 
      : (node.title || i18n.t('allBookmarks'));
    
    html += `
      <div class="folder-item ${isActive ? 'active' : ''}" data-id="${node.id}" style="padding-left:${8 + indent}px">
        ${hasChildren 
          ? `<i class="fas fa-chevron-down folder-toggle ${isCollapsed ? 'collapsed' : ''}" data-toggle="${node.id}"></i>` 
          : '<i class="fas fa-chevron-right folder-toggle" style="visibility:hidden"></i>'}
        <span class="folder-icon" style="background:${getFolderColor(node.title || node.id)};color:${getFolderIconColor(node.title || node.id)}">
          <i class="fas fa-folder${isCollapsed ? '' : '-open'}"></i>
        </span>
        <span class="folder-name">${esc(folderTitle)}</span>
        ${count > 0 ? `<span class="folder-count">${count}</span>` : ''}
        ${!SYSTEM_FOLDER_IDS.has(node.id) ? `
        <div class="folder-actions">
          <button class="folder-action-btn btn-folder-edit" data-folder-id="${node.id}" title="Rename">
            <i class="fas fa-pen"></i>
          </button>
          <button class="folder-action-btn delete btn-folder-delete" data-folder-id="${node.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>` : ''}
      </div>
    `;
    
    if (hasChildren && !isCollapsed) {
      node.children.forEach(c => renderNode(c, depth + 1));
    }
  }
  
  state.folders.forEach(f => renderNode(f));
  container.innerHTML = html;
  
  // 绑定事件：箭头折叠 / 文件夹选中 / 编辑 / 删除
  container.querySelectorAll('.folder-item').forEach(item => {
    const toggleIcon = item.querySelector('.folder-toggle[data-toggle]');
    if (toggleIcon) {
      toggleIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = toggleIcon.dataset.toggle;
        if (state.collapsedFolders.has(folderId)) {
          state.collapsedFolders.delete(folderId);
        } else {
          state.collapsedFolders.add(folderId);
        }
        renderFolders();
      });
    }
    
    const editBtn = item.querySelector('.btn-folder-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditFolderModal(editBtn.dataset.folderId);
      });
    }
    
    const deleteBtn = item.querySelector('.btn-folder-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFolder(deleteBtn.dataset.folderId);
      });
    }
    
    item.addEventListener('click', (e) => {
      if (e.target.closest('.folder-action-btn')) {return;}
      const id = item.dataset.id;
      state.currentFolder = id === 'all' ? null : id;
      renderFolders();
      filterAndRender();
      updateFolderTitle();
    });
  });
}

function filterAndRender() {
  let filtered = state.bookmarks.filter(b => b.url);
  
  // 文件夹筛选：递归包含所有子文件夹的书签
  if (state.currentFolder) {
    const folderIds = getAllDescendantFolderIds(state.currentFolder);
    folderIds.add(state.currentFolder);
    filtered = filtered.filter(b => folderIds.has(b.parentId));
  }
  
  // 搜索筛选
  if (state.searchQuery) {
    filtered = searchBookmarks(filtered, state.searchQuery);
  }
  
  state.filtered = filtered;
  
  if (state.isFullscreen) {
    renderFullscreenTable();
  } else {
    renderPopupList();
  }
  
  updateResultCount();
  updateFolderTitle();
}

function searchBookmarks(bookmarks, query) {
  const tokens = getSearchTokens(query);
  if (tokens.length === 0) {return bookmarks;}

  return bookmarks
    .map(bookmark => ({
      bookmark,
      score: scoreBookmarkSearch(bookmark, tokens),
    }))
    .filter(result => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {return b.score - a.score;}
      return (a.bookmark.title || '').localeCompare(b.bookmark.title || '');
    })
    .map(result => result.bookmark);
}

function scoreBookmarkSearch(bookmark, tokens) {
  const index = state.searchIndex.get(bookmark.id);
  if (!index) {return 0;}

  let totalScore = 0;
  for (const token of tokens) {
    const tokenScore = getTokenSearchScore(index, token);
    if (tokenScore === 0) {return 0;}
    totalScore += tokenScore;
  }

  if (tokens.length > 1 && index.all.includes(tokens.join(' '))) {
    totalScore += 20;
  }

  return totalScore;
}

function getTokenSearchScore(index, token) {
  let score = 0;

  if (index.title === token) {score += 120;}
  if (index.domain === token) {score += 100;}
  if (hasWordPrefix(index.title, token)) {score += 70;}
  if (index.title.includes(token)) {score += 60;}
  if (hasWordPrefix(index.tags, token)) {score += 55;}
  if (index.tags.includes(token)) {score += 45;}
  if (hasWordPrefix(index.domain, token)) {score += 42;}
  if (index.domain.includes(token)) {score += 38;}
  if (hasWordPrefix(index.folderPath, token)) {score += 34;}
  if (index.folderPath.includes(token)) {score += 28;}
  if (index.url.includes(token)) {score += 18;}

  return score;
}

function hasWordPrefix(text, token) {
  if (!text || !token) {return false;}
  return text
    .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
    .some(word => word.startsWith(token));
}

function getSearchTokens(query) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s/._~:?#[\]@!$&'()*+,;=%-]+/g, ' ')
    .trim();
}

function highlightSearchText(value) {
  const text = String(value || '');
  const tokens = getSearchTokens(state.searchQuery)
    .filter(token => token.length > 0)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0) {return esc(text);}

  let highlighted = esc(text);
  tokens.forEach(token => {
    const safeToken = esc(token);
    if (!safeToken) {return;}

    const regex = new RegExp(`(${escapeRegex(safeToken)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark class="search-hit">$1</mark>');
  });

  return highlighted;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getUrlDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function renderPopupList() {
  const container = $('#popup-bookmarks');
  if (!container) {return;}
  
  if (state.filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <h3>${i18n.t('noBookmarks')}</h3>
        <p>${i18n.t('noBookmarksDesc')}</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  state.filtered.forEach(bm => {
    const index = state.searchIndex.get(bm.id);
    const folderPath = index?.folderPathDisplay || '';
    const showFolderPath = state.searchQuery && folderPath;

    html += `
      <div class="popup-bookmark-item" data-id="${bm.id}">
        ${getFaviconHtml(bm.url, bm.title, 'popup-bookmark-avatar')}
        <div class="popup-bookmark-info">
          <div class="popup-bookmark-title">${highlightSearchText(bm.title || 'Untitled')}</div>
          <div class="popup-bookmark-url">${highlightSearchText(bm.url)}</div>
          ${showFolderPath ? `<div class="popup-bookmark-folder"><i class="fas fa-folder-open"></i> ${highlightSearchText(folderPath)}</div>` : ''}
        </div>
        <div class="popup-bookmark-actions">
          <button class="icon-btn btn-edit" data-id="${bm.id}" title="Edit">
            <i class="fas fa-pen"></i>
          </button>
          <button class="icon-btn btn-delete" data-id="${bm.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  
  container.querySelectorAll('.popup-bookmark-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) {return;}
      const bm = state.bookmarks.find(b => b.id === item.dataset.id);
      if (bm) {chrome.tabs.create({ url: bm.url });}
    });
  });
  
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });
  
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(btn.dataset.id);
    });
  });
}

function renderFullscreenTable() {
  const tbody = $('#fs-bookmark-tbody');
  const emptyState = $('#fs-empty-state');
  
  if (!tbody) {return;}
  
  if (state.filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }
  
  emptyState?.classList.add('hidden');
  
  let html = '';
  state.filtered.forEach(bm => {
    const isSelected = state.selected.has(bm.id);
    const folderPath = state.currentFolder
      ? getBookmarkFolderPath(bm)
      : state.searchIndex.get(bm.id)?.folderPathDisplay || '';
    const showFolderPath = folderPath && (state.currentFolder || state.searchQuery);
    
    // 显示子文件夹路径（当书签不在当前选中的直接子目录下时）
    
    html += `
      <tr data-id="${bm.id}" class="${isSelected ? 'selected' : ''}">
        <td class="col-check"><input type="checkbox" ${isSelected ? 'checked' : ''}></td>
        <td class="col-name">
          <div class="bookmark-info">
            ${getFaviconHtml(bm.url, bm.title, 'bookmark-avatar')}
            <div class="bookmark-name-cell">
              <span class="bookmark-title">${highlightSearchText(bm.title || 'Untitled')}</span>
              ${showFolderPath ? `<span class="bookmark-folder-path"><i class="fas fa-folder-open"></i> ${highlightSearchText(folderPath)}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="col-url">
          <div class="bookmark-url-cell">
            <a href="${esc(bm.url)}" target="_blank">${highlightSearchText(bm.url)}</a>
          </div>
        </td>
        <td class="col-actions">
          <button class="table-action-btn btn-edit" data-id="${bm.id}" title="Edit">
            <i class="fas fa-pen"></i>
          </button>
          <button class="table-action-btn delete btn-delete" data-id="${bm.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('.table-action-btn')) {return;}
      
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      toggleSelection(row.dataset.id, checkbox.checked);
    });
  });
  
  tbody.querySelectorAll('.col-check input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const row = e.target.closest('tr');
      toggleSelection(row.dataset.id, e.target.checked);
    });
  });
  
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteBookmark(btn.dataset.id));
  });
}

function toggleSelection(id, selected) {
  if (selected) {
    state.selected.add(id);
  } else {
    state.selected.delete(id);
  }
  
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) {row.classList.toggle('selected', selected);}
  
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = state.selected.size;
  const label = $(state.isFullscreen ? '#fs-selected-count' : '#popup-count');
  if (label) {
    if (state.isFullscreen) {
      label.textContent = count > 0 ? `${count} selected` : '0 selected';
    } else {
      label.textContent = count > 0 ? count : state.filtered.length;
    }
  }
  
  const batchBtn = $('#btn-fs-batch');
  if (batchBtn) {batchBtn.disabled = count === 0;}
}

// ==================== 操作 ====================
async function deleteBookmark(id) {
  if (!confirm(i18n.t('confirmDelete'))) {return;}
  
  try {
    const r = await sendMessage('DELETE_BOOKMARK', { bookmarkId: id });
    if (r.success) {
      showToast(i18n.t('bookmarkDeleted'), 'success');
      await loadData();
    }
  } catch (e) {
    showToast('Error', 'error');
  }
}

function openEditModal(id) {
  const bm = state.bookmarks.find(b => b.id === id);
  if (!bm) {return;}
  
  $('#edit-bookmark-id').value = id;
  $('#edit-title').value = bm.title || '';
  $('#edit-url').value = bm.url || '';
  $('#modal-edit-title').textContent = i18n.t('editBookmarkTitle');
  
  const folderSelect = $('#edit-folder');
  folderSelect.innerHTML = '<option value="">-- None --</option>';
  state.folders.forEach(f => {
    folderSelect.innerHTML += `<option value="${f.id}">${esc(getFolderTitle(f))}</option>`;
  });
  folderSelect.value = bm.parentId || '';
  
  openModal($('#modal-edit'));
}

function openNewModal() {
  $('#edit-bookmark-id').value = '';
  $('#edit-title').value = '';
  $('#edit-url').value = '';
  $('#modal-edit-title').textContent = i18n.t('newBookmarkTitle');
  
  const folderSelect = $('#edit-folder');
  folderSelect.innerHTML = '<option value="">-- None --</option>';
  state.folders.forEach(f => {
    folderSelect.innerHTML += `<option value="${f.id}">${esc(getFolderTitle(f))}</option>`;
  });
  folderSelect.value = state.currentFolder || '';
  
  openModal($('#modal-edit'));
}

// ==================== 文件夹操作 ====================
function openEditFolderModal(folderId) {
  if (SYSTEM_FOLDER_IDS.has(folderId)) {return;}
  const folder = state.bookmarks.find(b => b.id === folderId);
  if (!folder) {return;}
  
  $('#edit-folder-id').value = folderId;
  $('#edit-folder-name').value = folder.title || '';
  $('#modal-folder-title').textContent = i18n.t('editFolder') || 'Edit Folder';
  
  const parentSelect = $('#edit-folder-parent');
  parentSelect.innerHTML = '<option value="">-- Root --</option>';
  state.folders.forEach(f => {
    if (f.id !== folderId) {
      parentSelect.innerHTML += `<option value="${f.id}">${esc(getFolderTitle(f))}</option>`;
    }
  });
  parentSelect.value = folder.parentId || '';
  
  const submitBtn = $('#modal-folder .modal-footer .btn-primary');
  if (submitBtn) {submitBtn.textContent = i18n.t('save') || 'Save';}
  
  openModal($('#modal-folder'));
}

function openNewFolderModal() {
  $('#edit-folder-id').value = '';
  $('#edit-folder-name').value = '';
  $('#modal-folder-title').textContent = i18n.t('newFolder') || 'New Folder';
  
  const parentSelect = $('#edit-folder-parent');
  parentSelect.innerHTML = '<option value="">-- Root --</option>';
  state.folders.forEach(f => {
    parentSelect.innerHTML += `<option value="${f.id}">${esc(getFolderTitle(f))}</option>`;
  });
  parentSelect.value = state.currentFolder || '';
  
  const submitBtn = $('#modal-folder .modal-footer .btn-primary');
  if (submitBtn) {submitBtn.textContent = i18n.t('save') || 'Create';}
  
  openModal($('#modal-folder'));
}

async function saveFolder(e) {
  e.preventDefault();
  
  const id = $('#edit-folder-id').value;
  const title = $('#edit-folder-name').value.trim();
  const parentId = $('#edit-folder-parent').value || null;
  
  if (!title) {return;}
  
  try {
    if (id) {
      await sendMessage('UPDATE_FOLDER', { id, title });
    } else {
      await sendMessage('CREATE_FOLDER', { title, parentId });
    }
    
    closeAllModals();
    showToast(id ? (i18n.t('folderUpdated') || 'Folder updated') : (i18n.t('folderCreated') || 'Folder created'), 'success');
    await loadData();
  } catch (err) {
    showToast('Error saving folder', 'error');
  }
}

async function deleteFolder(folderId) {
  if (SYSTEM_FOLDER_IDS.has(folderId)) {return;}
  const folder = state.bookmarks.find(b => b.id === folderId);
  if (!folder) {return;}
  
  const msg = (i18n.t('confirmDeleteFolder') || 'Delete folder and all contents?') + `\n"${folder.title}"`;
  if (!confirm(msg)) {return;}
  
  try {
    await sendMessage('DELETE_FOLDER', { folderId });
    showToast(i18n.t('folderDeleted') || 'Folder deleted', 'success');
    
    if (state.currentFolder === folderId) {
      state.currentFolder = null;
    }
    
    await loadData();
  } catch (err) {
    showToast('Error deleting folder', 'error');
  }
}

async function saveBookmark(e) {
  e.preventDefault();
  
  const id = $('#edit-bookmark-id').value;
  const title = $('#edit-title').value.trim();
  const url = $('#edit-url').value.trim();
  const folderId = $('#edit-folder').value || null;
  
  if (!title || !url) {return;}
  
  try {
    const data = { title, url, parentId: folderId };
    
    if (id) {
      await sendMessage('UPDATE_BOOKMARK', { bookmarkId: id, ...data });
    } else {
      await sendMessage('ADD_BOOKMARK', data);
    }
    
    closeAllModals();
    showToast(i18n.t('bookmarkSaved'), 'success');
    await loadData();
  } catch (e) {
    showToast('Error saving', 'error');
  }
}

// ==================== 导入导出 ====================
async function exportBookmarks() {
  try {
    const data = {
      bookmarks: state.bookmarks.filter(b => b.url),
      folders: state.bookmarks.filter(b => !b.url),
      exportDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    if (chrome.downloads && chrome.downloads.download) {
      await chrome.downloads.download({
        url: url,
        filename: `bookmarks-${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
      });
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    
    showToast(i18n.t('exportSuccess'), 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('Export failed: ' + err.message, 'error');
  }
}

function importBookmarks() {
  $('#import-file-input').click();
}

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) {return;}
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.bookmarks) {
      let count = 0;
      for (const bm of data.bookmarks) {
        await sendMessage('ADD_BOOKMARK', {
          title: bm.title,
          url: bm.url,
          parentId: bm.parentId
        });
        count++;
      }
      showToast(i18n.t('importSuccess', count), 'success');
      await loadData();
    }
  } catch (e) {
    showToast(i18n.t('importFailed'), 'error');
  }
  
  e.target.value = '';
}

// ==================== 模态框 ====================
function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAllModals() {
  $$('.modal').forEach(m => {
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  });
}

// ==================== Toast ====================
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${esc(message)}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==================== 更新UI ====================
function updateStats() {
  const bookmarks = state.bookmarks.filter(b => b.url).length;
  const folders = state.bookmarks.filter(b => !b.url).length;
  
  if (state.isFullscreen) {
    $('#fs-stat-bookmarks span').textContent = bookmarks;
    $('#fs-stat-folders span').textContent = folders;
    $('#fs-total-count').textContent = `${bookmarks} total`;
  } else {
    $('#popup-count').textContent = bookmarks;
  }
}

function updateResultCount() {
  const count = state.filtered.length;
  const label = state.isFullscreen ? $('#fs-result-count') : null;
  if (label) {label.textContent = `${count} ${i18n.lang() === 'zh' ? '个书签' : 'bookmarks'}`;}
}

function updateFolderTitle() {
  const titleEl = $('#fs-folder-title');
  if (!titleEl) {return;}
  if (!state.currentFolder) {
    titleEl.textContent = i18n.t('allBookmarks');
  } else {
    const folder = state.bookmarks.find(b => b.id === state.currentFolder);
    if (folder) {
      titleEl.textContent = getFolderTitle(folder);
    }
  }
}

// 获取翻译后的文件夹名
function getFolderTitle(folder) {
  const i18nKeyById = getSystemFolderI18nKeyById(folder.id);
  if (i18nKeyById) {return i18n.t(i18nKeyById);}
  const i18nKey = getSystemFolderI18nKey(folder.title);
  if (i18nKey) {return i18n.t(i18nKey);}
  return folder.title || '';
}

// 获取书签所属文件夹路径（从当前选中文件夹开始）
function getBookmarkFolderPath(bookmark, options = {}) {
  const stopAtFolderId = options.includeCurrent ? null : state.currentFolder;
  if (!bookmark.parentId || bookmark.parentId === stopAtFolderId) {return '';}
  const parts = [];
  let currentId = bookmark.parentId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = state.bookmarks.find(b => b.id === currentId);
    if (!folder) {break;}
    if (currentId === stopAtFolderId) {break;}
    parts.unshift(getFolderTitle(folder));
    currentId = folder.parentId;
  }
  return parts.join(' / ');
}

// ==================== 消息通信 ====================
function sendMessage(type, data = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('sendMessage error:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    } catch (e) {
      console.error('sendMessage exception:', e);
      resolve({ success: false, error: e.message });
    }
  });
}

// ==================== 事件绑定 ====================
function bindEvents() {
  // 小窗模式事件
  if (!state.isFullscreen) {
    $('#btn-expand')?.addEventListener('click', openFullscreen);
    
    $('#popup-search-input')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      $('#popup-clear-search').classList.toggle('hidden', !state.searchQuery);
      filterAndRender();
    });
    
    $('#popup-clear-search')?.addEventListener('click', () => {
      $('#popup-search-input').value = '';
      state.searchQuery = '';
      $('#popup-clear-search').classList.add('hidden');
      filterAndRender();
    });
    
    $('#btn-popup-theme')?.addEventListener('click', toggleTheme);
    $('#btn-popup-lang')?.addEventListener('click', toggleLanguage);
    $('#btn-popup-refresh')?.addEventListener('click', loadData);
    $('#btn-popup-import')?.addEventListener('click', importBookmarks);
    $('#btn-popup-export')?.addEventListener('click', exportBookmarks);
  }
  
  // 大屏模式事件
  if (state.isFullscreen) {
    $('#btn-fs-exit')?.addEventListener('click', exitFullscreen);
    
    $('#fs-search-input')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      $('#fs-clear-search').classList.toggle('hidden', !state.searchQuery);
      filterAndRender();
    });
    
    $('#fs-clear-search')?.addEventListener('click', () => {
      $('#fs-search-input').value = '';
      state.searchQuery = '';
      $('#fs-clear-search').classList.add('hidden');
      filterAndRender();
    });
    
    $('#btn-fs-theme')?.addEventListener('click', toggleTheme);
    $('#btn-fs-lang')?.addEventListener('click', toggleLanguage);
    $('#btn-fs-refresh')?.addEventListener('click', loadData);
    $('#btn-fs-import')?.addEventListener('click', importBookmarks);
    $('#btn-fs-export')?.addEventListener('click', exportBookmarks);
    $('#btn-fs-new')?.addEventListener('click', openNewModal);
    $('#btn-fs-new-folder')?.addEventListener('click', openNewFolderModal);
    
    $('#btn-fs-select-all')?.addEventListener('click', () => {
      const checkboxes = $$('#fs-bookmark-tbody input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        const row = cb.closest('tr');
        toggleSelection(row.dataset.id, !allChecked);
      });
    });
    
    $('#fs-check-all')?.addEventListener('change', (e) => {
      const checkboxes = $$('#fs-bookmark-tbody input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const row = cb.closest('tr');
        toggleSelection(row.dataset.id, e.target.checked);
      });
    });
  }
  
  // 模态框事件
  $$('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  $$('.modal-backdrop').forEach(bg => {
    bg.addEventListener('click', closeAllModals);
  });
  
  $('#form-bookmark')?.addEventListener('submit', saveBookmark);
  $('#form-folder')?.addEventListener('submit', saveFolder);
  
  $('#import-file-input')?.addEventListener('change', handleImport);
}

// ==================== 工具函数 ====================
function esc(str) {
  if (!str) {return '';}
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
