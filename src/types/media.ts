export type ContentType = 'movie' | 'series' | 'video' | 'story' | 'memory' | 'audio';

export type WorldId = 'all' | 'screen' | 'stories' | 'memories' | 'audio';

export type SourceType = 'demo' | 'youtube' | 'url' | 'reading' | 'audio-url' | 'image-url';

export type ThemeId = 'obsidian' | 'frost' | 'daylight';

export type ProfileId = string; // Supports built-in ('family' | 'kids' | 'adults') and custom member profiles

export interface QualitySource {
  label: string;
  url: string;
}

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
}

export interface MediaItem {
  id: string;
  title: string;
  story: string; // Group / series / collection name
  contentType: ContentType;
  category: string;
  seasonNumber?: number | null;
  episodeNumber?: number;
  durationSeconds?: number;
  introStartSec?: number;
  introEndSec?: number;
  releaseYear?: string;
  rating?: string;
  ageRating?: 'all' | 'kids' | 'adults';
  ambientColor?: string;
  description: string;
  storyText?: string;
  lessons?: string[];
  references?: string;
  sourceType: SourceType;
  youtubeUrl?: string;
  videoUrl?: string;
  backupVideoUrl?: string;
  audioUrl?: string;
  posterUrl?: string;
  backdropUrl?: string;
  subtitleUrl?: string;
  galleryUrls?: string[];
  collections?: string[];
  qualitySources?: QualitySource[];
  subtitles?: SubtitleTrack[];
  published: boolean;
  featured?: boolean;
  featuredOrder?: number;
  ownerUid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GroupedWork {
  key: string;
  isSeriesGroup: boolean;
  representative: MediaItem;
  displayTitle: string;
  posterUrl: string;
  backdropUrl: string;
  seasonsCount: number;
  episodesCount: number;
  episodes: MediaItem[];
}

export interface FamilyCollection {
  id: string;
  title: string;
  subtitle: string;
  itemIds: string[];
  order: number;
  published: boolean;
  ownerUid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FamilyNote {
  id: string;
  workKey: string;
  authorName: string;
  text: string;
  published: boolean;
  authorUid?: string;
  createdAt: number;
}

export interface WatchProgressEntry {
  itemId: string;
  time: number;
  duration: number;
  updatedAt: number;
}

export interface ProfileState {
  favorites: string[];
  watchLater: string[];
  progress: Record<string, WatchProgressEntry>;
  playCounts: Record<string, number>;
  searchHistory: string[];
  kidsMinutesUsedToday?: number;
  kidsUsageDate?: string;
}

export interface FamilyProfile {
  id: ProfileId;
  name: string;
  subtitle: string;
  badgeLetter: string;
  accent: string;
  isKids?: boolean;
  requiresPin?: boolean;
}

export interface FamilySettings {
  adminPin: string;
  kidsDailyLimitMinutes: number;
  customProfiles: FamilyProfile[];
}

export type NightMood = 'warm' | 'kids' | 'doc' | 'short';

export type AppView =
  | { name: 'home'; section?: 'all' | ContentType | 'favorites'; world?: WorldId }
  | { name: 'details'; itemId: string }
  | { name: 'watch'; itemId: string; seriesKey?: string }
  | { name: 'admin' };
