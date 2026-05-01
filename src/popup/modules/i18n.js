// ==================== I18N 国际化模块 ====================
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

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}
