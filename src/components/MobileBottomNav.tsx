import React from 'react';
import { BookOpen, Film, Heart, Home, Layers } from 'lucide-react';
import type { ContentType } from '../types/media';

interface MobileBottomNavProps {
  activeView: 'home' | 'details' | 'watch' | 'admin';
  activeSection: 'all' | ContentType | 'favorites';
  onSelectSection: (section: 'all' | ContentType | 'favorites') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  activeSection,
  onSelectSection,
}) => {
  const tabs = [
    {
      id: 'all' as const,
      label: 'الرئيسية',
      icon: Home,
      active: activeView === 'home' && activeSection === 'all',
      onClick: () => onSelectSection('all'),
    },
    {
      id: 'series' as const,
      label: 'المسلسلات',
      icon: Layers,
      active: activeView === 'home' && activeSection === 'series',
      onClick: () => onSelectSection('series'),
    },
    {
      id: 'movie' as const,
      label: 'الأفلام',
      icon: Film,
      active: activeView === 'home' && activeSection === 'movie',
      onClick: () => onSelectSection('movie'),
    },
    {
      id: 'story' as const,
      label: 'الحكايات',
      icon: BookOpen,
      active: activeView === 'home' && activeSection === 'story',
      onClick: () => onSelectSection('story'),
    },
    {
      id: 'favorites' as const,
      label: 'قائمتي',
      icon: Heart,
      active: activeView === 'home' && activeSection === 'favorites',
      onClick: () => onSelectSection('favorites'),
    },
  ];

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"
      style={{
        backgroundColor: 'var(--bg-glass)',
        borderColor: 'var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto grid h-14 max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-focusable="true"
              onClick={tab.onClick}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors"
              style={{
                color: tab.active ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
