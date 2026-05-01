// ==================== 常量定义 ====================

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

// 搜索评分权重
const SEARCH_SCORE = {
  TITLE_EXACT: 120,
  DOMAIN_EXACT: 100,
  TITLE_PREFIX: 70,
  TITLE_CONTAINS: 60,
  TAGS_PREFIX: 55,
  TAGS_CONTAINS: 45,
  DOMAIN_PREFIX: 42,
  DOMAIN_CONTAINS: 38,
  FOLDER_PREFIX: 34,
  FOLDER_CONTAINS: 28,
  URL_CONTAINS: 18,
  PHRASE_BONUS: 20,
};

// 防抖延迟（毫秒）
const DEBOUNCE_DELAY = 300;

// 文件夹颜色色板
const FOLDER_COLOR_PALETTE = [
  { bg: 'rgba(91, 95, 199, 0.12)', fg: '#5b5fc7' },
  { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10b981' },
  { bg: 'rgba(245, 158, 11, 0.12)', fg: '#f59e0b' },
  { bg: 'rgba(239, 68, 68, 0.12)', fg: '#ef4444' },
  { bg: 'rgba(236, 72, 153, 0.12)', fg: '#ec4899' },
  { bg: 'rgba(139, 92, 246, 0.12)', fg: '#8b5cf6' },
  { bg: 'rgba(14, 165, 233, 0.12)', fg: '#0ea5e9' },
  { bg: 'rgba(34, 197, 94, 0.12)', fg: '#22c55e' },
  { bg: 'rgba(249, 115, 22, 0.12)', fg: '#f97316' },
  { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' },
  { bg: 'rgba(20, 184, 166, 0.12)', fg: '#14b8a6' },
];

// 标签颜色色板
const TAG_COLORS = [
  '#4f46e5', '#7c3aed', '#a855f7',
  '#3b82f6', '#0ea5e9', '#06b6d4',
  '#10b981', '#22c55e', '#84cc16',
  '#f59e0b', '#f97316', '#ef4444'
];

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SYSTEM_FOLDER_IDS,
    SYSTEM_FOLDER_NAMES_MAP,
    SEARCH_SCORE,
    DEBOUNCE_DELAY,
    FOLDER_COLOR_PALETTE,
    TAG_COLORS,
  };
}
