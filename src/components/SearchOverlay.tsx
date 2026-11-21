import React, { useEffect, useMemo, useRef, useState } from 'react';
import { appAsset } from '../utils/assetPath';
import { Play, Search, Trash2, X } from 'lucide-react';
import type { ContentType, GroupedWork, MediaItem, ProfileId } from '../types/media';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_SINGULAR,
  filterLibraryItems,
  groupLibraryItems,
} from '../utils/library';

interface SearchOverlayProps {
  items: MediaItem[];
  profileId: ProfileId;
  searchHistory: string[];
  onAddHistory: (q: string) => void;
  onClearHistory: () => void;
  onSelectWork: (work: GroupedWork) => void;
  onQuickPlay: (work: GroupedWork) => void;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  items,
  profileId,
  searchHistory,
  onAddHistory,
  onClearHistory,
  onSelectWork,
  onQuickPlay,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const filtered = filterLibraryItems(items, {
      onlyPublished: true,
      profileId,
      contentType: typeFilter,
      query,
    });
    return groupLibraryItems(filtered).slice(0, 12);
  }, [items, profileId, query, typeFilter]);

  const pickWork = (work: GroupedWork, playNow: boolean) => {
    if (query.trim()) onAddHistory(query.trim());
    onClose();
    if (playNow) onQuickPlay(work);
    else onSelectWork(work);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="البحث في مكتبة لمة البيت"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-12 backdrop-blur-md sm:pt-20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: 'var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          className="flex items-center gap-3 border-b px-4 py-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مسلسل، فيلم، قصة، أو ذكرى عائلية..."
            className="w-full bg-transparent text-sm font-semibold outline-none sm:text-base"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            aria-label="إغلاق البحث"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Type Filter Strip */}
        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {(['all', 'series', 'movie', 'video', 'story', 'memory', 'audio'] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: active ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
                }}
              >
                {t === 'all' ? 'الكل' : CONTENT_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>

        {/* Recent History */}
        {!query.trim() && searchHistory.length > 0 && (
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="mb-2 flex items-center justify-between text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              <span>عمليات البحث الأخيرة</span>
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 hover:opacity-80"
              >
                <Trash2 className="h-3 w-3" />
                <span>مسح</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[58vh] divide-y overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
          {results.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              لا توجد نتائج مطابقة لـ "{query}"
            </div>
          ) : (
            results.map((work) => (
              <div
                key={work.key}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => pickWork(work, false)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-right"
                >
                  <img
                    src={work.posterUrl || appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg')}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {work.displayTitle}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {CONTENT_TYPE_SINGULAR[work.representative.contentType]} · {work.representative.category}
                      {work.isSeriesGroup ? ` · ${work.episodesCount} حلقة` : ''}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-label={`تشغيل ${work.displayTitle}`}
                  onClick={() => pickWork(work, true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary-ink)',
                  }}
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
