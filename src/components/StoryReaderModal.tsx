import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Minus, Moon, Plus, Sun, Timer, Volume2, VolumeX, X } from 'lucide-react';
import type { MediaItem } from '../types/media';

interface StoryReaderModalProps {
  item: MediaItem;
  onClose: () => void;
}

export const StoryReaderModal: React.FC<StoryReaderModalProps> = ({ item, onClose }) => {
  const [fontSize, setFontSize] = useState(19);
  const [warmPaper, setWarmPaper] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const stopSpeech = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setSpeaking(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeech();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      stopSpeech();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (sleepMinutes <= 0) return;
    const t = window.setTimeout(() => {
      stopSpeech();
      onClose();
    }, sleepMinutes * 60_000);
    return () => window.clearTimeout(t);
  }, [sleepMinutes, onClose]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setScrollPct(100);
      return;
    }
    setScrollPct(Math.min(100, Math.round((el.scrollTop / max) * 100)));
  };

  const paragraphs = (item.storyText || item.description || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      stopSpeech();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const text = `${item.title}. ${paragraphs.join(' ')}`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ar-SA';
      utter.rate = 0.95;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  };

  const cycleSleepTimer = () => {
    const order = [0, 15, 30];
    const next = order[(order.indexOf(sleepMinutes) + 1) % order.length];
    setSleepMinutes(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`قراءة ${item.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-0 sm:p-6 backdrop-blur-md"
      onClick={() => {
        stopSpeech();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden sm:h-[88vh] sm:rounded-2xl sm:border"
        style={{
          backgroundColor: warmPaper ? '#fbf5e9' : '#0b1220',
          color: warmPaper ? '#2a2117' : '#edf2fb',
          borderColor: warmPaper ? 'rgba(42,33,23,0.14)' : 'rgba(255,255,255,0.12)',
        }}
      >
        {/* Top Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6"
          style={{
            borderColor: warmPaper ? 'rgba(42,33,23,0.12)' : 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <BookOpen className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate text-sm font-extrabold">{item.title}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {'speechSynthesis' in window && (
              <button
                type="button"
                aria-label={speaking ? 'إيقاف القراءة الصوتية' : 'استمع للحكاية بصوت آلي'}
                onClick={toggleReadAloud}
                className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold ${
                  speaking
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-current/15 hover:bg-current/10'
                }`}
              >
                {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{speaking ? 'إيقاف الصوت' : 'اقرأ بصوت'}</span>
              </button>
            )}

            <button
              type="button"
              aria-label="مؤقت النوم للقراءة"
              onClick={cycleSleepTimer}
              className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-bold tabular-nums ${
                sleepMinutes > 0
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                  : 'border-current/15 hover:bg-current/10'
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              <span>{sleepMinutes > 0 ? `${sleepMinutes}د` : ''}</span>
            </button>

            <button
              type="button"
              aria-label="تصغير الخط"
              onClick={() => setFontSize((s) => Math.max(15, s - 2))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-current/15 hover:bg-current/10"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-xs font-bold tabular-nums">{fontSize}</span>
            <button
              type="button"
              aria-label="تكبير الخط"
              onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-current/15 hover:bg-current/10"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              aria-label={warmPaper ? 'تفعيل الوضع الليلي' : 'تفعيل وضع الورق الدافئ'}
              onClick={() => setWarmPaper((w) => !w)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-current/15 hover:bg-current/10"
            >
              {warmPaper ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              aria-label="إغلاق القارئ"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-current/15 hover:bg-current/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reading Progress Bar */}
        <div className="h-1 w-full bg-current/10">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${scrollPct}%` }}
          />
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-8 sm:px-10"
        >
          <div className="space-y-2 border-b border-current/10 pb-5">
            <p className="text-xs font-bold text-amber-500">
              {item.category} · {item.story || 'لمة البيت'}
            </p>
            <h2 className="text-2xl font-black sm:text-3xl">{item.title}</h2>
          </div>

          <div className="space-y-5 leading-loose" style={{ fontSize: `${fontSize}px` }}>
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {item.lessons && item.lessons.length > 0 && (
            <div className="rounded-xl border border-current/15 bg-current/[0.04] p-5">
              <h3 className="mb-2 text-sm font-extrabold text-amber-500">العبر والدروس</h3>
              <ul className="space-y-1.5 text-sm leading-relaxed">
                {item.lessons.map((l, i) => (
                  <li key={i}>• {l}</li>
                ))}
              </ul>
            </div>
          )}

          {item.references && (
            <p className="border-t border-current/10 pt-4 text-xs opacity-75">
              المصدر: {item.references}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
