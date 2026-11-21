import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Cast,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Heart,
  Image as ImageIcon,
  MessageSquareHeart,
  Play,
  Send,
} from 'lucide-react';
import type { FamilyNote, GroupedWork, MediaItem, ProfileState } from '../types/media';
import { CONTENT_TYPE_SINGULAR, formatDuration } from '../utils/library';
import { MediaCard } from './MediaCard';
import { appAsset } from '../utils/assetPath';

interface DetailsViewProps {
  work: GroupedWork;
  allWorks: GroupedWork[];
  notes: FamilyNote[];
  defaultAuthorName: string;
  profileState: ProfileState;
  onBack: () => void;
  onPlayEpisode: (item: MediaItem, work: GroupedWork) => void;
  onOpenDetails: (work: GroupedWork) => void;
  onToggleFavorite: (itemId: string) => void;
  onToggleWatchLater: (itemId: string) => void;
  onSendToTv: (item: MediaItem) => void;
  onAddNote: (workKey: string, authorName: string, text: string) => void;
}

const FALLBACK_ART = appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg');

export const DetailsView: React.FC<DetailsViewProps> = ({
  work,
  allWorks,
  notes,
  defaultAuthorName,
  profileState,
  onBack,
  onPlayEpisode,
  onOpenDetails,
  onToggleFavorite,
  onToggleWatchLater,
  onSendToTv,
  onAddNote,
}) => {
  const rep = work.representative;
  const seasons = useMemo(() => {
    const set = new Set<number>();
    for (const ep of work.episodes) {
      set.add(Number(ep.seasonNumber || 1));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [work.episodes]);

  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0] || 1);
  const [activeTab, setActiveTab] = useState<'episodes' | 'about' | 'gallery' | 'notes' | 'related'>(
    work.isSeriesGroup ? 'episodes' : 'about'
  );
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [noteAuthor, setNoteAuthor] = useState(defaultAuthorName);
  const [noteText, setNoteText] = useState('');

  const galleryImages = useMemo(() => {
    const list = [
      ...(rep.galleryUrls || []),
      work.backdropUrl,
      work.posterUrl,
    ].filter((u): u is string => Boolean(u));
    return Array.from(new Set(list));
  }, [rep.galleryUrls, work.backdropUrl, work.posterUrl]);

  const workNotes = useMemo(
    () =>
      notes
        .filter((n) => n.workKey === work.key || n.workKey === rep.id)
        .sort((a, b) => b.createdAt - a.createdAt),
    [notes, rep.id, work.key]
  );

  // Find resume candidate episode
  const resumeEpisode = useMemo(() => {
    let bestEp = work.episodes[0];
    let latestUpdate = 0;
    for (const ep of work.episodes) {
      const p = profileState.progress[ep.id];
      if (p && p.updatedAt > latestUpdate) {
        latestUpdate = p.updatedAt;
        bestEp = ep;
      }
    }
    return bestEp || rep;
  }, [profileState.progress, rep, work.episodes]);

  const seasonEpisodes = useMemo(
    () => work.episodes.filter((ep) => Number(ep.seasonNumber || 1) === selectedSeason),
    [selectedSeason, work.episodes]
  );

  const relatedWorks = useMemo(() => {
    const others = allWorks.filter((w) => w.key !== work.key);
    const direct = others.filter(
      (w) =>
        w.representative.category === rep.category ||
        w.representative.contentType === rep.contentType
    );
    if (direct.length >= 4) return direct.slice(0, 6);
    const seen = new Set(direct.map((w) => w.key));
    const extras = others.filter((w) => !seen.has(w.key));
    return [...direct, ...extras].slice(0, 6);
  }, [allWorks, rep.category, rep.contentType, work.key]);

  const isFav = profileState.favorites.includes(rep.id);
  const isSaved = profileState.watchLater.includes(rep.id);
  const isReading = rep.contentType === 'story' || rep.contentType === 'memory';
  const isAudio = rep.contentType === 'audio';
  const hasResume = Boolean(profileState.progress[resumeEpisode.id]?.time > 10);

  const metaParts: string[] = [CONTENT_TYPE_SINGULAR[rep.contentType]];
  if (rep.category) metaParts.push(rep.category);
  if (rep.releaseYear) metaParts.push(rep.releaseYear);
  if (rep.rating) metaParts.push(rep.rating);
  if (work.isSeriesGroup) {
    metaParts.push(`${work.seasonsCount} موسم · ${work.episodesCount} حلقة`);
  } else if (rep.durationSeconds) {
    metaParts.push(formatDuration(rep.durationSeconds));
  }

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(work.key, noteAuthor.trim() || defaultAuthorName, noteText.trim());
    setNoteText('');
  };

  return (
    <main className="pb-28 lg:pb-16">
      {/* Full-bleed Backdrop Hero */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <img
          src={work.backdropUrl || work.posterUrl || FALLBACK_ART}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-sm"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,9,17,0.7) 0%, rgba(6,9,17,0.88) 70%, var(--bg-canvas) 100%)',
          }}
        />

        <div className="tv-overscan relative z-10 mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <button
            type="button"
            data-focusable="true"
            onClick={onBack}
            className="btn-glass mb-6 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للمكتبة</span>
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
            <div className="w-40 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-2xl sm:w-52">
              <img
                src={work.posterUrl || FALLBACK_ART}
                alt={work.displayTitle}
                className="aspect-[2/3] w-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-4">
              <p className="text-xs font-bold text-amber-300 tabular-nums">
                {metaParts.join(' · ')}
              </p>

              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                {work.displayTitle}
              </h1>

              <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-200 sm:text-base">
                {rep.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => onPlayEpisode(resumeEpisode, work)}
                  className="btn-royal flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-extrabold"
                >
                  {isReading ? (
                    <>
                      <BookOpen className="h-4 w-4" />
                      <span>اقرأ الآن</span>
                    </>
                  ) : isAudio ? (
                    <>
                      <Headphones className="h-4 w-4" />
                      <span>استمع الآن</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {work.isSeriesGroup && hasResume
                          ? `استكمل الحلقة ${resumeEpisode.episodeNumber || 1}`
                          : work.isSeriesGroup
                          ? 'ابدأ الحلقة الأولى'
                          : hasResume
                          ? 'استكمل المشاهدة'
                          : 'شاهد الآن'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => onToggleFavorite(rep.id)}
                  className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold"
                >
                  <Heart
                    className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                  />
                  <span>{isFav ? 'في قائمتي' : 'أضف لقائمتي'}</span>
                </button>

                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => onToggleWatchLater(rep.id)}
                  className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold"
                >
                  <Bookmark
                    className={`h-4 w-4 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
                  />
                  <span>{isSaved ? 'محفوظ للمشاهدة' : 'شاهد لاحقاً'}</span>
                </button>

                {!isReading && (
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() => onSendToTv(resumeEpisode)}
                    className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold"
                  >
                    <Cast className="h-4 w-4" />
                    <span>تشغيل على التلفاز</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs & Deep Content */}
      <section className="tv-overscan mx-auto max-w-[1440px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        <div
          role="tablist"
          className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b pb-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {work.isSeriesGroup && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'episodes'}
              data-focusable="true"
              onClick={() => setActiveTab('episodes')}
              className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors"
              style={{
                backgroundColor:
                  activeTab === 'episodes' ? 'var(--accent-primary)' : 'transparent',
                color:
                  activeTab === 'episodes' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
              }}
            >
              الحلقات والمواسم ({work.episodesCount})
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            data-focusable="true"
            onClick={() => setActiveTab('about')}
            className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === 'about' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'about' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
            }}
          >
            عن العمل والدروس
          </button>
          {galleryImages.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'gallery'}
              data-focusable="true"
              onClick={() => setActiveTab('gallery')}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors"
              style={{
                backgroundColor: activeTab === 'gallery' ? 'var(--accent-primary)' : 'transparent',
                color:
                  activeTab === 'gallery' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
              }}
            >
              <ImageIcon className="h-4 w-4" />
              <span>ألبوم الصور ({galleryImages.length})</span>
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notes'}
            data-focusable="true"
            onClick={() => setActiveTab('notes')}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === 'notes' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'notes' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
            }}
          >
            <MessageSquareHeart className="h-4 w-4" />
            <span>دفتر العيلة ({workNotes.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'related'}
            data-focusable="true"
            onClick={() => setActiveTab('related')}
            className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors"
            style={{
              backgroundColor: activeTab === 'related' ? 'var(--accent-primary)' : 'transparent',
              color:
                activeTab === 'related' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
            }}
          >
            أعمال مشابهة ({relatedWorks.length})
          </button>
        </div>

        {activeTab === 'episodes' && work.isSeriesGroup && (
          <div className="space-y-4">
            {seasons.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {seasons.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-focusable="true"
                    onClick={() => setSelectedSeason(s)}
                    className="rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-colors"
                    style={{
                      borderColor:
                        selectedSeason === s ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      backgroundColor:
                        selectedSeason === s ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      color:
                        selectedSeason === s
                          ? 'var(--accent-primary-ink)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    الموسم {s}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {seasonEpisodes.map((ep) => {
                const epProg = profileState.progress[ep.id];
                const pct =
                  epProg && epProg.duration > 0
                    ? Math.min(100, Math.round((epProg.time / epProg.duration) * 100))
                    : 0;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    data-focusable="true"
                    onClick={() => onPlayEpisode(ep, work)}
                    className="group flex items-center gap-4 rounded-xl border p-3 text-right transition-colors hover:opacity-95"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      <img
                        src={ep.posterUrl || work.posterUrl || FALLBACK_ART}
                        alt={ep.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </div>
                      {pct > 0 && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, backgroundColor: 'var(--accent-primary)' }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                        الحلقة {ep.episodeNumber || 1}
                        {ep.durationSeconds ? ` · ${formatDuration(ep.durationSeconds)}` : ''}
                      </p>
                      <h3 className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        {ep.title}
                      </h3>
                      <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {ep.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="space-y-3 rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                الدروس والعبر المستفادة
              </h2>
              {rep.lessons && rep.lessons.length > 0 ? (
                <ul className="space-y-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {rep.lessons.map((lesson, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      />
                      <span>{lesson}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  عمل عائلي منتقى بعناية لتوفير وقت هادف وممتع لجميع أفراد الأسرة.
                </p>
              )}
            </div>

            <div
              className="space-y-3 rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                المصادر والمراجع والتصنيف
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {rep.references || 'مادة مضافة ومراجعة ضمن مكتبة لمة البيت العائلية الخاصة.'}
              </p>
              <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                التصنيف العمري: {rep.ageRating === 'kids' ? 'مناسب للأطفال' : rep.ageRating === 'adults' ? 'للكبار' : 'مناسب للجميع'} · مرات التشغيل: {profileState.playCounts[rep.id] || 0}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && galleryImages.length > 0 && (
          <div className="space-y-4">
            <div
              className="relative overflow-hidden rounded-2xl border bg-slate-950"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <img
                src={galleryImages[galleryIndex % galleryImages.length]}
                alt={`${work.displayTitle} - صورة ${galleryIndex + 1}`}
                className="mx-auto max-h-[460px] w-full object-contain"
              />
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="الصورة السابقة"
                    onClick={() =>
                      setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)
                    }
                    className="btn-glass absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="الصورة التالية"
                    onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)}
                    className="btn-glass absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={imgUrl + idx}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity"
                    style={{
                      borderColor:
                        idx === galleryIndex % galleryImages.length
                          ? 'var(--accent-primary)'
                          : 'transparent',
                      opacity: idx === galleryIndex % galleryImages.length ? 1 : 0.6,
                    }}
                  >
                    <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {workNotes.length === 0 ? (
                <div
                  className="rounded-2xl border p-8 text-center"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    لا توجد تعليقات عائلية مسجلة هنا بعد
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    اتركوا ذكرى أو رأياً دافئاً ليبقى في دفتر البيت.
                  </p>
                </div>
              ) : (
                workNotes.map((note) => (
                  <article
                    key={note.id}
                    className="space-y-2 rounded-2xl border p-4"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold" style={{ color: 'var(--accent-primary)' }}>
                        {note.authorName}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {note.text}
                    </p>
                  </article>
                ))
              )}
            </div>

            <form
              onSubmit={handleSubmitNote}
              className="h-fit space-y-3 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <h2 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                أضف كلمة لدفتر العيلة
              </h2>
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  الاسم
                </label>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  placeholder="مثال: بابا، ماما، سارة..."
                  className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  الملاحظة أو الذكرى
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="ما أجمل ما في هذا العمل؟"
                  className="w-full rounded-xl border p-3 text-xs font-semibold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <button
                type="submit"
                data-focusable="true"
                className="btn-royal flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold"
              >
                <Send className="h-3.5 w-3.5" />
                <span>حفظ في دفتر البيت</span>
              </button>
            </form>
          </div>
        )}

        {activeTab === 'related' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {relatedWorks.map((item) => (
              <MediaCard
                key={item.key}
                work={item}
                progress={profileState.progress[item.representative.id]}
                isFavorite={profileState.favorites.includes(item.representative.id)}
                isWatchLater={profileState.watchLater.includes(item.representative.id)}
                onOpenDetails={onOpenDetails}
                onQuickPlay={(w) => onPlayEpisode(w.representative, w)}
                onToggleFavorite={onToggleFavorite}
                onToggleWatchLater={onToggleWatchLater}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
