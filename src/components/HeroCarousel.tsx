import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import type { GroupedWork } from '../types/media';
import { CONTENT_TYPE_SINGULAR, formatDuration } from '../utils/library';
import { appAsset } from '../utils/assetPath';

interface HeroCarouselProps {
  works: GroupedWork[];
  favorites: string[];
  onPlay: (work: GroupedWork) => void;
  onOpenDetails: (work: GroupedWork) => void;
  onToggleFavorite: (itemId: string) => void;
  onOpenNightPicker?: () => void;
}

const FALLBACK_BACKDROP = appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg');

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  works,
  favorites,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  onOpenNightPicker,
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = works.length;
  const safeIndex = count > 0 ? index % count : 0;
  const current = works[safeIndex];

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!current) return null;

  const rep = current.representative;
  const isFav = favorites.includes(rep.id);
  const isReading = rep.contentType === 'story' || rep.contentType === 'memory';
  const ambient = rep.ambientColor || '#f4ba48';

  const metaParts: string[] = [CONTENT_TYPE_SINGULAR[rep.contentType]];
  if (rep.category) metaParts.push(rep.category);
  if (rep.releaseYear) metaParts.push(rep.releaseYear);
  if (current.isSeriesGroup) {
    metaParts.push(`${current.seasonsCount} موسم · ${current.episodesCount} حلقة`);
  } else if (rep.durationSeconds) {
    metaParts.push(formatDuration(rep.durationSeconds));
  }

  return (
    <section
      aria-label="أبرز الأعمال المعروضة"
      className="relative overflow-hidden rounded-2xl border transition-shadow duration-700"
      style={{
        borderColor: 'var(--border-subtle)',
        boxShadow: `0 30px 75px -28px ${ambient}`,
      }}
    >
      {/* Dynamic Ambient Color Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-12 -top-14 h-44 opacity-40 blur-3xl transition-colors duration-700"
        style={{ background: ambient }}
      />

      <div className="relative min-h-[430px] sm:min-h-[490px] lg:h-[66vh] lg:min-h-[520px] lg:max-h-[660px]">
        <img
          key={current.key}
          src={current.backdropUrl || current.posterUrl || FALLBACK_BACKDROP}
          alt={current.displayTitle}
          className="hero-ken-burns absolute inset-0 h-full w-full object-cover"
        />

        {/* Editorial Scrims */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--hero-scrim)' }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-36"
          style={{ background: 'var(--hero-bottom-scrim)' }}
        />

        {/* Content Overlay */}
        <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-end p-6 sm:p-10 lg:min-h-[520px] lg:p-12">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-bold tracking-wide text-amber-300 tabular-nums">
              اختيار العيلة · {metaParts.join(' · ')}
            </p>

            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              {current.displayTitle}
            </h1>

            <p className="line-clamp-2 max-w-xl text-sm font-medium leading-relaxed text-slate-200 sm:text-base">
              {rep.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                data-focusable="true"
                onClick={() => onPlay(current)}
                className="btn-royal flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-extrabold"
              >
                {isReading ? (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>اقرأ الحكاية</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>شاهد الآن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-focusable="true"
                onClick={() => onOpenDetails(current)}
                className="btn-glass flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold"
              >
                <Info className="h-4 w-4" />
                <span>التفاصيل والحلقات</span>
              </button>

              <button
                type="button"
                data-focusable="true"
                aria-label={isFav ? 'إزالة من قائمتي' : 'إضافة لقائمتي'}
                onClick={() => onToggleFavorite(rep.id)}
                className="btn-glass flex h-11 w-11 items-center justify-center rounded-xl"
              >
                <Heart
                  className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                />
              </button>

              {onOpenNightPicker && (
                <button
                  type="button"
                  data-focusable="true"
                  onClick={onOpenNightPicker}
                  className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold sm:hidden"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>سهرة الليلة</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Controls & Thumbnail Selector */}
          {count > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-4">
              {/* Mobile compact dots */}
              <div className="flex items-center gap-1.5 sm:hidden">
                {works.slice(0, 5).map((item, idx) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`عرض ${item.displayTitle}`}
                    onClick={() => setIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === safeIndex ? 'w-6 bg-amber-400' : 'w-2 bg-white/35'
                    }`}
                  />
                ))}
              </div>

              {/* Tablet/Desktop thumbnail strip */}
              <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto sm:flex">
                {works.slice(0, 5).map((item, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-focusable="true"
                      onClick={() => setIndex(idx)}
                      className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-right transition-all ${
                        active
                          ? 'border-amber-400/80 bg-black/75 text-white shadow-lg'
                          : 'border-white/15 bg-black/40 text-slate-300 hover:bg-black/60'
                      }`}
                    >
                      <img
                        src={item.posterUrl || FALLBACK_BACKDROP}
                        alt=""
                        className="h-7 w-10 rounded object-cover"
                      />
                      <span className="max-w-[110px] truncate text-xs font-bold">
                        {item.displayTitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-focusable="true"
                  aria-label="الشريحة السابقة"
                  onClick={() => setIndex((prev) => (prev - 1 + count) % count)}
                  className="btn-glass flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  aria-label={paused ? 'استئناف العرض التلقائي' : 'إيقاف العرض التلقائي'}
                  onClick={() => setPaused((p) => !p)}
                  className="btn-glass flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  aria-label="الشريحة التالية"
                  onClick={() => setIndex((prev) => (prev + 1) % count)}
                  className="btn-glass flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
