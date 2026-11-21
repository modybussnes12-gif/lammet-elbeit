import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/90 px-4 py-2 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-md"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>أنت تتصفح بدون إنترنت الآن — المكتبة المحلية وتقدمك محفوظان</span>
    </div>
  );
};

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (isInstalled || (!isInstallable && !isIOS)) return null;

  const handleClick = async () => {
    if (isIOS && !isInstallable) {
      setIosGuideOpen(true);
      return;
    }
    await install();
  };

  return (
    <>
      <button
        type="button"
        data-focusable="true"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-xl font-bold transition-transform hover:scale-[1.02] ${
          compact
            ? 'btn-glass h-9 px-3 text-xs'
            : 'btn-royal h-10 px-4 text-xs sm:text-sm'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>تثبيت التطبيق على الجهاز</span>
      </button>

      {iosGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تثبيت التطبيق على أجهزة أبل"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setIosGuideOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-2xl border p-5 shadow-2xl"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  تثبيت «لمة البيت» على آيفون / آيباد
                </h3>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setIosGuideOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-2.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2">
                <span className="font-black" style={{ color: 'var(--accent-primary)' }}>1.</span>
                <span>اضغط على أيقونة المشاركة</span>
                <Share className="inline h-4 w-4 shrink-0" />
                <span>في شريط متصفح Safari بالأسفل.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-black" style={{ color: 'var(--accent-primary)' }}>2.</span>
                <span>اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-black" style={{ color: 'var(--accent-primary)' }}>3.</span>
                <span>سيظهر التطبيق كبرنامج مستقل يعمل بملء الشاشة.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};
