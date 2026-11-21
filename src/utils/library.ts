import type {
  ContentType,
  FamilyProfile,
  GroupedWork,
  MediaItem,
  NightMood,
  ProfileState,
  SourceType,
  WorldId,
} from '../types/media';
import { resolveAppPath } from './assetPath';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  movie: 'أفلام',
  series: 'مسلسلات',
  video: 'فيديوهات',
  story: 'قصص وحكايات',
  memory: 'ذكريات العيلة',
  audio: 'صوتيات',
};

export const CONTENT_TYPE_SINGULAR: Record<ContentType, string> = {
  movie: 'فيلم',
  series: 'مسلسل',
  video: 'فيديو',
  story: 'حكاية',
  memory: 'ذكرى عائلية',
  audio: 'مقطع صوتي',
};

export const WORLD_LABELS: Record<WorldId, string> = {
  all: 'كل العوالم',
  screen: 'الشاشة والسهرات',
  stories: 'مكتبة الحكايات',
  memories: 'أرشيف الذكريات',
  audio: 'إذاعة البيت',
};

export const CATEGORIES = [
  'أفلام عائلية',
  'قصص الأنبياء',
  'قصص قرآنية',
  'السيرة النبوية',
  'العبر والدروس',
  'قصص الصالحين',
  'وثائقيات',
  'رسوم متحركة',
  'كوميديا',
  'مغامرات',
  'دراما',
  'تعليمي',
  'ذكريات العيلة',
  'صوتيات',
  'أخرى',
] as const;

export function worldForContentType(type: ContentType): WorldId {
  if (type === 'movie' || type === 'series' || type === 'video') return 'screen';
  if (type === 'story') return 'stories';
  if (type === 'memory') return 'memories';
  return 'audio';
}

export function normalizeContentType(value: unknown): ContentType {
  if (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(CONTENT_TYPE_LABELS, value)
  ) {
    return value as ContentType;
  }
  return 'story';
}

export function normalizeSourceType(value: unknown): SourceType {
  const valid: SourceType[] = [
    'demo',
    'youtube',
    'url',
    'reading',
    'audio-url',
    'image-url',
  ];
  if (typeof value === 'string' && valid.includes(value as SourceType)) {
    return value as SourceType;
  }
  if (value === 'upload') return 'url';
  if (value === 'audio-upload') return 'audio-url';
  if (value === 'image-upload') return 'image-url';
  return 'reading';
}

export function safeHttpsUrl(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value.startsWith('/src/assets/') || value.startsWith('/') || value.startsWith('./')) {
    return value;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

export function safeExternalUrl(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value.startsWith('/src/assets/') || value.startsWith('/') || value.startsWith('./')) {
    return value;
  }
  if (/^(javascript|vbscript|data|blob|file):/i.test(value)) {
    return '';
  }
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
    ? value
    : /^[^/\s]+\.[^/\s]{2,}(\/|$)/.test(value)
    ? `https://${value}`
    : '';
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

export interface ExternalPlaybackInfo {
  mode: 'none' | 'native' | 'embed';
  playUrl: string;
  openUrl: string;
  providerLabel: string;
}

const NATIVE_MEDIA_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg|m3u8|mp3|wav|m4a|aac|flac)$/i;

export function resolveExternalPlayback(raw: unknown): ExternalPlaybackInfo {
  const normalized = safeExternalUrl(raw);
  if (!normalized) {
    return { mode: 'none', playUrl: '', openUrl: '', providerLabel: '' };
  }

  if (normalized.startsWith('/') || normalized.startsWith('./')) {
    return {
      mode: 'native',
      playUrl: resolveAppPath(normalized),
      openUrl: resolveAppPath(normalized),
      providerLabel: 'ملف محلي',
    };
  }

  try {
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = u.pathname;

    // 1. Google Drive
    if (host === 'drive.google.com' || host === 'docs.google.com') {
      const fileMatch = pathname.match(/\/file\/d\/([^/]+)/);
      const idParam = u.searchParams.get('id');
      const driveId = fileMatch?.[1] || idParam || '';
      if (driveId) {
        return {
          mode: 'embed',
          playUrl: `https://drive.google.com/file/d/${driveId}/preview`,
          openUrl: normalized,
          providerLabel: 'Google Drive',
        };
      }
    }

    // 2. Vimeo
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const vimeoMatch = pathname.match(/\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/);
      if (vimeoMatch?.[1]) {
        return {
          mode: 'embed',
          playUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
          openUrl: normalized,
          providerLabel: 'Vimeo',
        };
      }
    }

    // 3. Dailymotion
    if (host === 'dailymotion.com' || host === 'dai.ly') {
      const dmMatch =
        host === 'dai.ly'
          ? pathname.match(/^\/([A-Za-z0-9]+)/)
          : pathname.match(/\/(?:embed\/)?video\/([A-Za-z0-9]+)/);
      if (dmMatch?.[1]) {
        return {
          mode: 'embed',
          playUrl: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`,
          openUrl: normalized,
          providerLabel: 'Dailymotion',
        };
      }
    }

    // 4. Archive.org
    if (host === 'archive.org') {
      const archMatch = pathname.match(/\/(?:details|embed)\/([^/]+)/);
      if (archMatch?.[1]) {
        return {
          mode: 'embed',
          playUrl: `https://archive.org/embed/${archMatch[1]}`,
          openUrl: normalized,
          providerLabel: 'Archive.org',
        };
      }
    }

    // 5. OK.ru
    if (host === 'ok.ru' || host === 'm.ok.ru') {
      const okMatch = pathname.match(/\/(?:video|videoembed)\/(\d+)/);
      if (okMatch?.[1]) {
        return {
          mode: 'embed',
          playUrl: `https://ok.ru/videoembed/${okMatch[1]}?autoplay=1`,
          openUrl: normalized,
          providerLabel: 'OK.ru',
        };
      }
    }

    // 6. Streamable
    if (host === 'streamable.com') {
      const stMatch = pathname.match(/^\/(?:e\/)?([A-Za-z0-9]+)\/?$/);
      if (stMatch?.[1]) {
        return {
          mode: 'embed',
          playUrl: `https://streamable.com/e/${stMatch[1]}?autoplay=1`,
          openUrl: normalized,
          providerLabel: 'Streamable',
        };
      }
    }

    // 7. Facebook Watch / Video / Reel
    if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.watch') {
      return {
        mode: 'embed',
        playUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false&autoplay=1`,
        openUrl: normalized,
        providerLabel: 'Facebook',
      };
    }

    // 8. Dropbox direct raw stream
    if (host === 'dropbox.com' || host.endsWith('.dropboxusercontent.com')) {
      const rawUrl = new URL(normalized);
      if (host === 'dropbox.com') {
        rawUrl.searchParams.delete('dl');
        rawUrl.searchParams.set('raw', '1');
      }
      return {
        mode: 'native',
        playUrl: rawUrl.href,
        openUrl: normalized,
        providerLabel: 'Dropbox',
      };
    }

    // 9. Direct video/audio file extensions or Firebase/GCS storage media
    const mimeHint = (u.searchParams.get('mime') || u.searchParams.get('response-content-type') || '').toLowerCase();
    const isDirectFile =
      NATIVE_MEDIA_EXT_RE.test(pathname) ||
      mimeHint.startsWith('video/') ||
      mimeHint.startsWith('audio/') ||
      ((host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com') && !/\.html?$/i.test(pathname));

    if (isDirectFile) {
      return {
        mode: 'native',
        playUrl: normalized,
        openUrl: normalized,
        providerLabel: 'فيديو مباشر',
      };
    }

    // 10. Any other external link / embed / website -> open seamlessly in embed view with external fallback
    return {
      mode: 'embed',
      playUrl: normalized,
      openUrl: normalized,
      providerLabel: host || 'رابط خارجي',
    };
  } catch {
    return {
      mode: 'embed',
      playUrl: normalized,
      openUrl: normalized,
      providerLabel: 'رابط خارجي',
    };
  }
}

export function extractYoutubeId(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  try {
    const u = new URL(value);
    let id = '';
    if (u.hostname === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
      ].includes(u.hostname)
    ) {
      if (u.searchParams.get('v')) {
        id = u.searchParams.get('v') || '';
      } else {
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => ['embed', 'shorts', 'live'].includes(p));
        if (idx >= 0) id = parts[idx + 1] || '';
      }
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

export function resolveArtworkUrl(item: Partial<MediaItem>): string {
  const direct = safeExternalUrl(item.posterUrl || item.backdropUrl);
  if (direct) return resolveAppPath(direct);
  const yt = extractYoutubeId(item.youtubeUrl || item.videoUrl);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '';
}

export function isPlayableVideo(item: Partial<MediaItem>): boolean {
  const type = normalizeContentType(item.contentType);
  if (!['movie', 'series', 'video'].includes(type)) return false;
  if (item.sourceType === 'demo') return true;
  if (item.sourceType === 'youtube' && extractYoutubeId(item.youtubeUrl || item.videoUrl)) {
    return true;
  }
  const mediaField = (item as { mediaUrl?: unknown }).mediaUrl;
  return Boolean(
    safeExternalUrl(item.videoUrl) ||
      safeExternalUrl(item.backupVideoUrl) ||
      safeExternalUrl(mediaField)
  );
}

export function sortEpisodesOrder(a: MediaItem, b: MediaItem): number {
  const sa = Number(a.seasonNumber || 1);
  const sb = Number(b.seasonNumber || 1);
  if (sa !== sb) return sa - sb;
  const ea = Number(a.episodeNumber || 1);
  const eb = Number(b.episodeNumber || 1);
  if (ea !== eb) return ea - eb;
  return Number(a.createdAt || 0) - Number(b.createdAt || 0);
}

export function normalizeArabicText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar');
}

export function seriesGroupKey(item: MediaItem): string {
  const base = item.story?.trim() || item.title.trim();
  return normalizeArabicText(base) || item.id;
}

export function groupLibraryItems(items: MediaItem[]): GroupedWork[] {
  const regular: GroupedWork[] = [];
  const seriesMap = new Map<string, MediaItem[]>();

  for (const item of items) {
    if (item.contentType !== 'series') {
      regular.push({
        key: item.id,
        isSeriesGroup: false,
        representative: item,
        displayTitle: item.title,
        posterUrl: resolveArtworkUrl(item),
        backdropUrl: safeHttpsUrl(item.backdropUrl) || resolveArtworkUrl(item),
        seasonsCount: 1,
        episodesCount: 1,
        episodes: [item],
      });
      continue;
    }
    const key = seriesGroupKey(item);
    const bucket = seriesMap.get(key) || [];
    bucket.push(item);
    seriesMap.set(key, bucket);
  }

  for (const [key, bucket] of seriesMap.entries()) {
    const sorted = [...bucket].sort(sortEpisodesOrder);
    const seasons = new Set(sorted.map((ep) => Number(ep.seasonNumber || 1)));
    const rep = sorted.find((ep) => Boolean(resolveArtworkUrl(ep))) || sorted[0];
    const displayTitle = rep.story?.trim() || rep.title;
    regular.push({
      key: `series:${key}`,
      isSeriesGroup: true,
      representative: rep,
      displayTitle,
      posterUrl: resolveArtworkUrl(rep),
      backdropUrl: safeHttpsUrl(rep.backdropUrl) || resolveArtworkUrl(rep),
      seasonsCount: seasons.size,
      episodesCount: sorted.length,
      episodes: sorted,
    });
  }

  return regular.sort((a, b) => {
    const orderA = a.representative.featuredOrder ?? 999;
    const orderB = b.representative.featuredOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const latestA = Math.max(...a.episodes.map((e) => Number(e.updatedAt || e.createdAt || 0)));
    const latestB = Math.max(...b.episodes.map((e) => Number(e.updatedAt || e.createdAt || 0)));
    return latestB - latestA;
  });
}

export function matchesProfile(
  item: MediaItem,
  profileIdOrProfile: string | FamilyProfile
): boolean {
  const isKids =
    typeof profileIdOrProfile === 'string'
      ? profileIdOrProfile === 'kids'
      : Boolean(profileIdOrProfile.isKids || profileIdOrProfile.id === 'kids');

  if (!isKids) return true;
  if (item.ageRating === 'adults') return false;
  if (item.ageRating === 'kids') return true;
  const kidsCategories = new Set([
    'أفلام عائلية',
    'رسوم متحركة',
    'قصص الأنبياء',
    'قصص قرآنية',
    'السيرة النبوية',
    'العبر والدروس',
    'قصص الصالحين',
    'تعليمي',
    'ذكريات العيلة',
    'صوتيات',
  ]);
  return kidsCategories.has(item.category);
}

export function filterLibraryItems(
  items: MediaItem[],
  options: {
    onlyPublished?: boolean;
    profileId?: string | FamilyProfile;
    contentType?: 'all' | ContentType;
    world?: WorldId;
    category?: string;
    query?: string;
  }
): MediaItem[] {
  const {
    onlyPublished = true,
    profileId = 'family',
    contentType = 'all',
    world = 'all',
    category = 'all',
    query = '',
  } = options;
  const q = normalizeArabicText(query);

  return items.filter((item) => {
    if (onlyPublished && !item.published) return false;
    if (!matchesProfile(item, profileId)) return false;
    if (world !== 'all' && worldForContentType(item.contentType) !== world) return false;
    if (contentType !== 'all' && item.contentType !== contentType) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (!q) return true;
    const haystack = normalizeArabicText(
      [
        item.title,
        item.story,
        item.category,
        item.description,
        item.storyText,
        CONTENT_TYPE_LABELS[item.contentType],
      ].join(' ')
    );
    return haystack.includes(q);
  });
}

export function pickNightRecommendations(
  works: GroupedWork[],
  mood: NightMood,
  maxMinutes: number
): GroupedWork[] {
  const scored = works
    .map((work) => {
      const rep = work.representative;
      const mins = Math.round((rep.durationSeconds || 1200) / 60);
      let score = 0;

      if (maxMinutes > 0 && mins <= maxMinutes) score += 3;
      if (maxMinutes > 0 && mins > maxMinutes + 20) score -= 3;

      if (mood === 'warm') {
        if (['أفلام عائلية', 'العبر والدروس', 'ذكريات العيلة', 'قصص الأنبياء'].includes(rep.category)) {
          score += 5;
        }
        if (rep.contentType === 'movie' || rep.contentType === 'series') score += 2;
      } else if (mood === 'kids') {
        if (rep.ageRating === 'kids' || ['رسوم متحركة', 'قصص الأنبياء', 'أفلام عائلية'].includes(rep.category)) {
          score += 6;
        }
        if (rep.ageRating === 'adults') score -= 10;
      } else if (mood === 'doc') {
        if (rep.category === 'وثائقيات' || rep.contentType === 'video') score += 6;
      } else if (mood === 'short') {
        if (rep.contentType === 'story' || rep.contentType === 'audio' || mins <= 25) {
          score += 6;
        }
      }

      return { work, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((s) => s.work);
  }
  return works.slice(0, 3);
}

export function groupMemoriesByYear(works: GroupedWork[]): Array<{ year: string; works: GroupedWork[] }> {
  const map = new Map<string, GroupedWork[]>();
  for (const w of works) {
    const year = w.representative.releaseYear?.trim() || 'ذكريات خالدة';
    const list = map.get(year) || [];
    list.push(w);
    map.set(year, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, works: list }));
}

export function isKidsLimitReached(
  state: ProfileState,
  limitMinutes: number,
  todayKey: string
): boolean {
  if (limitMinutes <= 0) return false;
  if (state.kidsUsageDate !== todayKey) return false;
  return Number(state.kidsMinutesUsedToday || 0) >= limitMinutes;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatRemainingMinutes(time: number, duration: number): string {
  const left = Math.max(1, Math.ceil((duration - time) / 60));
  return `متبقي ${left} د`;
}
