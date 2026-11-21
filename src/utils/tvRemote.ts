export type RemoteAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'back'
  | 'play'
  | 'pause'
  | 'playPause'
  | 'stop'
  | 'ff'
  | 'rw'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue';

/**
 * Maps standard keyboard keys AND Samsung Tizen Smart TV remote keyCodes
 * (Return = 10009, Play = 415, Pause = 19, PlayPause = 10252, FF = 417, RW = 412,
 * Stop = 413, Color keys = 403..406) into semantic remote actions.
 */
export function mapRemoteKey(keyCode: number, key: string): RemoteAction | null {
  switch (keyCode) {
    case 37:
      return 'left';
    case 38:
      return 'up';
    case 39:
      return 'right';
    case 40:
      return 'down';
    case 13:
      return 'select';
    case 10009: // Samsung Tizen Return key
    case 461: // LG webOS Back key
    case 27: // Escape
    case 8: // Backspace
      return 'back';
    case 415:
      return 'play';
    case 19:
      return 'pause';
    case 10252:
      return 'playPause';
    case 413:
      return 'stop';
    case 417:
      return 'ff';
    case 412:
      return 'rw';
    case 403:
      return 'red';
    case 404:
      return 'green';
    case 405:
      return 'yellow';
    case 406:
      return 'blue';
    default:
      break;
  }

  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowUp':
      return 'up';
    case 'ArrowRight':
      return 'right';
    case 'ArrowDown':
      return 'down';
    case 'Enter':
      return 'select';
    case 'Escape':
    case 'XF86Back':
    case 'GoBack':
      return 'back';
    case 'MediaPlayPause':
      return 'playPause';
    case 'MediaPlay':
      return 'play';
    case 'MediaPause':
      return 'pause';
    case 'MediaStop':
      return 'stop';
    case 'MediaFastForward':
      return 'ff';
    case 'MediaRewind':
      return 'rw';
    case 'ColorF0Red':
      return 'red';
    case 'ColorF1Green':
      return 'green';
    case 'ColorF2Yellow':
      return 'yellow';
    case 'ColorF3Blue':
      return 'blue';
    default:
      return null;
  }
}

export function registerTizenTvKeys(): void {
  const w = window as unknown as {
    tizen?: {
      tvinputdevice?: {
        registerKey?: (name: string) => void;
      };
    };
  };
  const register = w.tizen?.tvinputdevice?.registerKey;
  if (typeof register !== 'function') return;

  const keys = [
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    'MediaStop',
    'MediaFastForward',
    'MediaRewind',
    'ColorF0Red',
    'ColorF1Green',
    'ColorF2Yellow',
    'ColorF3Blue',
  ];
  for (const name of keys) {
    try {
      register(name);
    } catch {
      // Ignore keys unsupported on older TV firmware
    }
  }
}

export function moveSpatialFocus(
  direction: 'up' | 'down' | 'left' | 'right',
  scopeRoot: ParentNode = document
): HTMLElement | null {
  const candidates = Array.from(
    scopeRoot.querySelectorAll<HTMLElement>('[data-focusable="true"], button, [href], input, select')
  ).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    return el.offsetParent !== null || el.getClientRects().length > 0;
  });

  if (candidates.length === 0) return null;

  const activeEl = document.activeElement as HTMLElement | null;
  const currentIdx = activeEl ? candidates.indexOf(activeEl) : -1;
  if (currentIdx < 0) {
    candidates[0].focus();
    candidates[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return candidates[0];
  }

  const currRect = candidates[currentIdx].getBoundingClientRect();
  const cx = currRect.left + currRect.width / 2;
  const cy = currRect.top + currRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === candidates[currentIdx]) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    const valid =
      (direction === 'right' && dx > 10) ||
      (direction === 'left' && dx < -10) ||
      (direction === 'down' && dy > 10) ||
      (direction === 'up' && dy < -10);

    if (!valid) continue;
    const primary = direction === 'right' || direction === 'left' ? Math.abs(dx) : Math.abs(dy);
    const secondary =
      (direction === 'right' || direction === 'left' ? Math.abs(dy) : Math.abs(dx)) * 2.2;
    const score = primary + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
  return best;
}
