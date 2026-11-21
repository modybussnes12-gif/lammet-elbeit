import React from 'react';
import { appAsset } from '../utils/assetPath';
import {
  Cast,
  Moon,
  Search,
  Snowflake,
  Sparkles,
  Sun,
  Tv,
} from 'lucide-react';
import type { ContentType, FamilyProfile, ThemeId } from '../types/media';

interface NavbarProps {
  activeSection: 'all' | ContentType | 'favorites';
  onSelectSection: (section: 'all' | ContentType | 'favorites') => void;
  onOpenSearch: () => void;
  onOpenNightPicker: () => void;
  onOpenProfileModal: () => void;
  onOpenTvBridge: () => void;
  theme: ThemeId;
  onCycleTheme: () => void;
  tvMode: boolean;
  onToggleTvMode: () => void;
  currentProfile: FamilyProfile;
}

const THEME_LABELS: Record<ThemeId, string> = {
  obsidian: 'ليلة السينما',
  frost: 'الصقيع الملكي',
  daylight: 'دفء النهار',
};

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onSelectSection,
  onOpenSearch,
  onOpenNightPicker,
  onOpenProfileModal,
  onOpenTvBridge,
  theme,
  onCycleTheme,
  tvMode,
  onToggleTvMode,
  currentProfile,
}) => {
  const navItems: Array<{ id: 'all' | ContentType | 'favorites'; label: string }> = [
    { id: 'all', label: 'الرئيسية' },
    { id: 'series', label: 'المسلسلات' },
    { id: 'movie', label: 'الأفلام' },
    { id: 'story', label: 'الحكايات' },
    { id: 'favorites', label: 'قائمتي' },
  ];

  const ThemeIcon = theme === 'frost' ? Snowflake : theme === 'daylight' ? Sun : Moon;

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl transition-colors"
      style={{
        backgroundColor: 'var(--bg-glass)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="tv-overscan mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand */}
        <button
          type="button"
          data-focusable="true"
          onClick={() => onSelectSection('all')}
          className="flex shrink-0 items-center gap-3 whitespace-nowrap text-right focus:outline-none"
        >
          <img
            src={appAsset('brand.svg')}
            alt="لمة البيت"
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          <div className="leading-tight">
            <span
              className="block text-base font-extrabold tracking-tight sm:text-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              لمة البيت
            </span>
            <span
              className="hidden text-[11px] font-medium sm:block"
              style={{ color: 'var(--text-muted)' }}
            >
              سينما العيلة والذكريات
            </span>
          </div>
        </button>

        {/* Zone 2: Center Single-Line Navigation (Desktop) */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-focusable="true"
                onClick={() => onSelectSection(item.id)}
                className="relative shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
                style={{
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                    : 'transparent',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Viewer Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-focusable="true"
            onClick={onOpenSearch}
            aria-label="بحث في المكتبة"
            title="بحث (اختصار /)"
            className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-xs font-semibold transition-colors sm:px-3"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">بحث</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onOpenNightPicker}
            aria-label="رشّح لي سهرة الليلة"
            title="رشّح لي سهرة الليلة"
            className="btn-royal hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">سهرة الليلة</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onCycleTheme}
            aria-label={`تغيير المظهر: ${THEME_LABELS[theme]}`}
            title={`المظهر الحالي: ${THEME_LABELS[theme]}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <ThemeIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onToggleTvMode}
            aria-pressed={tvMode}
            aria-label="تبديل وضع التلفاز"
            title="وضع التلفاز (واجهة 10-Foot + إخفاء السهم + أسهم الريموت)"
            className="hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-semibold transition-colors md:flex"
            style={{
              borderColor: tvMode ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: tvMode
                ? 'color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                : 'var(--bg-surface)',
              color: tvMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Tv className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">{tvMode ? 'وضع التلفاز' : 'التلفاز'}</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onOpenTvBridge}
            aria-label="الربط السريع مع التلفاز"
            title="إرسال للشاشة / ربط الهاتف بالتلفاز"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <Cast className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onOpenProfileModal}
            aria-label={`ملف المشاهدة: ${currentProfile.name}`}
            className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-black text-slate-950"
              style={{ backgroundColor: currentProfile.accent }}
            >
              {currentProfile.badgeLetter}
            </span>
            <span className="hidden sm:inline">{currentProfile.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
