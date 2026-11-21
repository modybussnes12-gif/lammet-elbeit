import React, { useEffect } from 'react';
import { Check, Clock, Lock, X } from 'lucide-react';
import type { FamilyProfile, ProfileId, ProfileState } from '../types/media';

interface ProfileModalProps {
  profiles: FamilyProfile[];
  currentProfileId: ProfileId;
  profileState: ProfileState;
  kidsDailyLimitMinutes: number;
  onSelectProfile: (profile: FamilyProfile) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profiles,
  currentProfileId,
  profileState,
  kidsDailyLimitMinutes,
  onSelectProfile,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const today = new Date().toISOString().slice(0, 10);
  const kidsUsedToday =
    profileState.kidsUsageDate === today ? Math.round(profileState.kidsMinutesUsedToday || 0) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="اختيار ملف المشاهدة العائلي"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-2xl"
        style={{
          borderColor: 'var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
              من يشاهد الآن؟
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              لكل ملف قائمة مفضلة وتقدم مشاهدة مستقل وتصفية مناسبة للعمر
            </p>
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

        <div className="space-y-2.5">
          {profiles.map((prof) => {
            const active = prof.id === currentProfileId;
            return (
              <button
                key={prof.id}
                type="button"
                data-focusable="true"
                onClick={() => {
                  onSelectProfile(prof);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-right transition-colors"
                style={{
                  borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-elevated))'
                    : 'var(--bg-elevated)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-slate-950"
                    style={{ backgroundColor: prof.accent }}
                  >
                    {prof.badgeLetter}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        {prof.name}
                      </p>
                      {prof.requiresPin && (
                        <Lock className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {prof.subtitle}
                    </p>
                    {prof.isKids && kidsDailyLimitMinutes > 0 && (
                      <p
                        className="mt-1 flex items-center gap-1 text-[11px] font-bold tabular-nums"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Clock className="h-3 w-3" />
                        <span>
                          استخدام اليوم: {kidsUsedToday} / {kidsDailyLimitMinutes} دقيقة
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {active && (
                  <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
