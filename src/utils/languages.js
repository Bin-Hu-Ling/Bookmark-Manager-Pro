// 语言配置文件 - 支持中文和英文
const languages = {
  en: {
    // 应用标题
    appTitle: 'Bookmark Manager',
    
    // 头部
    refresh: 'Refresh',
    settings: 'Settings',
    language: 'Language',
    toggleFullscreen: 'Toggle fullscreen',
    
    // 搜索
    searchPlaceholder: 'Search bookmarks by name, URL, or tags...',
    clearSearch: 'Clear search',
    filterByTag: 'Filter by Tag:',
    filterByFolder: 'Filter by Folder:',
    allTags: 'All Tags',
    allFolders: 'All Folders',
    
    // 侧边栏 - 标签
    tagsTitle: 'Tags',
    addTag: 'Add Tag',
    noTags: 'No tags yet',
    
    // 侧边栏 - 文件夹
    foldersTitle: 'Folders',
    
    // 侧边栏 - 统计
    statisticsTitle: 'Statistics',
    totalBookmarks: 'Total Bookmarks',
    totalFolders: 'Total Folders',
    taggedBookmarks: 'Tagged Bookmarks',
    untaggedBookmarks: 'Untagged Bookmarks',
    
    // 主内容区
    bookmarksTitle: 'Bookmarks',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    bulkEdit: 'Bulk Edit',
    bulkEditTooltip: 'Edit multiple bookmarks at once (select bookmarks first)',
    newBookmark: 'New Bookmark',
    nameColumn: 'Name',
    urlColumn: 'URL',
    tagsColumn: 'Tags',
    actionsColumn: 'Actions',
    
    // 书签项
    editBookmark: 'Edit',
    deleteBookmark: 'Delete',
    addTagToBookmark: 'Add Tag',
    
    // 文件夹
    expand: 'Expand',
    collapse: 'Collapse',
    
    // 加载状态
    loadingBookmarks: 'Loading bookmarks...',
    noBookmarks: 'No bookmarks found',
    errorLoading: 'Error loading bookmarks',
    
    // 底部
    bookmarksCount: 'bookmarks',
    selectedCount: 'selected',
    import: 'Import',
    export: 'Export',
    
    // 模态框
    editBookmarkTitle: 'Edit Bookmark',
    manageTagsTitle: 'Manage Tags',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    
    // 表单标签
    nameLabel: 'Name',
    urlLabel: 'URL',
    tagsLabel: 'Tags',
    folderLabel: 'Folder',
    
    // 消息
    bookmarkSaved: 'Bookmark saved successfully',
    bookmarkDeleted: 'Bookmark deleted',
    tagAdded: 'Tag added',
    tagRemoved: 'Tag removed',
    
    // 错误消息
    errorSaving: 'Error saving bookmark',
    errorDeleting: 'Error deleting bookmark',
    invalidUrl: 'Please enter a valid URL',
    nameRequired: 'Name is required',
    
    // 语言切换
    switchToChinese: 'Switch to Chinese',
    switchToEnglish: 'Switch to English',
    currentLanguage: 'English'
  },
  
  zh: {
    // 应用标题
    appTitle: '书签管理器',
    
    // 头部
    refresh: '刷新',
    settings: '设置',
    language: '语言',
    toggleFullscreen: '切换全屏',
    
    // 搜索
    searchPlaceholder: '按名称、URL或标签搜索书签...',
    clearSearch: '清除搜索',
    filterByTag: '按标签筛选:',
    filterByFolder: '按文件夹筛选:',
    allTags: '所有标签',
    allFolders: '所有文件夹',
    
    // 侧边栏 - 标签
    tagsTitle: '标签',
    addTag: '添加标签',
    noTags: '暂无标签',
    
    // 侧边栏 - 文件夹
    foldersTitle: '文件夹',
    
    // 侧边栏 - 统计
    statisticsTitle: '统计',
    totalBookmarks: '书签总数',
    totalFolders: '文件夹总数',
    taggedBookmarks: '已标签书签',
    untaggedBookmarks: '未标签书签',
    
    // 主内容区
    bookmarksTitle: '书签',
    selectAll: '全选',
    deselectAll: '取消全选',
    bulkEdit: '批量编辑',
    bulkEditTooltip: '批量编辑多个书签（请先选择书签）',
    newBookmark: '新建书签',
    nameColumn: '名称',
    urlColumn: '网址',
    tagsColumn: '标签',
    actionsColumn: '操作',
    
    // 书签项
    editBookmark: '编辑',
    deleteBookmark: '删除',
    addTagToBookmark: '添加标签',
    
    // 文件夹
    expand: '展开',
    collapse: '收起',
    
    // 加载状态
    loadingBookmarks: '正在加载书签...',
    noBookmarks: '未找到书签',
    errorLoading: '加载书签时出错',
    
    // 底部
    bookmarksCount: '个书签',
    selectedCount: '个已选',
    import: '导入',
    export: '导出',
    
    // 模态框
    editBookmarkTitle: '编辑书签',
    manageTagsTitle: '管理标签',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    
    // 表单标签
    nameLabel: '名称',
    urlLabel: '网址',
    tagsLabel: '标签',
    folderLabel: '文件夹',
    
    // 消息
    bookmarkSaved: '书签保存成功',
    bookmarkDeleted: '书签已删除',
    tagAdded: '标签已添加',
    tagRemoved: '标签已移除',
    
    // 错误消息
    errorSaving: '保存书签时出错',
    errorDeleting: '删除书签时出错',
    invalidUrl: '请输入有效的网址',
    nameRequired: '名称不能为空',
    
    // 语言切换
    switchToChinese: '切换到中文',
    switchToEnglish: '切换到英文',
    currentLanguage: '中文'
  }
};

// 语言管理类
class LanguageManager {
  constructor() {
    this.currentLang = 'en'; // 默认英文
    this.loadLanguage();
  }
  
  // 从存储加载语言设置
  async loadLanguage() {
    try {
      const result = await chrome.storage.local.get(['language']);
      if (result.language) {
        this.currentLang = result.language;
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  }
  
  // 保存语言设置
  async setLanguage(lang) {
    if (languages[lang]) {
      this.currentLang = lang;
      try {
        await chrome.storage.local.set({ language: lang });
        return true;
      } catch (error) {
        console.error('Error saving language:', error);
        return false;
      }
    }
    return false;
  }
  
  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  // 获取翻译
  t(key) {
    const langData = languages[this.currentLang];
    if (!langData) {
      console.warn(`Language ${this.currentLang} not found, falling back to English`);
      return languages.en[key] || key;
    }
    
    return langData[key] || languages.en[key] || key;
  }
  
  // 获取所有支持的语言
  getSupportedLanguages() {
    return Object.keys(languages).map(code => ({
      code,
      name: code === 'en' ? 'English' : '中文',
      nativeName: code === 'en' ? 'English' : '中文'
    }));
  }
  
  // 切换语言
  async toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'zh' : 'en';
    const success = await this.setLanguage(newLang);
    if (success) {
      return newLang;
    }
    return this.currentLang;
  }
}

// 创建全局实例
const languageManager = new LanguageManager();

// 导出
export { languages, LanguageManager, languageManager };