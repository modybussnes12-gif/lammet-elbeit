import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GroupedWork, WatchProgressEntry } from '../types/media';
import { MediaCard, type CardAspectVariant } from './MediaCard';

interface MediaRailProps {
  title: string;
  subtitle?: string;
  works: GroupedWork[];
  variant?: CardAspectVariant;
  progressMap: Record<string, WatchProgressEntry>;
  favorites: string[];
  watchLater: string[];
  onOpenDetails: (work: GroupedWork) => void;
  onQuickPlay: (work: GroupedWork) => void;
  onToggleFavorite: (itemId: string) => void;
  onToggleWatchLater: (itemId: string) => void;
}

export const MediaRail: React.FC<MediaRailProps> = ({
  title,
  subtitle,
  works,
  variant = 'portrait',
  progressMap,
  favorites,
  watchLater,
  onOpenDetails,
  onQuickPlay,
  onToggleFavorite,
  onToggleWatchLater,
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  if (works.length === 0) return null;

  const widthClass =
    variant === 'landscape'
      ? 'w-[260px] sm:w-[300px] lg:w-[320px]'
      : variant === 'square'
      ? 'w-[170px] sm:w-[195px] lg:w-[210px]'
      : variant === 'editorial'
      ? 'w-[240px] sm:w-[270px] lg:w-[295px]'
      : 'w-[152px] sm:w-[178px] lg:w-[196px]';

  const scrollRail = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    // In RTL, negative scrollLeft moves forward (leftward), positive moves backward (rightward)
    const offset = direction === 'next' ? -420 : 420;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2
            className="text-lg font-extrabold tracking-tight sm:text-xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            type="button"
            aria-label={`السابق في ${title}`}
            onClick={() => scrollRail('prev')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`التالي في ${title}`}
            onClick={() => scrollRail('next')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {works.map((work) => (
          <div key={work.key} className={`shrink-0 snap-start ${widthClass}`}>
            <MediaCard
              work={work}
              variant={variant}
              progress={progressMap[work.representative.id]}
              isFavorite={favorites.includes(work.representative.id)}
              isWatchLater={watchLater.includes(work.representative.id)}
              onOpenDetails={onOpenDetails}
              onQuickPlay={onQuickPlay}
              onToggleFavorite={onToggleFavorite}
              onToggleWatchLater={onToggleWatchLater}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
