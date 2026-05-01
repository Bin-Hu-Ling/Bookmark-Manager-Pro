// ==================== 工具函数模块 ====================

// HTML 转义
function esc(str) {
  if (!str) {return '';}
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// 防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) {clearTimeout(timer);}
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// DOM 快捷选择器
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// 根据字符串生成颜色
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

// 获取 URL 域名
function getUrlDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

// 转义正则特殊字符
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc, debounce, $, $$, stringToColor, getUrlDomain, escapeRegex };
}
