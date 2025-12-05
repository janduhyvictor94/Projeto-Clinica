// src/utils/index.js
export function createPageUrl(pageName) {
  if (!pageName) return '/';
  return `/${pageName}`;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}