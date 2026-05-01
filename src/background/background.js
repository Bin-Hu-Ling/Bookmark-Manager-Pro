// ============================================================
// Bookmark Manager Pro - Background Service Worker
// 修复: DELETE_BOOKMARK字段不匹配, 缺失GET_SETTINGS/DELETE_FOLDER处理
// 补全: 导入功能, 设置管理, 文件夹操作
// ============================================================

// ========== 初始化 ==========
chrome.runtime.onInstalled.addListener(async () => {
  console.warn('[BM] Extension installed/updated');
  await initializeSettings();
  await initializeTagDatabase();
  await cacheBookmarks();
});

// ========== 消息路由 ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, sendResponse);
    return true; // 保持异步通道
  }
  console.warn('[BM] Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
});

// ========== 书签事件监听 ==========
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  cacheBookmarks();
  notifyPopup('BOOKMARK_CREATED', bookmark);
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  cacheBookmarks();
  notifyPopup('BOOKMARK_CHANGED', { id, ...changeInfo });
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  cacheBookmarks();
  notifyPopup('BOOKMARK_MOVED', { id, ...moveInfo });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  removeBookmarkTags(id);
  cacheBookmarks();
  notifyPopup('BOOKMARK_REMOVED', { id, ...removeInfo });
});

// ========== 快捷键 ==========
chrome.commands.onCommand.addListener((command) => {
  if (command === 'search_bookmarks') {
    notifyPopup('FOCUS_SEARCH', {});
  }
});

// ========== 消息处理器 ==========
const messageHandlers = {
  GET_BOOKMARKS: handleGetBookmarks,
  SEARCH_BOOKMARKS: handleSearchBookmarks,
  CREATE_BOOKMARK: handleCreateBookmark,
  UPDATE_BOOKMARK: handleUpdateBookmark,
  DELETE_BOOKMARK: handleDeleteBookmark,
  MOVE_BOOKMARK: handleMoveBookmark,
  GET_TAGS: handleGetTags,
  ADD_TAG: handleAddTag,
  REMOVE_TAG: handleRemoveTag,
  CREATE_TAG: handleCreateTag,
  DELETE_TAG: handleDeleteTag,
  GET_STATISTICS: handleGetStatistics,
  EXPORT_BOOKMARKS: handleExportBookmarks,
  IMPORT_BOOKMARKS: handleImportBookmarks,
  GET_SETTINGS: handleGetSettings,
  UPDATE_SETTINGS: handleUpdateSettings,
  CREATE_FOLDER: handleCreateFolder,
  DELETE_FOLDER: handleDeleteFolder,
  UPDATE_FOLDER: handleUpdateFolder,
};

// ========== 书签 CRUD ==========

async function handleGetBookmarks(message, sendResponse) {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const flattened = flattenBookmarkTree(bookmarks[0]);
    const enriched = await enrichBookmarksWithTags(flattened);
    sendResponse({ success: true, data: enriched });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSearchBookmarks(message, sendResponse) {
  try {
    const { query, options = {} } = message;
    let results = await chrome.bookmarks.search(query);

    if (options.folderId) {
      results = results.filter(b => b.parentId === options.folderId);
    }
    if (options.type === 'folders') {
      results = results.filter(b => !b.url);
    } else if (options.type === 'bookmarks') {
      results = results.filter(b => b.url);
    }

    const enriched = await enrichBookmarksWithTags(results);
    sendResponse({ success: true, data: enriched });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCreateBookmark(message, sendResponse) {
  try {
    const { title, url, parentId, tags } = message;
    const bookmark = await chrome.bookmarks.create({
      title,
      url,
      parentId: parentId || '1'
    });

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await addTagToBookmark(bookmark.id, tag);
      }
    }

    sendResponse({ success: true, data: bookmark });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUpdateBookmark(message, sendResponse) {
  try {
    const { id, title, url, tags } = message;
    const updateData = {};
    if (title !== undefined) {updateData.title = title;}
    if (url !== undefined) {updateData.url = url;}

    const updated = Object.keys(updateData).length > 0
      ? await chrome.bookmarks.update(id, updateData)
      : await chrome.bookmarks.get(id).then(b => b[0]);

    if (tags !== undefined) {
      await updateBookmarkTags(id, tags);
    }

    sendResponse({ success: true, data: updated });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteBookmark(message, sendResponse) {
  try {
    // 修复: 兼容 id 和 bookmarkId 两种字段名
    const id = message.id || message.bookmarkId;
    if (!id) {
      sendResponse({ success: false, error: 'Bookmark ID is required' });
      return;
    }

    await chrome.bookmarks.remove(id);
    await removeBookmarkTags(id);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleMoveBookmark(message, sendResponse) {
  try {
    const { id, parentId, index } = message;
    await chrome.bookmarks.move(id, { parentId, index });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 文件夹操作 (新增) ==========

async function handleCreateFolder(message, sendResponse) {
  try {
    const { title, parentId } = message;
    const folder = await chrome.bookmarks.create({
      title: title || 'New Folder',
      parentId: parentId || '1'
    });
    sendResponse({ success: true, data: folder });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteFolder(message, sendResponse) {
  try {
    const folderId = message.id || message.folderId;
    if (!folderId) {
      sendResponse({ success: false, error: 'Folder ID is required' });
      return;
    }

    // 递归删除: chrome.bookmarks.removeTree 会删除整个文件夹树
    await chrome.bookmarks.removeTree(folderId);

    // 清理该文件夹下所有书签的标签
    const allBookmarks = await getAllCachedBookmarks();
    const folderBookmarks = allBookmarks.filter(b => b.parentId === folderId);
    for (const b of folderBookmarks) {
      await removeBookmarkTags(b.id);
    }

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUpdateFolder(message, sendResponse) {
  try {
    const { id, title } = message;
    const updated = await chrome.bookmarks.update(id, { title });
    sendResponse({ success: true, data: updated });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 标签系统 ==========

async function handleGetTags(message, sendResponse) {
  try {
    const tags = await getAllTags();
    sendResponse({ success: true, data: tags });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleAddTag(message, sendResponse) {
  try {
    const { bookmarkId, tag } = message;
    await addTagToBookmark(bookmarkId, tag);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleRemoveTag(message, sendResponse) {
  try {
    const { bookmarkId, tag } = message;
    await removeTagFromBookmark(bookmarkId, tag);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCreateTag(message, sendResponse) {
  try {
    const { name } = message;
    if (!name || !name.trim()) {
      sendResponse({ success: false, error: 'Tag name is required' });
      return;
    }
    const tagName = name.trim();
    const db = await getTagDatabase();
    if (!db.tags[tagName]) {
      db.tags[tagName] = {
        count: 0,
        color: generateTagColor(tagName),
        createdAt: Date.now()
      };
      await chrome.storage.local.set({ tagDatabase: db });
    }
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteTag(message, sendResponse) {
  try {
    const { name } = message;
    const db = await getTagDatabase();
    // 从标签定义中删除
    delete db.tags[name];
    // 从所有书签中移除该标签
    for (const [bid, tags] of Object.entries(db.bookmarkTags)) {
      const idx = tags.indexOf(name);
      if (idx !== -1) {
        tags.splice(idx, 1);
        if (tags.length === 0) {delete db.bookmarkTags[bid];}
      }
    }
    await chrome.storage.local.set({ tagDatabase: db });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 统计 ==========

async function handleGetStatistics(message, sendResponse) {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const flattened = flattenBookmarkTree(bookmarks[0]);

    const stats = {
      total: flattened.length,
      folders: flattened.filter(b => !b.url).length,
      bookmarks: flattened.filter(b => b.url).length,
      byFolder: {},
      byDate: {},
      tagDistribution: await getTagDistribution()
    };

    flattened.forEach(bookmark => {
      if (!bookmark.url) {return;}
      stats.byFolder[bookmark.parentId] = (stats.byFolder[bookmark.parentId] || 0) + 1;
      if (bookmark.dateAdded) {
        const date = new Date(bookmark.dateAdded);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        stats.byDate[monthKey] = (stats.byDate[monthKey] || 0) + 1;
      }
    });

    sendResponse({ success: true, data: stats });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 导入/导出 ==========

async function handleExportBookmarks(message, sendResponse) {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const tags = await getAllTags();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      bookmarks: bookmarks[0],
      tags
    };
    sendResponse({ success: true, data: exportData });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleImportBookmarks(message, sendResponse) {
  try {
    const { data } = message;
    if (!data || !data.bookmarks) {
      sendResponse({ success: false, error: 'Invalid import data' });
      return;
    }

    let imported = 0;
    let failed = 0;

    // 递归导入书签
    async function importNode(node, targetParentId) {
      if (node.url) {
        // 是书签
        try {
          await chrome.bookmarks.create({
            title: node.title || 'Untitled',
            url: node.url,
            parentId: targetParentId
          });
          imported++;
        } catch (e) {
          failed++;
          console.warn('[BM] Failed to import bookmark:', node.url, e.message);
        }
      } else if (node.children) {
        // 是文件夹
        try {
          const folder = await chrome.bookmarks.create({
            title: node.title || 'Imported Folder',
            parentId: targetParentId
          });
          for (const child of node.children) {
            await importNode(child, folder.id);
          }
        } catch (e) {
          failed++;
          console.warn('[BM] Failed to import folder:', node.title, e.message);
        }
      }
    }

    // 导入到"其他书签"
    const targetFolder = message.parentId || '1';
    if (data.bookmarks.children) {
      for (const child of data.bookmarks.children) {
        await importNode(child, targetFolder);
      }
    }

    // 导入标签
    if (data.tags && Array.isArray(data.tags)) {
      const db = await getTagDatabase();
      for (const tag of data.tags) {
        if (tag.name && !db.tags[tag.name]) {
          db.tags[tag.name] = {
            count: tag.count || 0,
            color: tag.color || generateTagColor(tag.name),
            createdAt: tag.createdAt || Date.now()
          };
        }
      }
      await chrome.storage.local.set({ tagDatabase: db });
    }

    await cacheBookmarks();
    sendResponse({ success: true, data: { imported, failed } });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 设置管理 (新增) ==========

async function handleGetSettings(message, sendResponse) {
  try {
    const result = await chrome.storage.sync.get('settings');
    sendResponse({ success: true, data: result.settings || getDefaultSettings() });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUpdateSettings(message, sendResponse) {
  try {
    const result = await chrome.storage.sync.get('settings');
    const current = result.settings || getDefaultSettings();
    const updated = { ...current, ...message.settings };
    await chrome.storage.sync.set({ settings: updated });
    sendResponse({ success: true, data: updated });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// ========== 核心工具函数 ==========

function getDefaultSettings() {
  return {
    theme: 'auto',
    language: navigator.language?.startsWith('zh') ? 'zh' : 'en',
    autoSync: true,
    showFavicons: true,
    enableDragDrop: true,
    searchDebounce: 300,
    itemsPerPage: 50,
    viewMode: 'table', // 'table' | 'grid' | 'tree'
    sidebarCollapsed: false
  };
}

async function initializeSettings() {
  const result = await chrome.storage.sync.get('settings');
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: getDefaultSettings() });
  }
}

async function initializeTagDatabase() {
  const result = await chrome.storage.local.get('tagDatabase');
  if (!result.tagDatabase) {
    await chrome.storage.local.set({
      tagDatabase: {
        tags: {},
        bookmarkTags: {}
      }
    });
  }
}

async function cacheBookmarks() {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const flattened = flattenBookmarkTree(bookmarks[0]);
    await chrome.storage.local.set({
      cachedBookmarks: flattened,
      lastCacheTime: Date.now()
    });
  } catch (error) {
    console.error('[BM] Error caching bookmarks:', error);
  }
}

async function getAllCachedBookmarks() {
  const result = await chrome.storage.local.get('cachedBookmarks');
  return result.cachedBookmarks || [];
}

function flattenBookmarkTree(node, parentId = null) {
  const items = [];
  const item = {
    id: node.id,
    title: node.title || '',
    url: node.url || null,
    dateAdded: node.dateAdded || null,
    dateGroupModified: node.dateGroupModified || null,
    parentId,
    index: node.index
  };
  items.push(item);

  if (node.children) {
    for (const child of node.children) {
      items.push(...flattenBookmarkTree(child, node.id));
    }
  }
  return items;
}

async function enrichBookmarksWithTags(bookmarks) {
  const db = await getTagDatabase();
  return bookmarks.map(bookmark => ({
    ...bookmark,
    tags: db.bookmarkTags[bookmark.id] || []
  }));
}

// ========== 标签数据库操作 ==========

async function getTagDatabase() {
  const result = await chrome.storage.local.get('tagDatabase');
  return result.tagDatabase || { tags: {}, bookmarkTags: {} };
}

async function getAllTags() {
  const db = await getTagDatabase();
  return Object.entries(db.tags).map(([name, data]) => ({
    name,
    count: data.count || 0,
    color: data.color || '#4f46e5',
    createdAt: data.createdAt || Date.now()
  }));
}

async function addTagToBookmark(bookmarkId, tagName) {
  const db = await getTagDatabase();

  if (!db.tags[tagName]) {
    db.tags[tagName] = {
      count: 0,
      color: generateTagColor(tagName),
      createdAt: Date.now()
    };
  }

  if (!db.bookmarkTags[bookmarkId]) {
    db.bookmarkTags[bookmarkId] = [];
  }

  if (!db.bookmarkTags[bookmarkId].includes(tagName)) {
    db.bookmarkTags[bookmarkId].push(tagName);
    db.tags[tagName].count += 1;
    await chrome.storage.local.set({ tagDatabase: db });
  }
}

async function removeTagFromBookmark(bookmarkId, tagName) {
  const db = await getTagDatabase();

  if (db.bookmarkTags[bookmarkId]) {
    const index = db.bookmarkTags[bookmarkId].indexOf(tagName);
    if (index > -1) {
      db.bookmarkTags[bookmarkId].splice(index, 1);
      if (db.bookmarkTags[bookmarkId].length === 0) {
        delete db.bookmarkTags[bookmarkId];
      }

      if (db.tags[tagName]) {
        db.tags[tagName].count = Math.max(0, db.tags[tagName].count - 1);
        if (db.tags[tagName].count === 0) {
          delete db.tags[tagName];
        }
      }

      await chrome.storage.local.set({ tagDatabase: db });
    }
  }
}

async function updateBookmarkTags(bookmarkId, newTags) {
  const db = await getTagDatabase();
  const oldTags = db.bookmarkTags[bookmarkId] || [];

  for (const tag of oldTags) {
    if (!newTags.includes(tag)) {
      await removeTagFromBookmark(bookmarkId, tag);
    }
  }

  for (const tag of newTags) {
    if (!oldTags.includes(tag)) {
      await addTagToBookmark(bookmarkId, tag);
    }
  }
}

async function removeBookmarkTags(bookmarkId) {
  const db = await getTagDatabase();
  if (db.bookmarkTags[bookmarkId]) {
    const tags = [...db.bookmarkTags[bookmarkId]];
    for (const tag of tags) {
      await removeTagFromBookmark(bookmarkId, tag);
    }
  }
}

async function getTagDistribution() {
  const db = await getTagDatabase();
  return Object.entries(db.tags).map(([name, data]) => ({
    name,
    count: data.count || 0
  }));
}

function generateTagColor(tagName) {
  const colors = [
    '#4f46e5', '#7c3aed', '#a855f7',
    '#3b82f6', '#0ea5e9', '#06b6d4',
    '#10b981', '#22c55e', '#84cc16',
    '#f59e0b', '#f97316', '#ef4444'
  ];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ========== 通知 Popup ==========

function notifyPopup(type, data) {
  chrome.runtime.sendMessage({ type, data }).catch(() => {
    // Popup 可能未打开，忽略错误
  });
}

// ========== Service Worker 保活 ==========
setInterval(() => {
  chrome.storage.local.get('lastCacheTime');
}, 25000);
