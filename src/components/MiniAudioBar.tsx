import React from 'react';
import { Headphones, Pause, Play, Timer, X } from 'lucide-react';
import type { MediaItem } from '../types/media';
import { formatDuration } from '../utils/library';

interface MiniAudioBarProps {
  item: MediaItem;
  playing: boolean;
  currentTime: number;
  duration: number;
  sleepMinutes: number;
  onChangeSleepMinutes: (minutes: number) => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

export const MiniAudioBar: React.FC<MiniAudioBarProps> = ({
  item,
  playing,
  currentTime,
  duration,
  sleepMinutes,
  onChangeSleepMinutes,
  onTogglePlay,
  onSeek,
  onClose,
}) => {
  const safeDur = duration > 0 ? duration : Number(item.durationSeconds || 420);
  const pct = Math.min(100, Math.round((currentTime / safeDur) * 100));

  const cycleSleep = () => {
    const order = [0, 15, 30, 60];
    const next = order[(order.indexOf(sleepMinutes) + 1) % order.length];
    onChangeSleepMinutes(next);
  };

  return (
    <aside
      aria-label="مشغل الصوتيات المصغر"
      className="fixed inset-x-3 bottom-16 z-40 mx-auto max-w-2xl rounded-2xl border p-3 shadow-2xl backdrop-blur-xl lg:bottom-4"
      style={{
        borderColor: 'var(--border-strong)',
        backgroundColor: 'var(--bg-overlay)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-900">
          {item.posterUrl ? (
            <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Headphones className="h-5 w-5 text-amber-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {formatDuration(currentTime)} / {formatDuration(safeDur)}
            </span>
          </div>

          <input
            type="range"
            aria-label="شريط تقدم الصوت"
            min={0}
            max={safeDur}
            value={Math.min(currentTime, safeDur)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer accent-amber-400"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="مؤقت النوم للصوتيات"
            title="مؤقت النوم (إيقاف / 15 / 30 / 60 دقيقة)"
            onClick={cycleSleep}
            className="flex h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-bold tabular-nums"
            style={{
              borderColor: sleepMinutes > 0 ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: sleepMinutes > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Timer className="h-3.5 w-3.5" />
            {sleepMinutes > 0 && <span>{sleepMinutes}د</span>}
          </button>

          <button
            type="button"
            aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
            onClick={onTogglePlay}
            className="btn-royal flex h-9 w-9 items-center justify-center rounded-xl"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <button
            type="button"
            aria-label="إغلاق المشغل الصوتي"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="sr-only">نسبة الاستماع {pct}%</div>
    </aside>
  );
};
