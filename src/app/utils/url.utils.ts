export function isSafeReturnUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;
  if (url.startsWith('/\\')) return false;
  return true;
}

export function getSafeReturnUrl(url: unknown, fallback = '/'): string {
  return isSafeReturnUrl(url) ? url : fallback;
}