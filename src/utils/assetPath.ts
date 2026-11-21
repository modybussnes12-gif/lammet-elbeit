function getBaseUrl(): string {
  try {
    // Vite only statically replaces the exact `import.meta.env.BASE_URL` expression (without optional chaining).
    return import.meta.env.BASE_URL || '/';
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
    const srcAssetsIdx = clean.indexOf('src/assets/');
    if (srcAssetsIdx > 0) {
      clean = clean.slice(srcAssetsIdx);
    }
    return `./${clean}`;
  }

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const trimmedBase = normalizedBase.replace(/^\/+/, '');
  if (trimmedBase && clean.startsWith(trimmedBase)) {
    clean = clean.slice(trimmedBase.length).replace(/^\/+/, '');
  }
  const srcAssetsIdx = clean.indexOf('src/assets/');
  if (srcAssetsIdx > 0) {
    clean = clean.slice(srcAssetsIdx);
  }

  return `${normalizedBase}${clean}`;
}

export function appAsset(path: string, baseOverride?: string): string {
  return resolveAppPath(path, baseOverride);
}
