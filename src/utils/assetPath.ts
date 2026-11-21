/** Resolve app-owned files against Vite's configured deployment base path. */
export function appAsset(path: string): string {
  const clean = String(path || '').replace(/^\/+/, '');
  const base = import.meta.env?.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${clean}`;
}

export function resolveAppPath(path: unknown): string {
  const value = String(path ?? '').trim();
  if (!value) return '';
  if (value.startsWith('//')) return value;
  const base = import.meta.env?.BASE_URL || '/';
  if (value.startsWith('/') && !value.startsWith(base)) return appAsset(value);
  return value;
}
