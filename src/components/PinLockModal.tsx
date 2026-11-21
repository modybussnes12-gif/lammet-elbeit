import React, { useEffect, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';

interface PinLockModalProps {
  title: string;
  subtitle: string;
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
  hintText?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  title,
  subtitle,
  expectedPin,
  onSuccess,
  onCancel,
  hintText,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const verifyPin = (value: string) => {
    if (value === expectedPin) {
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  const appendDigit = (digit: string) => {
    if (pin.length >= 6) return;
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length === expectedPin.length) {
      verifyPin(next);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((p) => p.slice(0, -1));
      } else if (e.key === 'Enter' && pin.length > 0) {
        e.preventDefault();
        verifyPin(pin);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-5 rounded-2xl border p-6 shadow-2xl"
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
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* PIN Display Dots */}
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-3">
            {Array.from({ length: Math.max(4, expectedPin.length) }).map((_, idx) => {
              const filled = idx < pin.length;
              return (
                <span
                  key={idx}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-black tabular-nums transition-all"
                  style={{
                    borderColor: error
                      ? 'var(--accent-danger)'
                      : filled
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {filled ? '•' : ''}
                </span>
              );
            })}
          </div>
          {error && (
            <p className="text-xs font-bold" style={{ color: 'var(--accent-danger)' }}>
              الرمز غير صحيح، حاول مرة أخرى
            </p>
          )}
          {hintText && !error && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {hintText}
            </p>
          )}
        </div>

        {/* On-Screen Keypad (Great for Touch & TV Remote D-Pad) */}
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              data-focusable="true"
              onClick={() => appendDigit(digit)}
              className="h-12 rounded-xl border text-base font-black tabular-nums transition-colors hover:opacity-90"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            data-focusable="true"
            aria-label="مسح رقم"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="flex h-12 items-center justify-center rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-focusable="true"
            onClick={() => appendDigit('0')}
            className="h-12 rounded-xl border text-base font-black tabular-nums"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            0
          </button>
          <button
            type="button"
            data-focusable="true"
            aria-label="تأكيد الرمز"
            onClick={() => verifyPin(pin)}
            className="btn-royal flex h-12 items-center justify-center gap-1 rounded-xl text-xs font-extrabold"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>دخول</span>
          </button>
        </div>
      </div>
    </div>
  );
};
