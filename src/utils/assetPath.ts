function getBaseUrl(): string {
  try {
    const meta = import.meta as ImportMeta & { env?: { BASE_URL?: string } };
    return meta?.env?.BASE_URL || '/';
  } catch {
    return '/';
  }
}

export function resolveAppPath(input: unknown, baseOverride?: string): string {
  const raw = typeof input === 'string' ? input.trim() : input == null ? '' : String(input).trim();
  if (!raw) return '';

  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('//')
  ) {
    return raw;
  }

  let clean = raw.replace(/^\.\//, '');
  if (clean.startsWith('public/')) {
    clean = clean.slice('public/'.length);
  }
  clean = clean.replace(/^\/+/, '');

  const base = (baseOverride ?? getBaseUrl()) || '/';
  if (base === './' || base === '.') {
    return `./${clean}`;
  }
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${clean}`;
}

export function appAsset(path: string, baseOverride?: string): string {
  return resolveAppPath(path, baseOverride);
}
