import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { DetailsView } from './components/DetailsView';
import { HomeView } from './components/HomeView';
import { IntroSplash } from './components/IntroSplash';
import { MiniAudioBar } from './components/MiniAudioBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Navbar } from './components/Navbar';
import { NightPickerModal } from './components/NightPickerModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { PinLockModal } from './components/PinLockModal';
import { ProfileModal } from './components/ProfileModal';
import { SearchOverlay } from './components/SearchOverlay';
import { StoryReaderModal } from './components/StoryReaderModal';
import { PhoneRemoteView, TvBridgeModal } from './components/TvBridgeModal';
import { WatchPlayer } from './components/WatchPlayer';
import { useLammetStore, type BridgeMessage } from './hooks/useLammetStore';
import type {
  AppView,
  ContentType,
  FamilyProfile,
  GroupedWork,
  MediaItem,
  ThemeId,
  WorldId,
} from './types/media';
import { filterLibraryItems, groupLibraryItems } from './utils/library';
import { mapRemoteKey, moveSpatialFocus, registerTizenTvKeys } from './utils/tvRemote';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const THEME_ORDER: ThemeId[] = ['obsidian', 'frost', 'daylight'];

const SNOW_FLAKES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${(i * 7.3 + 3) % 98}%`,
  size: `${(i % 3) + 2}px`,
  duration: `${9 + (i % 5) * 2.5}s`,
  delay: `-${(i % 6) * 1.8}s`,
}));

function isAdminUrl(): boolean {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  return window.location.pathname === `${base}/admin` || window.location.hash === '#/admin';
}

export default function App() {
  const store = useLammetStore();

  const [remoteModeCode, setRemoteModeCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('remote');
    return r && /^[0-9A-Za-z]{4,12}$/.test(r) ? r : null;
  });

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('autostart') === '1' ||
      params.get('tv') === '1' ||
      params.get('remote') ||
      isAdminUrl()
    ) {
      return false;
    }
    return sessionStorage.getItem('lammet_intro_done') !== '1';
  });

  const [view, setView] = useState<AppView>(() =>
    isAdminUrl() ? { name: 'admin' } : { name: 'home', section: 'all', world: 'all' }
  );
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(
    () => sessionStorage.getItem('lammet_admin_unlocked') === '1'
  );
  const [pendingProfilePin, setPendingProfilePin] = useState<FamilyProfile | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [nightPickerOpen, setNightPickerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [tvBridgeOpen, setTvBridgeOpen] = useState(false);
  const [readingItem, setReadingItem] = useState<MediaItem | null>(null);

  // Sync browser back/forward navigation with /admin URL
  useEffect(() => {
    const onPopState = () => {
      if (isAdminUrl()) {
        setView({ name: 'admin' });
      } else {
        setView((prev) =>
          prev.name === 'admin' ? { name: 'home', section: 'all', world: 'all' } : prev
        );
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  // Register Samsung Tizen hardware keys on mount
  useEffect(() => {
    registerTizenTvKeys();
  }, []);

  // Automatic Mouse Cursor Suppression when TV Mode is active (restores only if real mouse moves in non-TV browser)
  useEffect(() => {
    const root = document.documentElement;
    if (store.tvMode) {
      root.classList.add('tv-cursor-hidden');
    } else {
      root.classList.remove('tv-cursor-hidden');
      return;
    }

    const onMouseMove = () => {
      // Keep cursor hidden if navigating via remote keys; only restore temporarily if user moves physical mouse in TV mode
      root.classList.remove('tv-cursor-hidden');
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      root.classList.remove('tv-cursor-hidden');
    };
  }, [store.tvMode]);

  // Auto-focus first visible main focusable element in TV Mode so Samsung Remote D-Pad works immediately
  useEffect(() => {
    if (
      !store.tvMode ||
      showIntro ||
      remoteModeCode ||
      searchOpen ||
      nightPickerOpen ||
      profileModalOpen ||
      tvBridgeOpen ||
      readingItem ||
      pendingProfilePin ||
      view.name === 'watch' ||
      view.name === 'admin'
    ) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && active.dataset.focusable === 'true') return;
      const firstMain = document.querySelector<HTMLElement>('main [data-focusable="true"]');
      const firstAny = firstMain || document.querySelector<HTMLElement>('[data-focusable="true"]');
      firstAny?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [
    nightPickerOpen,
    pendingProfilePin,
    profileModalOpen,
    readingItem,
    remoteModeCode,
    searchOpen,
    showIntro,
    store.tvMode,
    tvBridgeOpen,
    view,
  ]);

  // Track Kids daily watch minutes
  useEffect(() => {
    if (!store.currentProfileObj.isKids && store.profileId !== 'kids') return;
    if (view.name !== 'watch' && !store.audioPlaying) return;
    const timer = window.setInterval(() => {
      store.addKidsWatchMinutes(1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [store, view.name]);

  const navigateWithTransition = useCallback((nextView: AppView) => {
    if (nextView.name === 'admin' && !isAdminUrl()) {
      window.history.pushState({}, '', `${import.meta.env?.BASE_URL}#/admin`);
    } else if (nextView.name !== 'admin' && isAdminUrl()) {
      window.history.pushState({}, '', import.meta.env?.BASE_URL || '/');
    }

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => setView(nextView));
    } else {
      setView(nextView);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const dismissIntro = useCallback(() => {
    sessionStorage.setItem('lammet_intro_done', '1');
    setShowIntro(false);
  }, []);

  const visibleGroupedWorks = useMemo(() => {
    const filtered = filterLibraryItems(store.items, {
      onlyPublished: true,
      profileId: store.currentProfileObj,
    });
    return groupLibraryItems(filtered);
  }, [store.currentProfileObj, store.items]);

  const handleOpenDetails = useCallback(
    (work: GroupedWork) => {
      navigateWithTransition({ name: 'details', itemId: work.representative.id });
    },
    [navigateWithTransition]
  );

  const handlePlayItem = useCallback(
    (item: MediaItem, work?: GroupedWork) => {
      store.recordPlayCount(item.id);
      if (item.contentType === 'story' || item.contentType === 'memory') {
        setReadingItem(item);
        return;
      }
      if (item.contentType === 'audio') {
        store.playAudioItem(item);
        return;
      }
      navigateWithTransition({
        name: 'watch',
        itemId: item.id,
        seriesKey: work?.key,
      });
    },
    [navigateWithTransition, store]
  );

  const handleQuickPlayWork = useCallback(
    (work: GroupedWork) => {
      let target = work.episodes[0] || work.representative;
      let latest = 0;
      for (const ep of work.episodes) {
        const p = store.profileState.progress[ep.id];
        if (p && p.updatedAt > latest) {
          latest = p.updatedAt;
          target = ep;
        }
      }
      handlePlayItem(target, work);
    },
    [handlePlayItem, store.profileState.progress]
  );

  const handleCycleTheme = useCallback(() => {
    const idx = THEME_ORDER.indexOf(store.theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    store.setTheme(next);
  }, [store]);

  const handleSelectSection = useCallback(
    (section: 'all' | ContentType | 'favorites') => {
      navigateWithTransition({
        name: 'home',
        section,
        world: view.name === 'home' ? view.world || 'all' : 'all',
      });
    },
    [navigateWithTransition, view]
  );

  const handleSelectWorld = useCallback(
    (world: WorldId) => {
      navigateWithTransition({ name: 'home', section: 'all', world });
    },
    [navigateWithTransition]
  );

  const handleRequestProfileSwitch = useCallback(
    (targetProfile: FamilyProfile) => {
      if (targetProfile.id === store.profileId) return;
      if (targetProfile.requiresPin) {
        setPendingProfilePin(targetProfile);
      } else {
        store.setProfileId(targetProfile.id);
      }
    },
    [store]
  );

  // Global keyboard & Samsung Tizen TV Remote Navigation (Non-Watch views)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.key === '/' && !inField && view.name !== 'watch') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (view.name === 'watch') return;

      const action = mapRemoteKey(e.keyCode, e.key);
      if (!action) return;

      // Hide mouse cursor automatically when remote/arrow navigation is used in TV Mode
      if (store.tvMode) {
        document.documentElement.classList.add('tv-cursor-hidden');
      }

      if (action === 'back') {
        if (searchOpen) {
          e.preventDefault();
          setSearchOpen(false);
        } else if (nightPickerOpen) {
          e.preventDefault();
          setNightPickerOpen(false);
        } else if (profileModalOpen) {
          e.preventDefault();
          setProfileModalOpen(false);
        } else if (tvBridgeOpen) {
          e.preventDefault();
          setTvBridgeOpen(false);
        } else if (readingItem) {
          e.preventDefault();
          setReadingItem(null);
        } else if (view.name === 'details' || view.name === 'admin') {
          e.preventDefault();
          navigateWithTransition({ name: 'home', section: 'all', world: 'all' });
        }
        return;
      }

      if (
        store.tvMode &&
        !inField &&
        (action === 'up' || action === 'down' || action === 'left' || action === 'right')
      ) {
        const moved = moveSpatialFocus(action, document);
        if (moved) e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    navigateWithTransition,
    nightPickerOpen,
    profileModalOpen,
    readingItem,
    searchOpen,
    store.tvMode,
    tvBridgeOpen,
    view.name,
  ]);

  // Execute incoming Bridge / Phone Remote command
  const executeRemoteCommand = useCallback(
    (type: string, itemId?: string, action?: string) => {
      if (type === 'launch-item' && itemId) {
        const target = store.items.find((i) => i.id === itemId);
        if (target) handlePlayItem(target);
      } else if (type === 'search-query') {
        setSearchOpen(true);
      } else if (type === 'remote-action' && action) {
        if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
          moveSpatialFocus(action, document);
        } else if (action === 'select') {
          (document.activeElement as HTMLElement | null)?.click();
        } else if (action === 'back') {
          if (view.name === 'watch' || view.name === 'details') {
            navigateWithTransition({ name: 'home', section: 'all', world: 'all' });
          }
        } else if (action === 'playPause') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', keyCode: 10252 }));
        } else if (action === 'ff') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaFastForward', keyCode: 417 }));
        } else if (action === 'rw') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaRewind', keyCode: 412 }));
        }
      }
    },
    [handlePlayItem, navigateWithTransition, store.items, view.name]
  );

  // Listen for local BroadcastChannel + Storage TV bridge messages.
  // Cross-device cloud pairing is intentionally not written to Firestore because
  // the production database currently uses the legacy /episodes schema only.
  useEffect(() => {
    const handleIncoming = (msg: BridgeMessage) => {
      if (!msg || msg.senderId === store.senderId || msg.code !== store.pairCode) return;
      executeRemoteCommand(msg.type, msg.itemId, msg.action);
    };

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(store.bridgeChannelName);
      ch.onmessage = (ev) => handleIncoming(ev.data as BridgeMessage);
    } catch {
      // ignore if unsupported
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'lammet_bridge_last_msg' && ev.newValue) {
        try { handleIncoming(JSON.parse(ev.newValue) as BridgeMessage); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      ch?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [executeRemoteCommand, store.bridgeChannelName, store.pairCode, store.senderId]);

  const activeDetailsWork = useMemo(() => {
    if (view.name !== 'details') return null;
    return (
      visibleGroupedWorks.find(
        (w) =>
          w.representative.id === view.itemId ||
          w.episodes.some((ep) => ep.id === view.itemId)
      ) || visibleGroupedWorks[0] || null
    );
  }, [view, visibleGroupedWorks]);

  const activeWatchItem = useMemo(() => {
    if (view.name !== 'watch') return null;
    return store.items.find((i) => i.id === view.itemId) || null;
  }, [store.items, view]);

  const activeWatchSeriesWork = useMemo(() => {
    if (view.name !== 'watch' || !activeWatchItem) return null;
    return (
      visibleGroupedWorks.find(
        (w) =>
          w.key === view.seriesKey ||
          w.episodes.some((ep) => ep.id === activeWatchItem.id)
      ) || null
    );
  }, [activeWatchItem, view, visibleGroupedWorks]);

  // If opened from Phone QR Scan (?remote=PAIRCODE) -> render streamlined Phone Remote Controller
  if (remoteModeCode) {
    return (
      <PhoneRemoteView
        pairCode={remoteModeCode}
        items={store.items}
        cloudUser={store.cloudUser}
        lastNotice={store.lastBridgeNotice}
        onSignInCloud={store.signInCloud}
        onSendAction={(action) =>
          store.sendBridgeCommand({ type: 'remote-action', action, code: remoteModeCode })
        }
        onSendLaunch={(itemId) =>
          store.sendBridgeCommand({ type: 'launch-item', itemId, code: remoteModeCode })
        }
        onExitRemoteMode={() => setRemoteModeCode(null)}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <OfflineIndicator />

      {/* Subtle Ambient Snow ONLY in Frost Theme when not in TV mode */}
      {store.theme === 'frost' && !store.tvMode && view.name !== 'watch' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
        >
          {SNOW_FLAKES.map((flake) => (
            <span
              key={flake.id}
              className="frost-flake absolute -top-4 rounded-full bg-sky-200/60"
              style={{
                left: flake.left,
                width: flake.size,
                height: flake.size,
                animationDuration: flake.duration,
                animationDelay: flake.delay,
              }}
            />
          ))}
        </div>
      )}

      {showIntro && <IntroSplash onDismiss={dismissIntro} />}

      {view.name !== 'watch' && view.name !== 'admin' && (
        <Navbar
          activeSection={view.name === 'home' ? view.section || 'all' : 'all'}
          onSelectSection={handleSelectSection}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenNightPicker={() => setNightPickerOpen(true)}
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onOpenTvBridge={() => setTvBridgeOpen(true)}
          theme={store.theme}
          onCycleTheme={handleCycleTheme}
          tvMode={store.tvMode}
          onToggleTvMode={() => store.setTvMode((v) => !v)}
          currentProfile={store.currentProfileObj}
        />
      )}

      {view.name === 'home' && (
        <HomeView
          items={store.items}
          collections={store.collections}
          currentProfile={store.currentProfileObj}
          kidsDailyLimitMinutes={store.settings.kidsDailyLimitMinutes}
          profileState={store.profileState}
          activeSection={view.section || 'all'}
          activeWorld={view.world || 'all'}
          onSelectSection={handleSelectSection}
          onSelectWorld={handleSelectWorld}
          onOpenNightPicker={() => setNightPickerOpen(true)}
          onOpenAdminRoute={() => navigateWithTransition({ name: 'admin' })}
          onOpenDetails={handleOpenDetails}
          onQuickPlay={handleQuickPlayWork}
          onToggleFavorite={store.toggleFavorite}
          onToggleWatchLater={store.toggleWatchLater}
        />
      )}

      {view.name === 'details' && activeDetailsWork && (
        <DetailsView
          work={activeDetailsWork}
          allWorks={visibleGroupedWorks}
          notes={store.notes}
          defaultAuthorName={store.currentProfileObj.name}
          profileState={store.profileState}
          onBack={() => navigateWithTransition({ name: 'home', section: 'all', world: 'all' })}
          onPlayEpisode={handlePlayItem}
          onOpenDetails={handleOpenDetails}
          onToggleFavorite={store.toggleFavorite}
          onToggleWatchLater={store.toggleWatchLater}
          onSendToTv={(item) => {
            store.sendBridgeCommand({
              type: 'launch-item',
              itemId: item.id,
              code: store.pairCode,
            });
            setTvBridgeOpen(true);
          }}
          onAddNote={store.addFamilyNote}
        />
      )}

      {/* Separated /admin portal guarded by PIN Gate & code-split via React.lazy */}
      {view.name === 'admin' && (
        adminUnlocked ? (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                جاري تحميل مركز الإدارة...
              </div>
            }
          >
            <AdminDashboard
              items={store.items}
              collections={store.collections}
              settings={store.settings}
              profileState={store.profileState}
              cloudUser={store.cloudUser}
              onSignInCloud={store.signInCloud}
              onSignOutCloud={store.signOutCloud}
              onUpsertItem={store.upsertItem}
              onUpsertItemsBulk={store.upsertItemsBulk}
              onDeleteItem={store.deleteItem}
              onTogglePublish={store.togglePublishItem}
              onUpsertCollection={store.upsertCollection}
              onDeleteCollection={store.deleteCollection}
              onUpdateSettings={store.setSettings}
              onResetSeed={store.resetToSeed}
              onImportJson={store.importLibraryJson}
              onBackHome={() => navigateWithTransition({ name: 'home', section: 'all', world: 'all' })}
            />
          </Suspense>
        ) : (
          <PinLockModal
            title="دخول مركز الإدارة (/admin)"
            subtitle="هذه الصفحة مخصصة لمشرفي مكتبة العيلة فقط"
            hintText="الرمز الافتراضي للمشرف: 2025 (يمكن تغييره من الإعدادات)"
            expectedPin={store.settings.adminPin}
            onSuccess={() => {
              sessionStorage.setItem('lammet_admin_unlocked', '1');
              setAdminUnlocked(true);
            }}
            onCancel={() => navigateWithTransition({ name: 'home', section: 'all', world: 'all' })}
          />
        )
      )}

      {view.name === 'watch' && activeWatchItem && (
        <WatchPlayer
          item={activeWatchItem}
          seriesWork={activeWatchSeriesWork}
          initialTime={store.profileState.progress[activeWatchItem.id]?.time || 0}
          tvMode={store.tvMode}
          onSaveProgress={store.saveWatchProgress}
          onSelectEpisode={(ep) => {
            store.recordPlayCount(ep.id);
            navigateWithTransition({
              name: 'watch',
              itemId: ep.id,
              seriesKey: activeWatchSeriesWork?.key,
            });
          }}
          onBack={() =>
            navigateWithTransition({
              name: 'details',
              itemId: activeWatchItem.id,
            })
          }
        />
      )}

      {view.name !== 'watch' && view.name !== 'admin' && (
        <MobileBottomNav
          activeView={view.name}
          activeSection={view.name === 'home' ? view.section || 'all' : 'all'}
          onSelectSection={handleSelectSection}
        />
      )}

      {store.activeAudioItem && view.name !== 'watch' && view.name !== 'admin' && (
        <MiniAudioBar
          item={store.activeAudioItem}
          playing={store.audioPlaying}
          currentTime={store.audioCurrentTime}
          duration={store.audioDuration}
          sleepMinutes={store.audioSleepMinutes}
          onChangeSleepMinutes={store.setAudioSleepMinutes}
          onTogglePlay={store.toggleAudioPlayPause}
          onSeek={store.seekMiniAudio}
          onClose={store.stopMiniAudio}
        />
      )}

      {readingItem && (
        <StoryReaderModal item={readingItem} onClose={() => setReadingItem(null)} />
      )}

      {nightPickerOpen && (
        <NightPickerModal
          works={visibleGroupedWorks}
          onPlay={handleQuickPlayWork}
          onOpenDetails={handleOpenDetails}
          onClose={() => setNightPickerOpen(false)}
        />
      )}

      {searchOpen && (
        <SearchOverlay
          items={store.items}
          profileId={store.profileId}
          searchHistory={store.profileState.searchHistory}
          onAddHistory={store.addSearchHistory}
          onClearHistory={store.clearSearchHistory}
          onSelectWork={handleOpenDetails}
          onQuickPlay={handleQuickPlayWork}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          profiles={store.settings.customProfiles}
          currentProfileId={store.profileId}
          profileState={store.profileState}
          kidsDailyLimitMinutes={store.settings.kidsDailyLimitMinutes}
          onSelectProfile={handleRequestProfileSwitch}
          onClose={() => setProfileModalOpen(false)}
        />
      )}

      {pendingProfilePin && (
        <PinLockModal
          title={`تأكيد الدخول إلى ملف "${pendingProfilePin.name}"`}
          subtitle="هذا الملف محمي لحفظ خصوصية الكبار ومحتواهم"
          expectedPin={store.settings.adminPin}
          onSuccess={() => {
            store.setProfileId(pendingProfilePin.id);
            setPendingProfilePin(null);
          }}
          onCancel={() => setPendingProfilePin(null)}
        />
      )}

      {tvBridgeOpen && (
        <TvBridgeModal
          pairCode={store.pairCode}
          items={store.items}
          tvMode={store.tvMode}
          cloudUser={store.cloudUser}
          onSignInCloud={store.signInCloud}
          onToggleTvMode={() => store.setTvMode((v) => !v)}
          onSendLaunch={(itemId) =>
            store.sendBridgeCommand({ type: 'launch-item', itemId, code: store.pairCode })
          }
          onSendSearch={(query) =>
            store.sendBridgeCommand({ type: 'search-query', query, code: store.pairCode })
          }
          lastNotice={store.lastBridgeNotice}
          onClose={() => {
            store.setLastBridgeNotice(null);
            setTvBridgeOpen(false);
          }}
        />
      )}
    </div>
  );
}
