import React, { useEffect, useMemo, useState } from 'react';
import { appAsset } from '../utils/assetPath';
import { BookOpen, Clock, Compass, HeartHandshake, Info, Play, Smile, Sparkles, X } from 'lucide-react';
import type { GroupedWork, NightMood } from '../types/media';
import { CONTENT_TYPE_SINGULAR, formatDuration, pickNightRecommendations } from '../utils/library';

interface NightPickerModalProps {
  works: GroupedWork[];
  onPlay: (work: GroupedWork) => void;
  onOpenDetails: (work: GroupedWork) => void;
  onClose: () => void;
}

const MOODS: Array<{
  id: NightMood;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}> = [
  { id: 'warm', label: 'سهرة عائلية دافئة', desc: 'أفلام وحكايات تجمع الكل', icon: HeartHandshake },
  { id: 'kids', label: 'وقت الصغار', desc: 'محتوى آمن ومبهج للأطفال', icon: Smile },
  { id: 'doc', label: 'استكشاف ومعرفة', desc: 'وثائقيات وتأملات ممتعة', icon: Compass },
  { id: 'short', label: 'حكاية أو مقطع سريع', desc: 'قراءة أو صوتيات قصيرة', icon: BookOpen },
];

const DURATIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 20, label: '20 دقيقة' },
  { minutes: 45, label: '45 دقيقة' },
  { minutes: 90, label: 'ساعة ونصف' },
  { minutes: 0, label: 'وقت مفتوح' },
];

export const NightPickerModal: React.FC<NightPickerModalProps> = ({
  works,
  onPlay,
  onOpenDetails,
  onClose,
}) => {
  const [mood, setMood] = useState<NightMood>('warm');
  const [maxMinutes, setMaxMinutes] = useState<number>(45);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const picks = useMemo(
    () => pickNightRecommendations(works, mood, maxMinutes),
    [maxMinutes, mood, works]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="رشّح لي سهرة الليلة"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border p-6 shadow-2xl"
        style={{
          borderColor: 'var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                رشّح لي سهرة الليلة
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                اختر مزاج السهرة والوقت المتاح لنختار لك أنسب 3 أعمال الآن
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mood Selector */}
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
            ما هو مزاج السهرة؟
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-focusable="true"
                  onClick={() => setMood(m.id)}
                  className="flex items-start gap-2.5 rounded-xl border p-3 text-right transition-colors"
                  style={{
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-elevated))'
                      : 'var(--bg-elevated)',
                  }}
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {m.label}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {m.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Selector */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
            <Clock className="h-3.5 w-3.5" />
            <span>الوقت المتاح لديكم</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => {
              const active = maxMinutes === d.minutes;
              return (
                <button
                  key={d.minutes}
                  type="button"
                  data-focusable="true"
                  onClick={() => setMaxMinutes(d.minutes)}
                  className="rounded-xl border py-2 text-xs font-bold tabular-nums transition-colors"
                  style={{
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: active ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recommended Picks */}
        <div className="space-y-2.5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-extrabold" style={{ color: 'var(--accent-primary)' }}>
            أفضل ترشيحات الليلة لكم
          </p>
          <div className="space-y-2.5">
            {picks.map((work) => {
              const rep = work.representative;
              return (
                <div
                  key={work.key}
                  className="flex items-center gap-3 rounded-xl border p-2.5"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <img
                    src={work.posterUrl || appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg')}
                    alt={work.displayTitle}
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {work.displayTitle}
                    </h3>
                    <p className="truncate text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {CONTENT_TYPE_SINGULAR[rep.contentType]} · {rep.category}
                      {rep.durationSeconds ? ` · ${formatDuration(rep.durationSeconds)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      data-focusable="true"
                      onClick={() => {
                        onPlay(work);
                        onClose();
                      }}
                      className="btn-royal flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>ابدأ</span>
                    </button>
                    <button
                      type="button"
                      data-focusable="true"
                      aria-label={`تفاصيل ${work.displayTitle}`}
                      onClick={() => {
                        onOpenDetails(work);
                        onClose();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
