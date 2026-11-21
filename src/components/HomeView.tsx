import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarHeart,
  Clock,
  Film,
  Headphones,
  Layers,
  Lock,
  Sparkles,
} from 'lucide-react';
import type {
  ContentType,
  FamilyCollection,
  FamilyProfile,
  GroupedWork,
  MediaItem,
  ProfileState,
  WorldId,
} from '../types/media';
import {
  CATEGORIES,
  CONTENT_TYPE_LABELS,
  WORLD_LABELS,
  filterLibraryItems,
  groupLibraryItems,
  groupMemoriesByYear,
  isKidsLimitReached,
  worldForContentType,
} from '../utils/library';
import { HeroCarousel } from './HeroCarousel';
import { MediaCard } from './MediaCard';
import { MediaRail } from './MediaRail';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeViewProps {
  items: MediaItem[];
  collections: FamilyCollection[];
  currentProfile: FamilyProfile;
  kidsDailyLimitMinutes: number;
  profileState: ProfileState;
  activeSection: 'all' | ContentType | 'favorites';
  activeWorld: WorldId;
  onSelectSection: (section: 'all' | ContentType | 'favorites') => void;
  onSelectWorld: (world: WorldId) => void;
  onOpenNightPicker: () => void;
  onOpenAdminRoute: () => void;
  onOpenDetails: (work: GroupedWork) => void;
  onQuickPlay: (work: GroupedWork) => void;
  onToggleFavorite: (itemId: string) => void;
  onToggleWatchLater: (itemId: string) => void;
}

const WORLDS: Array<{ id: WorldId; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: WORLD_LABELS.all, icon: Layers },
  { id: 'screen', label: WORLD_LABELS.screen, icon: Film },
  { id: 'stories', label: WORLD_LABELS.stories, icon: BookOpen },
  { id: 'memories', label: WORLD_LABELS.memories, icon: CalendarHeart },
  { id: 'audio', label: WORLD_LABELS.audio, icon: Headphones },
];

export const HomeView: React.FC<HomeViewProps> = ({
  items,
  collections,
  currentProfile,
  kidsDailyLimitMinutes,
  profileState,
  activeSection,
  activeWorld,
  onSelectSection,
  onSelectWorld,
  onOpenNightPicker,
  onOpenAdminRoute,
  onOpenDetails,
  onQuickPlay,
  onToggleFavorite,
  onToggleWatchLater,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const todayKey = new Date().toISOString().slice(0, 10);
  const kidsLimitHit =
    Boolean(currentProfile.isKids || currentProfile.id === 'kids') &&
    isKidsLimitReached(profileState, kidsDailyLimitMinutes, todayKey);

  const publishedForProfile = useMemo(
    () =>
      filterLibraryItems(items, {
        onlyPublished: true,
        profileId: currentProfile,
      }),
    [items, currentProfile]
  );

  const groupedAll = useMemo(
    () => groupLibraryItems(publishedForProfile),
    [publishedForProfile]
  );

  const groupedInWorld = useMemo(() => {
    if (activeWorld === 'all') return groupedAll;
    return groupedAll.filter(
      (w) => worldForContentType(w.representative.contentType) === activeWorld
    );
  }, [activeWorld, groupedAll]);

  const heroWorks = useMemo(() => {
    const base = groupedInWorld.length > 0 ? groupedInWorld : groupedAll;
    const featured = base.filter((w) => w.representative.featured);
    return featured.length > 0 ? featured : base.slice(0, 4);
  }, [groupedAll, groupedInWorld]);

  const continueWatchingWorks = useMemo(() => {
    const progressEntries = Object.values(profileState.progress)
      .filter((p) => p.duration > 0 && p.time > 10 && p.time / p.duration < 0.94)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const seen = new Set<string>();
    const result: GroupedWork[] = [];
    for (const entry of progressEntries) {
      const work = groupedAll.find(
        (w) =>
          w.representative.id === entry.itemId ||
          w.episodes.some((ep) => ep.id === entry.itemId)
      );
      if (work && !seen.has(work.key)) {
        seen.add(work.key);
        result.push(work);
      }
    }
    return result;
  }, [groupedAll, profileState.progress]);

  const myListWorks = useMemo(() => {
    const savedIds = new Set([...profileState.favorites, ...profileState.watchLater]);
    return groupedAll.filter(
      (w) =>
        savedIds.has(w.representative.id) ||
        w.episodes.some((ep) => savedIds.has(ep.id))
    );
  }, [groupedAll, profileState.favorites, profileState.watchLater]);

  const customCollectionRails = useMemo(() => {
    return collections
      .filter((col) => col.published)
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const idSet = new Set(col.itemIds);
        const works = groupedAll.filter(
          (w) =>
            idSet.has(w.representative.id) ||
            w.episodes.some((ep) => idSet.has(ep.id)) ||
            (w.representative.collections || []).includes(col.id)
        );
        return { collection: col, works };
      })
      .filter((entry) => entry.works.length > 0);
  }, [collections, groupedAll]);

  const seriesWorks = useMemo(
    () => groupedAll.filter((w) => w.representative.contentType === 'series'),
    [groupedAll]
  );

  const movieVideoWorks = useMemo(
    () =>
      groupedAll.filter(
        (w) =>
          w.representative.contentType === 'movie' ||
          w.representative.contentType === 'video'
      ),
    [groupedAll]
  );

  const storyMemoryWorks = useMemo(
    () =>
      groupedAll.filter(
        (w) =>
          w.representative.contentType === 'story' ||
          w.representative.contentType === 'memory'
      ),
    [groupedAll]
  );

  const memoriesTimeline = useMemo(() => {
    const memWorks = groupedAll.filter((w) => w.representative.contentType === 'memory');
    return groupMemoriesByYear(memWorks);
  }, [groupedAll]);

  const audioWorks = useMemo(
    () => groupedAll.filter((w) => w.representative.contentType === 'audio'),
    [groupedAll]
  );

  const exploreWorks = useMemo(() => {
    if (activeSection === 'favorites') {
      return myListWorks.filter(
        (w) => selectedCategory === 'all' || w.representative.category === selectedCategory
      );
    }
    const filtered = filterLibraryItems(items, {
      onlyPublished: true,
      profileId: currentProfile,
      contentType: activeSection === 'all' ? 'all' : activeSection,
      world: activeSection === 'all' ? activeWorld : 'all',
      category: selectedCategory,
    });
    return groupLibraryItems(filtered);
  }, [activeSection, activeWorld, currentProfile, items, myListWorks, selectedCategory]);

  const filterButtons: Array<{ id: 'all' | ContentType | 'favorites'; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: 'series', label: CONTENT_TYPE_LABELS.series },
    { id: 'movie', label: CONTENT_TYPE_LABELS.movie },
    { id: 'video', label: CONTENT_TYPE_LABELS.video },
    { id: 'story', label: 'القصص' },
    { id: 'memory', label: 'الذكريات' },
    { id: 'audio', label: CONTENT_TYPE_LABELS.audio },
    { id: 'favorites', label: 'قائمتي' },
  ];

  const isPureExplore = activeSection === 'all' && selectedCategory === 'all';

  return (
    <main className="tv-overscan mx-auto max-w-[1440px] space-y-8 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16">
      {/* Kids Screen-Time Soft Notice */}
      {kidsLimitHit && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 50%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface))',
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                اكتملت حصة المشاهدة اليومية للأطفال ({kidsDailyLimitMinutes} دقيقة)
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                حان وقت راحة العينين — يمكن الاستمتاع بقصص مسموعة هادئة أو إغلاق الشاشة لنوم هانئ.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-focusable="true"
            onClick={() => {
              onSelectSection('all');
              onSelectWorld('audio');
            }}
            className="btn-royal rounded-xl px-4 py-2 text-xs font-extrabold"
          >
            الانتقال لإذاعة البيت
          </button>
        </div>
      )}

      {/* 4 Family Worlds Bar + Night Picker Prompt */}
      <section
        aria-label="عوالم لمة البيت"
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div
          role="tablist"
          aria-label="أقسام البيت الأربعة"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-2xl border p-1.5"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {WORLDS.map((world) => {
            const Icon = world.icon;
            const active = activeWorld === world.id;
            return (
              <button
                key={world.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-focusable="true"
                onClick={() => {
                  onSelectSection('all');
                  onSelectWorld(world.id);
                }}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-extrabold transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                  color: active ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{world.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-focusable="true"
          onClick={onOpenNightPicker}
          className="btn-glass flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span>رشّح لي سهرة الليلة</span>
        </button>
      </section>

      {isPureExplore && (
        <HeroCarousel
          works={heroWorks}
          favorites={profileState.favorites}
          onPlay={onQuickPlay}
          onOpenDetails={onOpenDetails}
          onToggleFavorite={onToggleFavorite}
          onOpenNightPicker={onOpenNightPicker}
        />
      )}

      {/* Memories Year-Grouped Timeline when inside Memories World */}
      {activeWorld === 'memories' && isPureExplore && memoriesTimeline.length > 0 && (
        <section aria-label="خط زمن ذكريات العيلة" className="space-y-6">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              الخط الزمني لذكريات العيلة
            </h2>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              رحلاتنا ولقاءاتنا مرتبة سنة بسنة لتبقى حية في الذاكرة
            </p>
          </div>
          <div className="space-y-6 border-r-2 pr-5" style={{ borderColor: 'var(--border-strong)' }}>
            {memoriesTimeline.map((group) => (
              <div key={group.year} className="relative space-y-3">
                <span
                  aria-hidden="true"
                  className="absolute -right-[27px] top-1 h-3 w-3 rounded-full"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
                <h3
                  className="text-base font-black tabular-nums"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {group.year}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.works.map((work) => (
                    <MediaCard
                      key={work.key}
                      work={work}
                      variant="editorial"
                      progress={profileState.progress[work.representative.id]}
                      isFavorite={profileState.favorites.includes(work.representative.id)}
                      isWatchLater={profileState.watchLater.includes(work.representative.id)}
                      onOpenDetails={onOpenDetails}
                      onQuickPlay={onQuickPlay}
                      onToggleFavorite={onToggleFavorite}
                      onToggleWatchLater={onToggleWatchLater}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isPureExplore && activeWorld === 'all' && (
        <div className="space-y-10">
          <MediaRail
            title="أكمل المشاهدة"
            subtitle="تابع من حيث توقفت تماماً"
            works={continueWatchingWorks}
            variant="landscape"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />

          <MediaRail
            title="قائمتي وشاهد لاحقاً"
            subtitle="اختياراتك المحفوظة لسهرات العيلة"
            works={myListWorks}
            variant="portrait"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />

          {customCollectionRails.map(({ collection, works }) => (
            <MediaRail
              key={collection.id}
              title={collection.title}
              subtitle={collection.subtitle}
              works={works}
              variant="portrait"
              progressMap={profileState.progress}
              favorites={profileState.favorites}
              watchLater={profileState.watchLater}
              onOpenDetails={onOpenDetails}
              onQuickPlay={onQuickPlay}
              onToggleFavorite={onToggleFavorite}
              onToggleWatchLater={onToggleWatchLater}
            />
          ))}

          <MediaRail
            title="المسلسلات والحلقات"
            subtitle="مجمعة تلقائياً حسب المواسم والحلقات"
            works={seriesWorks}
            variant="portrait"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />

          <MediaRail
            title="الأفلام والوثائقيات"
            subtitle="عروض عائلية ووثائقيات ملهمة"
            works={movieVideoWorks}
            variant="portrait"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />

          <MediaRail
            title="الحكايات وذكريات العيلة"
            subtitle="قراءة دافئة وألبومات موثقة"
            works={storyMemoryWorks}
            variant="editorial"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />

          <MediaRail
            title="ركن الصوتيات"
            subtitle="يستمر التشغيل في الخلفية أثناء التصفح"
            works={audioWorks}
            variant="square"
            progressMap={profileState.progress}
            favorites={profileState.favorites}
            watchLater={profileState.watchLater}
            onOpenDetails={onOpenDetails}
            onQuickPlay={onQuickPlay}
            onToggleFavorite={onToggleFavorite}
            onToggleWatchLater={onToggleWatchLater}
          />
        </div>
      )}

      {/* Interactive Explore & Filter Grid */}
      <section className="space-y-5 border-t pt-8" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              {activeWorld === 'all' ? 'تصفح المكتبة الكاملة' : `استكشاف: ${WORLD_LABELS[activeWorld]}`}
            </h2>
            <p className="mt-0.5 text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {exploreWorks.length} عمل متاح في ملف المشاهدة الحالي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="تصفية حسب التصنيف"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-lg border px-3 text-xs font-bold outline-none"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">كل التصنيفات</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Segmented Type Switcher */}
        <div
          role="tablist"
          aria-label="تصفية نوع المحتوى"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {filterButtons.map((btn) => {
            const active = activeSection === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-focusable="true"
                onClick={() => onSelectSection(btn.id)}
                className="shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors"
                style={{
                  borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {exploreWorks.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              لا توجد أعمال مطابقة لهذا الفلتر حالياً
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              جرّب تغيير التصنيف أو العودة لعرض كل العوالم.
            </p>
            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                onSelectSection('all');
                onSelectWorld('all');
                setSelectedCategory('all');
              }}
              className="btn-royal mt-4 rounded-lg px-4 py-2 text-xs font-bold"
            >
              عرض كل المكتبة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {exploreWorks.map((work) => (
              <MediaCard
                key={work.key}
                work={work}
                variant={
                  work.representative.contentType === 'audio'
                    ? 'square'
                    : work.representative.contentType === 'story' ||
                      work.representative.contentType === 'memory'
                    ? 'editorial'
                    : 'portrait'
                }
                progress={profileState.progress[work.representative.id]}
                isFavorite={profileState.favorites.includes(work.representative.id)}
                isWatchLater={profileState.watchLater.includes(work.representative.id)}
                onOpenDetails={onOpenDetails}
                onQuickPlay={onQuickPlay}
                onToggleFavorite={onToggleFavorite}
                onToggleWatchLater={onToggleWatchLater}
              />
            ))}
          </div>
        )}
      </section>

      {/* Clean Family Footer + PWA Install + Discreet /admin Supervisor Route */}
      <footer
        className="flex flex-col items-start justify-between gap-4 border-t pt-8 sm:flex-row sm:items-center"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
            لمة البيت · سينما العيلة الخاصة
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            تجربة متكاملة على الهاتف، المتصفح، وتلفاز سامسونج الذكي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PWAInstallButton compact />
          <a
            href="#/admin"
            onClick={(e) => {
              e.preventDefault();
              onOpenAdminRoute();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <Lock className="h-3 w-3" />
            <span>إدارة المكتبة</span>
          </a>
        </div>
      </footer>
    </main>
  );
};
