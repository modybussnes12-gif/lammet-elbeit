import type { ContentType, MediaItem, SourceType } from '../types/media';
import { resolveAppPath } from '../utils/assetPath';

export type LegacyEpisode = Record<string, unknown>;

export type AdaptedMediaItem = MediaItem & {
  _legacyRaw?: LegacyEpisode;
  _legacyOriginalContentType?: string;
  _legacyMappedContentType?: ContentType;
  _legacyOriginalSourceType?: string;
  _legacyMappedSourceType?: SourceType;
  imageUrl?: string;
  mediaUrl?: string;
  eventDate?: string;
  timelineStatus?: string;
  timelineOrder?: number;
  storagePath?: string;
};

const CONTENT_TYPES = new Set<ContentType>(['movie', 'series', 'video', 'story', 'memory', 'audio']);
const SOURCE_TYPES = new Set<SourceType>(['demo', 'youtube', 'url', 'reading', 'audio-url', 'image-url']);

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

function number(value: unknown, fallback = 0): number {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return Number((value as { toMillis: () => number }).toMillis()) || fallback;
  }
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function mapContentType(value: unknown): ContentType {
  const raw = text(value, 'story');
  if (CONTENT_TYPES.has(raw as ContentType)) return raw as ContentType;
  // The legacy library also has photo and event records. Keep them visible
  // using the closest supported presentation type while retaining the raw type.
  if (raw === 'photo' || raw === 'event') return 'memory';
  return 'story';
}

function mapSourceType(raw: LegacyEpisode, contentType: ContentType): SourceType {
  const value = text(raw.sourceType);
  if (SOURCE_TYPES.has(value as SourceType)) return value as SourceType;
  if (value === 'upload') return 'url';
  if (value === 'image-upload') return 'image-url';
  if (value === 'audio-upload') return 'audio-url';
  if (value === 'event') return 'reading';
  if (raw.youtubeUrl) return 'youtube';
  if (contentType === 'audio' && (raw.audioUrl || raw.mediaUrl)) return 'audio-url';
  if (contentType === 'memory' && (raw.imageUrl || raw.photoUrl || raw.mediaUrl)) return 'image-url';
  if (raw.videoUrl || raw.mediaUrl) return 'url';
  if (raw.storyText) return 'reading';
  return 'reading';
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value).trim();
    if (candidate) return resolveAppPath(candidate);
  }
  return '';
}

export function fromLegacyEpisode(id: string, rawValue: LegacyEpisode): MediaItem {
  const raw = rawValue || {};
  const originalContentType = text(raw.contentType, 'story');
  const contentType = mapContentType(originalContentType);
  const originalSourceType = text(raw.sourceType, '');
  const sourceType = mapSourceType(raw, contentType);
  const posterUrl = firstText(
    raw.posterUrl,
    raw.posterURL,
    raw.coverUrl,
    raw.coverURL,
    raw.cover,
    raw.thumbnailUrl,
    raw.thumbnailURL,
    raw.thumbnail,
    raw.poster,
    raw.imageUrl,
    raw.imageURL,
    raw.image,
    raw.photoUrl,
    raw.photoURL,
    raw.artworkUrl,
    raw.backgroundImageUrl,
    raw.posterImage,
    contentType === 'memory' ? raw.mediaUrl : ''
  );
  const backdropUrl = firstText(raw.backdropUrl, posterUrl);
  const createdAt = number(raw.createdAt ?? raw.addedAt, Date.now());
  const updatedAt = number(raw.updatedAt ?? raw.createdAt ?? raw.addedAt, createdAt);

  const adapted: AdaptedMediaItem = {
    ...raw,
    id: id || text(raw.id),
    title: text(raw.title, 'بدون عنوان'),
    story: text(raw.story || raw.seriesTitle || raw.groupTitle || raw.title, 'لمة البيت'),
    contentType,
    category: text(raw.category, contentType === 'movie' ? 'أفلام عائلية' : 'أخرى'),
    seasonNumber: raw.seasonNumber == null ? null : number(raw.seasonNumber, 1),
    episodeNumber: raw.episodeNumber == null ? 1 : number(raw.episodeNumber, 1),
    durationSeconds: raw.durationSeconds == null ? undefined : number(raw.durationSeconds),
    introStartSec: raw.introStartSec == null ? undefined : number(raw.introStartSec),
    introEndSec: raw.introEndSec == null ? undefined : number(raw.introEndSec),
    releaseYear: text(raw.releaseYear),
    rating: text(raw.rating),
    ageRating: raw.ageRating === 'kids' || raw.ageRating === 'adults' ? raw.ageRating : 'all',
    ambientColor: text(raw.ambientColor),
    description: text(raw.description),
    storyText: text(raw.storyText),
    lessons: Array.isArray(raw.lessons) ? raw.lessons.map((value) => String(value)) : [],
    references: text(raw.references),
    sourceType,
    youtubeUrl: text(raw.youtubeUrl),
    videoUrl: firstText(raw.videoUrl, sourceType === 'url' ? raw.mediaUrl : ''),
    backupVideoUrl: text(raw.backupVideoUrl),
    audioUrl: firstText(raw.audioUrl, sourceType === 'audio-url' ? raw.mediaUrl : ''),
    posterUrl,
    backdropUrl,
    subtitleUrl: text(raw.subtitleUrl),
    galleryUrls: Array.isArray(raw.galleryUrls)
      ? raw.galleryUrls.map((value) => resolveAppPath(value))
      : [],
    collections: Array.isArray(raw.collections) ? raw.collections.map(String) : [],
    qualitySources: Array.isArray(raw.qualitySources)
      ? (raw.qualitySources as MediaItem['qualitySources'])
      : [],
    subtitles: Array.isArray(raw.subtitles) ? (raw.subtitles as MediaItem['subtitles']) : [],
    published: raw.published === true,
    featured: Boolean(raw.featured),
    featuredOrder: number(raw.featuredOrder ?? raw.timelineOrder, 999),
    createdAt,
    updatedAt,
    _legacyRaw: raw,
    _legacyOriginalContentType: originalContentType,
    _legacyMappedContentType: contentType,
    _legacyOriginalSourceType: originalSourceType,
    _legacyMappedSourceType: sourceType,
    imageUrl: text(raw.imageUrl),
    mediaUrl: text(raw.mediaUrl),
    eventDate: text(raw.eventDate),
    timelineStatus: text(raw.timelineStatus),
    timelineOrder: raw.timelineOrder == null ? undefined : number(raw.timelineOrder),
    storagePath: text(raw.storagePath),
  };
  return adapted;
}

export function toLegacyEpisode(item: MediaItem): LegacyEpisode {
  const adapted = item as AdaptedMediaItem;
  const raw = { ...(adapted._legacyRaw || {}) };
  const contentType =
    adapted._legacyOriginalContentType && item.contentType === adapted._legacyMappedContentType
      ? adapted._legacyOriginalContentType
      : item.contentType;

  // Save legacy upload aliases using the canonical source names that the old
  // production admin already understands. The special event source stays intact.
  let sourceType: string = item.sourceType;
  if (
    adapted._legacyOriginalSourceType === 'event' &&
    item.sourceType === adapted._legacyMappedSourceType
  ) {
    sourceType = 'event';
  }
  if (!['reading', 'youtube', 'url', 'image-url', 'audio-url', 'event'].includes(sourceType)) {
    sourceType = 'reading';
  }

  const isVideo = sourceType === 'url';
  const isImage = sourceType === 'image-url';
  const isAudio = sourceType === 'audio-url';

  // Keep inactive legacy source URLs too so editing another field does not erase them.
  const imageUrl = isImage
    ? item.posterUrl || adapted.imageUrl || adapted.mediaUrl || text(raw.imageUrl)
    : text(raw.imageUrl);
  const videoUrl = isVideo
    ? item.videoUrl || adapted.mediaUrl || text(raw.videoUrl)
    : text(raw.videoUrl);
  const audioUrl = isAudio
    ? item.audioUrl || adapted.mediaUrl || text(raw.audioUrl)
    : text(raw.audioUrl);
  const mediaUrl = isVideo
    ? videoUrl || text(raw.mediaUrl)
    : isImage
    ? imageUrl || text(raw.mediaUrl)
    : isAudio
    ? audioUrl || text(raw.mediaUrl)
    : text(raw.mediaUrl);

  return withoutUndefined({
    ...raw,
    id: item.id,
    title: text(item.title, 'بدون عنوان').slice(0, 200),
    story: text(item.story, 'لمة البيت').slice(0, 200),
    contentType,
    category: text(item.category, 'أخرى').slice(0, 100),
    seasonNumber: item.seasonNumber ?? null,
    episodeNumber: number(item.episodeNumber, 1),
    durationSeconds: item.durationSeconds == null ? raw.durationSeconds : number(item.durationSeconds),
    introStartSec: item.introStartSec == null ? raw.introStartSec : number(item.introStartSec),
    introEndSec: item.introEndSec == null ? raw.introEndSec : number(item.introEndSec),
    releaseYear: text(item.releaseYear || raw.releaseYear),
    rating: text(item.rating || raw.rating),
    ageRating: item.ageRating || raw.ageRating || 'all',
    ambientColor: text(item.ambientColor || raw.ambientColor),
    description: text(item.description).slice(0, 2000),
    storyText: text(item.storyText || raw.storyText),
    lessons: Array.isArray(item.lessons) ? item.lessons.slice(0, 50) : [],
    references: text(item.references).slice(0, 2000),
    sourceType,
    youtubeUrl:
      sourceType === 'youtube' ? text(item.youtubeUrl || raw.youtubeUrl) : text(raw.youtubeUrl),
    videoUrl,
    imageUrl,
    audioUrl,
    mediaUrl,
    backupVideoUrl: text(item.backupVideoUrl || raw.backupVideoUrl),
    posterUrl: text(item.posterUrl || (isImage ? imageUrl : raw.posterUrl)),
    backdropUrl: text(item.backdropUrl || raw.backdropUrl || item.posterUrl),
    subtitleUrl: text(item.subtitleUrl || raw.subtitleUrl),
    qualitySources: Array.isArray(item.qualitySources)
      ? item.qualitySources
      : raw.qualitySources || [],
    galleryUrls: Array.isArray(item.galleryUrls) ? item.galleryUrls : raw.galleryUrls || [],
    collections: Array.isArray(item.collections) ? item.collections : raw.collections || [],
    published: Boolean(item.published),
    featured: Boolean(item.featured),
    featuredOrder: number(item.featuredOrder, 999),
    timelineStatus: adapted.timelineStatus ?? raw.timelineStatus ?? '',
    timelineOrder: adapted.timelineOrder ?? raw.timelineOrder ?? Date.now(),
    eventDate: adapted.eventDate ?? raw.eventDate ?? '',
    storagePath: adapted.storagePath ?? raw.storagePath ?? '',
    createdAt: number(item.createdAt, Date.now()),
    updatedAt: Date.now(),
  });
}
