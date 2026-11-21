import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import QRCode from 'qrcode';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Cast,
  CheckCircle2,
  Cloud,
  Copy,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Send,
  ShieldCheck,
  Smartphone,
  Tv,
  Undo2,
  X,
} from 'lucide-react';
import type { MediaItem } from '../types/media';

interface TvBridgeModalProps {
  pairCode: string;
  items: MediaItem[];
  tvMode: boolean;
  cloudUser: User | null;
  onSignInCloud: () => void;
  onToggleTvMode: () => void;
  onSendLaunch: (itemId: string) => void;
  onSendSearch: (query: string) => void;
  lastNotice: string | null;
  onClose: () => void;
}

export const TvBridgeModal: React.FC<TvBridgeModalProps> = ({
  pairCode,
  items,
  tvMode,
  cloudUser,
  onSignInCloud,
  onToggleTvMode,
  onSendLaunch,
  onSendSearch,
  lastNotice,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState(items[0]?.id || '');
  const [quickQuery, setQuickQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tab, setTab] = useState<'bridge' | 'samsung'>('bridge');

  const remotePhoneUrl = `${window.location.origin}/?remote=${pairCode}`;
  const tvUrl = `${window.location.origin}/?tv=1&autostart=1&pair=${pairCode}`;

  useEffect(() => {
    QRCode.toDataURL(remotePhoneUrl, {
      width: 180,
      margin: 1,
      color: { dark: '#060911', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [remotePhoneUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="الربط السريع مع التلفاز وريموت الهاتف"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl border p-6 shadow-2xl"
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
              <Cast className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                جسر التلفاز والريموت الذكي
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                تحكم من هاتفك عبر رمز QR أو ثبّت التطبيق على تلفاز سامسونج
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

        {/* Sub-Tabs */}
        <div
          className="grid grid-cols-2 gap-1.5 rounded-xl border p-1"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('bridge')}
            className="rounded-lg py-2 text-xs font-extrabold transition-colors"
            style={{
              backgroundColor: tab === 'bridge' ? 'var(--accent-primary)' : 'transparent',
              color: tab === 'bridge' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
            }}
          >
            الربط السريع وQR
          </button>
          <button
            type="button"
            onClick={() => setTab('samsung')}
            className="rounded-lg py-2 text-xs font-extrabold transition-colors"
            style={{
              backgroundColor: tab === 'samsung' ? 'var(--accent-primary)' : 'transparent',
              color: tab === 'samsung' ? 'var(--accent-primary-ink)' : 'var(--text-secondary)',
            }}
          >
            تطبيق تلفاز سامسونج (Tizen)
          </button>
        </div>

        {tab === 'bridge' ? (
          <>
            {/* QR Code + Pair Code */}
            <div
              className="flex flex-col items-center gap-4 rounded-xl border p-4 sm:flex-row sm:justify-between"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div className="space-y-2 text-center sm:text-right">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  رمز الاقتران المباشر لهذه الجلسة
                </p>
                <p
                  className="text-3xl font-black tracking-widest tabular-nums"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {pairCode}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => copyLink(tvUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copied ? 'تم نسخ رابط التلفاز' : 'نسخ رابط التلفاز'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTvMode}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                    style={{
                      backgroundColor: tvMode ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      color: tvMode ? 'var(--accent-primary-ink)' : 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>{tvMode ? 'وضع التلفاز مفعّل' : 'وضع التلفاز هنا'}</span>
                  </button>
                </div>
              </div>

              {qrDataUrl && (
                <div className="shrink-0 space-y-1 text-center">
                  <img
                    src={qrDataUrl}
                    alt="رمز QR للتحكم من الهاتف"
                    className="h-28 w-28 rounded-xl border border-white/15 bg-white p-1.5"
                  />
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    امسح بكاميرا الهاتف كـ ريموت
                  </p>
                </div>
              )}
            </div>

            {/* Cloud Bridge Connection Status */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div className="flex items-center gap-2">
                <Cloud
                  className="h-4 w-4 shrink-0"
                  style={{ color: cloudUser ? 'var(--accent-success)' : 'var(--accent-primary)' }}
                />
                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {cloudUser
                    ? `متصل بالسحابة (${cloudUser.email}) للتحكم من أي جهاز`
                    : 'الربط السحابي عبر الإنترنت متاح فور تسجيل الدخول بحساب العائلة'}
                </span>
              </div>
              {!cloudUser && (
                <button
                  type="button"
                  onClick={onSignInCloud}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>ربط الحساب</span>
                </button>
              )}
            </div>

            {/* Remote Launch Control */}
            <div className="space-y-2">
              <label className="block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                تشغيل عمل فوراً على شاشة التلفاز
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-10 flex-1 rounded-xl border px-3 text-xs font-bold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {items
                    .filter((i) => i.published)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.story ? `${i.story} — ` : ''}
                        {i.title}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedId && onSendLaunch(selectedId)}
                  className="btn-royal inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>إرسال</span>
                </button>
              </div>
            </div>

            {/* Remote Search Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                أو إرسال كلمة بحث من الهاتف للتلفاز
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="اكتب اسم الفيلم أو القصة..."
                  className="h-10 flex-1 rounded-xl border px-3 text-xs font-semibold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (quickQuery.trim()) {
                      onSendSearch(quickQuery.trim());
                      setQuickQuery('');
                    }
                  }}
                  className="rounded-xl border px-4 text-xs font-bold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  إرسال البحث
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div
              className="space-y-2 rounded-xl border p-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <p className="text-sm font-extrabold" style={{ color: 'var(--accent-primary)' }}>
                1. التشغيل الفوري على متصفح تلفاز سامسونج بدون تثبيت
              </p>
              <p>
                افتح متصفح التلفاز على الرابط المنسوخ (مع إضافة <span dir="ltr">/?tv=1</span>). يقوم التطبيق تلقائياً بإخفاء سهم الماوس (<span dir="ltr">cursor: none</span>) وتحويل أسهم الريموت وأزرار التشغيل والرجوع (Return) للعمل كـ تطبيق أصلي تماماً.
              </p>
            </div>

            <div
              className="space-y-2 rounded-xl border p-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <p className="text-sm font-extrabold" style={{ color: 'var(--accent-primary)' }}>
                2. تثبيته كتطبيق مستقل على شاشة سامسونج (Tizen .wgt)
              </p>
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  تم تجهيز ملف <span dir="ltr" className="font-bold">/public/tizen/config.xml</span> وأيقونات التطبيق وأكواد مفاتيح ريموت سامسونج (<span dir="ltr">10009, 415, 19, 10252, 417, 412</span>).
                </li>
                <li>
                  على التلفاز: افتح <strong>Apps</strong> ثم اضغط بالريموت أرقام <strong dir="ltr">12345</strong> لتفعيل وضع المطور (Developer Mode) وأدخل IP الكمبيوتر.
                </li>
                <li>
                  نفّذ <span dir="ltr" className="font-bold">npm run build:tizen</span> لتوليد مجلد <span dir="ltr">dist-tizen/</span> متضمناً <span dir="ltr">config.xml</span> والأيقونات جاهزاً للرفع عبر <span dir="ltr">tizen package</span>.
                </li>
              </ol>
            </div>
          </div>
        )}

        {lastNotice && (
          <div
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--accent-success) 12%, transparent)',
              color: 'var(--accent-success)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{lastNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface PhoneRemoteViewProps {
  pairCode: string;
  items: MediaItem[];
  cloudUser: User | null;
  lastNotice: string | null;
  onSignInCloud: () => void;
  onSendAction: (action: string) => void;
  onSendLaunch: (itemId: string) => void;
  onExitRemoteMode: () => void;
}

export const PhoneRemoteView: React.FC<PhoneRemoteViewProps> = ({
  pairCode,
  items,
  cloudUser,
  lastNotice,
  onSignInCloud,
  onSendAction,
  onSendLaunch,
  onExitRemoteMode,
}) => {
  const [selectedId, setSelectedId] = useState(items[0]?.id || '');

  const triggerAction = (action: string) => {
    try {
      navigator.vibrate?.(16);
    } catch {
      // ignore on unsupported browsers
    }
    onSendAction(action);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between gap-5 p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                ريموت لمة البيت
              </h1>
              <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                مقترن بالشاشة رقم {pairCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExitRemoteMode}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            تصفح كمشاهد
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <span className="font-bold" style={{ color: cloudUser ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
            {cloudUser ? `متصل بالسحابة (${cloudUser.email})` : 'وضع المتصفح المحلي'}
          </span>
          {!cloudUser && (
            <button
              type="button"
              onClick={onSignInCloud}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ربط السحابة</span>
            </button>
          )}
        </div>
      </div>

      {/* Circular D-Pad */}
      <div
        className="mx-auto grid w-64 grid-cols-3 gap-3 rounded-3xl border p-5"
        style={{
          borderColor: 'var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div />
        <button
          type="button"
          aria-label="أعلى"
          onClick={() => triggerAction('up')}
          className="flex h-14 items-center justify-center rounded-2xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <div />

        <button
          type="button"
          aria-label="يمين"
          onClick={() => triggerAction('right')}
          className="flex h-14 items-center justify-center rounded-2xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => triggerAction('select')}
          className="btn-royal flex h-14 items-center justify-center rounded-2xl text-sm font-black active:scale-95"
        >
          OK
        </button>
        <button
          type="button"
          aria-label="يسار"
          onClick={() => triggerAction('left')}
          className="flex h-14 items-center justify-center rounded-2xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div />
        <button
          type="button"
          aria-label="أسفل"
          onClick={() => triggerAction('down')}
          className="flex h-14 items-center justify-center rounded-2xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <ArrowDown className="h-5 w-5" />
        </button>
        <div />
      </div>

      {/* Playback Controls */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          aria-label="ترجيع 10 ث"
          onClick={() => triggerAction('rw')}
          className="flex h-12 items-center justify-center rounded-xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="تشغيل أو إيقاف"
          onClick={() => triggerAction('playPause')}
          className="btn-royal flex h-12 items-center justify-center gap-1 rounded-xl active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          <Pause className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="تقديم 10 ث"
          onClick={() => triggerAction('ff')}
          className="flex h-12 items-center justify-center rounded-xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="رجوع"
          onClick={() => triggerAction('back')}
          className="flex h-12 items-center justify-center rounded-xl border active:scale-95"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <Undo2 className="h-5 w-5" />
        </button>
      </div>

      {lastNotice && (
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--accent-success) 12%, transparent)',
            color: 'var(--accent-success)',
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{lastNotice}</span>
        </div>
      )}

      {/* Quick Launch Selector */}
      <div
        className="space-y-2 rounded-2xl border p-4"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
          تشغيل عمل سريع على الشاشة
        </p>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-10 flex-1 rounded-xl border px-3 text-xs font-bold outline-none"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {items
              .filter((i) => i.published)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => selectedId && onSendLaunch(selectedId)}
            className="btn-royal rounded-xl px-4 text-xs font-extrabold"
          >
            تشغيل
          </button>
        </div>
      </div>
    </main>
  );
};
