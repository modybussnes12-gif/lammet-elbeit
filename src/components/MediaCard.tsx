import React, { useEffect, useState } from 'react';
import { Bookmark, Heart, Headphones, Play, BookOpen } from 'lucide-react';
import type { GroupedWork, WatchProgressEntry } from '../types/media';
import {
  CONTENT_TYPE_SINGULAR,
  formatDuration,
  formatRemainingMinutes,
} from '../utils/library';
import { appAsset } from '../utils/assetPath';

export type CardAspectVariant = 'portrait' | 'landscape' | 'editorial' | 'square';

interface MediaCardProps {
  work: GroupedWork;
  variant?: CardAspectVariant;
  progress?: WatchProgressEntry;
  isFavorite: boolean;
  isWatchLater: boolean;
  onOpenDetails: (work: GroupedWork) => void;
  onQuickPlay: (work: GroupedWork) => void;
  onToggleFavorite: (itemId: string) => void;
  onToggleWatchLater: (itemId: string) => void;
}

const FALLBACK_ART = appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg');

export const MediaCard: React.FC<MediaCardProps> = ({
  work,
  variant = 'portrait',
  progress,
  isFavorite,
  isWatchLater,
  onOpenDetails,
  onQuickPlay,
  onToggleFavorite,
  onToggleWatchLater,
}) => {
  const [imgSrc, setImgSrc] = useState(work.posterUrl || work.backdropUrl || FALLBACK_ART);
  useEffect(() => {
    setImgSrc(work.posterUrl || work.backdropUrl || FALLBACK_ART);
  }, [work.posterUrl, work.backdropUrl]);
  const rep = work.representative;

  const aspectClass =
    variant === 'landscape'
      ? 'aspect-video'
      : variant === 'square'
      ? 'aspect-square'
      : variant === 'editorial'
      ? 'aspect-[16/10]'
      : 'aspect-[2/3]';

  const progressRatio =
    progress && progress.duration > 0
      ? Math.min(100, Math.max(4, Math.round((progress.time / progress.duration) * 100)))
      : 0;

  const isReading = rep.contentType === 'story' || rep.contentType === 'memory';
  const isAudio = rep.contentType === 'audio';

  const metaParts: string[] = [];
  if (work.isSeriesGroup) {
    metaParts.push(`${work.seasonsCount} موسم · ${work.episodesCount} حلقة`);
  } else {
    metaParts.push(CONTENT_TYPE_SINGULAR[rep.contentType]);
  }
  if (rep.category) metaParts.push(rep.category);
  if (rep.durationSeconds && variant !== 'portrait') {
    metaParts.push(formatDuration(rep.durationSeconds));
  } else if (rep.releaseYear) {
    metaParts.push(rep.releaseYear);
  }

  return (
    <article className="group relative flex flex-col gap-2.5 text-right">
      <div
        role="button"
        tabIndex={0}
        data-focusable="true"
        onClick={() => onOpenDetails(work)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails(work);
          }
        }}
        className={`relative w-full cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 group-hover:-translate-y-1 ${aspectClass}`}
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <img
          src={imgSrc}
          alt={work.displayTitle}
          loading="lazy"
          onError={() => {
            if (imgSrc !== FALLBACK_ART) setImgSrc(FALLBACK_ART);
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Subtle bottom gradient for clean hover legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* Hover/Focus Quick Action Row */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={`تشغيل ${work.displayTitle}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickPlay(work);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-md transition-transform hover:scale-105"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-primary-ink)',
            }}
          >
            {isReading ? (
              <BookOpen className="h-4 w-4" />
            ) : isAudio ? (
              <Headphones className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <div className="flex items-center gap-1.5 opacity-95 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              type="button"
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(rep.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/65 text-white backdrop-blur-md transition-colors hover:bg-black/85"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
              />
            </button>
            <button
              type="button"
              aria-label={isWatchLater ? 'إزالة من شاهد لاحقاً' : 'حفظ للمشاهدة لاحقاً'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchLater(rep.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/65 text-white backdrop-blur-md transition-colors hover:bg-black/85"
            >
              <Bookmark
                className={`h-4 w-4 ${isWatchLater ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
              />
            </button>
          </div>
        </div>

        {/* Continue Watching Progress Bar */}
        {progressRatio > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <div
              className="h-full transition-all"
              style={{
                width: `${progressRatio}%`,
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          </div>
        )}
      </div>

      {/* Unboxed Clean Text Hierarchy (Zero Static Pills) */}
      <div className="min-w-0 px-0.5">
        <h3
          onClick={() => onOpenDetails(work)}
          className="cursor-pointer truncate text-sm font-bold leading-snug transition-colors hover:opacity-80 sm:text-[15px]"
          style={{ color: 'var(--text-primary)' }}
        >
          {work.displayTitle}
        </h3>
        <p
          className="mt-0.5 truncate text-xs font-medium tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {progress && progress.duration > 0
            ? `${formatRemainingMinutes(progress.time, progress.duration)} · ${metaParts.slice(0, 2).join(' · ')}`
            : metaParts.join(' · ')}
        </p>
      </div>
    </article>
  );
};
