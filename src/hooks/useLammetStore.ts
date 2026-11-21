import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  DEFAULT_FAMILY_SETTINGS,
  SEED_COLLECTIONS,
  SEED_LIBRARY,
  SEED_NOTES,
} from '../data/seedLibrary';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInFamilyGoogle,
  signOutFamilyGoogle,
} from '../lib/firebase';
import { fromLegacyEpisode, toLegacyEpisode } from '../lib/episodeAdapter';
import type {
  FamilyCollection,
  FamilyNote,
  FamilyProfile,
  FamilySettings,
  MediaItem,
  ProfileId,
  ProfileState,
  ThemeId,
  WatchProgressEntry,
} from '../types/media';

const ITEMS_KEY = 'lammet_library_items_v2';
const COLLECTIONS_KEY = 'lammet_collections_v2';
const NOTES_KEY = 'lammet_notes_v2';
const SETTINGS_KEY = 'lammet_family_settings_v2';
const THEME_KEY = 'lammet_theme_v2';
const PROFILE_KEY = 'lammet_profile_v2';
const TV_MODE_KEY = 'lammet_tv_mode_v2';
const PROFILE_STATE_PREFIX = 'lammet_profile_state_v2_';
const BRIDGE_CHANNEL_NAME = 'lammet_tv_bridge_v1';

const EMPTY_PROFILE_STATE: ProfileState = {
  favorites: [],
  watchLater: [],
  progress: {},
  playCounts: {},
  searchHistory: [],
  kidsMinutesUsedToday: 0,
  kidsUsageDate: '',
};

export interface BridgeMessage {
  type: 'launch-item' | 'search-query' | 'pair-ping' | 'remote-action';
  itemId?: string;
  query?: string;
  action?: string;
  code: string;
  senderId: string;
  timestamp: number;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function loadProfileState(profileId: ProfileId): ProfileState {
  const storageKey = `${PROFILE_STATE_PREFIX}${profileId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites.map(String) : [],
        watchLater: Array.isArray(parsed.watchLater) ? parsed.watchLater.map(String) : [],
        progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
        playCounts: parsed.playCounts && typeof parsed.playCounts === 'object' ? parsed.playCounts : {},
        searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory.map(String) : [],
        kidsMinutesUsedToday: Number(parsed.kidsMinutesUsedToday || 0),
        kidsUsageDate: String(parsed.kidsUsageDate || ''),
      };
    }
  } catch {
    // A malformed new-format value must not prevent recovery from the older keys.
  }

  // One-time, non-destructive migration from the live static site's browser storage.
  // Original keys are intentionally kept; this only creates the new app's profile cache.
  const migrated: ProfileState = {
    ...EMPTY_PROFILE_STATE,
    favorites: [],
    watchLater: [],
    progress: {},
    playCounts: {},
    searchHistory: [],
  };
  if (profileId === 'family') {
    try {
      const oldLocal = JSON.parse(localStorage.getItem('lammet-elbeit-local-v1') || '{}');
      migrated.favorites = Array.isArray(oldLocal.favorites) ? [...new Set(oldLocal.favorites.map(String))] : [];
      migrated.watchLater = Array.isArray(oldLocal.watchLater) ? [...new Set(oldLocal.watchLater.map(String))] : [];
    } catch { /* Keep empty migrated lists if the old value is malformed. */ }

    try {
      const oldProgress = JSON.parse(localStorage.getItem('lammet-progress-v1') || '{}');
      if (oldProgress && typeof oldProgress === 'object' && !Array.isArray(oldProgress)) {
        for (const [itemId, value] of Object.entries(oldProgress as Record<string, any>)) {
          const time = Number(value?.time);
          const duration = Number(value?.duration);
          if (!itemId || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0 || time <= 0) continue;
          migrated.progress[itemId] = {
            itemId,
            time: Math.max(0, Math.min(time, duration)),
            duration,
            updatedAt: Number(value?.updatedAt) || Date.now(),
          };
        }
      }
    } catch { /* Preserve the existing source key; skip unreadable entries. */ }

    try {
      const activity = JSON.parse(localStorage.getItem('lammet-watch-activity-v1') || '{}');
      if (activity && typeof activity === 'object' && !Array.isArray(activity)) {
        for (const [itemId, value] of Object.entries(activity as Record<string, any>)) {
          const count = Number(value?.count);
          if (itemId && Number.isFinite(count) && count > 0) migrated.playCounts[itemId] = Math.min(9999, count);
        }
      }
    } catch { /* Keep the rest of the migration. */ }

    try {
      const history = JSON.parse(localStorage.getItem('lammet-search-history-v1') || '[]');
      migrated.searchHistory = Array.isArray(history)
        ? [...new Set(history.filter((value) => typeof value === 'string').slice(0, 30))]
        : [];
    } catch { /* Keep the rest of the migration. */ }
  }

  try { localStorage.setItem(storageKey, JSON.stringify(migrated)); } catch { /* Storage may be full or unavailable. */ }
  return migrated;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useLammetStore() {
  const [items, setItems] = useState<MediaItem[]>(() => {
    // Use a previously cached real library when offline; never seed demo media over the live catalog.
    const loaded = loadJson<MediaItem[]>(ITEMS_KEY, []);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [collections, setCollections] = useState<FamilyCollection[]>(() => {
    const loaded = loadJson<FamilyCollection[]>(COLLECTIONS_KEY, SEED_COLLECTIONS);
    return Array.isArray(loaded) ? loaded : SEED_COLLECTIONS;
  });
  const [notes, setNotes] = useState<FamilyNote[]>(() => {
    const loaded = loadJson<FamilyNote[]>(NOTES_KEY, SEED_NOTES);
    return Array.isArray(loaded) ? loaded : SEED_NOTES;
  });
  const [settings, setSettings] = useState<FamilySettings>(() => {
    const loaded = loadJson<FamilySettings>(SETTINGS_KEY, DEFAULT_FAMILY_SETTINGS);
    return {
      adminPin: loaded.adminPin || DEFAULT_FAMILY_SETTINGS.adminPin,
      kidsDailyLimitMinutes: Number(loaded.kidsDailyLimitMinutes ?? 45),
      customProfiles:
        Array.isArray(loaded.customProfiles) && loaded.customProfiles.length > 0
          ? loaded.customProfiles
          : DEFAULT_FAMILY_SETTINGS.customProfiles,
    };
  });

  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'frost' || saved === 'daylight' || saved === 'obsidian' ? saved : 'obsidian';
  });
  const [profileId, setProfileId] = useState<ProfileId>(() => {
    return localStorage.getItem(PROFILE_KEY) || 'family';
  });
  const [tvMode, setTvMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tv') === '1') return true;
    const current = localStorage.getItem(TV_MODE_KEY);
    if (current !== null) return current === '1';
    // Preserve the previous site's TV preference during the first launch.
    return localStorage.getItem('lammet-tv-mode-v1') === '1';
  });

  const [profileState, setProfileState] = useState<ProfileState>(() =>
    loadProfileState(localStorage.getItem(PROFILE_KEY) || 'family')
  );

  // Firebase Auth User & Live Cloud Sync State (public read always active for published catalog)
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudAuthReady, setCloudAuthReady] = useState(false);
  const [cloudSyncConnected, setCloudSyncConnected] = useState(false);
  const publicEpisodesRef = useRef<MediaItem[]>([]);

  // Persistent Mini Audio State + Sleep Timer
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSleepMinutes, setAudioSleepMinutes] = useState<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // TV Bridge Code
  const [pairCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const paramPair = params.get('pair');
    if (paramPair && /^[0-9A-Za-z]{4,12}$/.test(paramPair)) {
      sessionStorage.setItem('lammet_pair_code', paramPair);
      return paramPair;
    }
    const existing = sessionStorage.getItem('lammet_pair_code');
    if (existing) return existing;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    sessionStorage.setItem('lammet_pair_code', code);
    return code;
  });
  const [lastBridgeNotice, setLastBridgeNotice] = useState<string | null>(null);
  const senderIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCloudUser(u);
      setCloudAuthReady(true);
    });
    return () => unsub();
  }, []);

  // The existing production catalog is /episodes. No other Firestore collections
  // are created or used by this integration; family preferences remain local.
  useEffect(() => {
    const episodesQuery = query(collection(db, 'episodes'), where('published', '==', true));
    const unsubEpisodes = onSnapshot(
      episodesQuery,
      (snap) => {
        setCloudSyncConnected(true);
        const remote = snap.docs.map((d) => fromLegacyEpisode(d.id, d.data() as Record<string, unknown>));
        publicEpisodesRef.current = remote;
        if (!cloudUser?.emailVerified) setItems(remote);
      },
      (err) => {
        setCloudSyncConnected(false);
        console.warn('Firestore episodes listener warning:', err.message);
      }
    );

    let unsubAdminEpisodes: (() => void) | null = null;
    if (cloudUser?.emailVerified) {
      unsubAdminEpisodes = onSnapshot(
        collection(db, 'episodes'),
        (snap) => {
          const all = snap.docs.map((d) => fromLegacyEpisode(d.id, d.data() as Record<string, unknown>));
          setItems(all);
          setCloudSyncConnected(true);
        },
        (err) => {
          console.warn('Firestore admin episodes listener warning:', err.message);
          setItems(publicEpisodesRef.current);
        }
      );
    }

    return () => {
      unsubEpisodes();
      unsubAdminEpisodes?.();
    };
  }, [cloudUser]);

  // Theme, TV mode, and localStorage persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'daylight') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-tv-mode', tvMode ? 'true' : 'false');
    localStorage.setItem(TV_MODE_KEY, tvMode ? '1' : '0');
    // Keep the legacy preference readable if the user ever returns to the previous site.
    localStorage.setItem('lammet-tv-mode-v1', tvMode ? '1' : '0');
  }, [tvMode]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, profileId);
    setProfileState(loadProfileState(profileId));
  }, [profileId]);

  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    } catch {
      // ignore quota
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    } catch {
      // ignore quota
    }
  }, [collections]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      // ignore quota
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(`${PROFILE_STATE_PREFIX}${profileId}`, JSON.stringify(profileState));

      // Dual-write the existing browser keys so local favorites/progress remain
      // compatible with the previous production version. Nothing is deleted.
      if (profileId === 'family') {
        const oldLocal = loadJson<Record<string, unknown>>('lammet-elbeit-local-v1', {});
        localStorage.setItem('lammet-elbeit-local-v1', JSON.stringify({
          ...oldLocal,
          favorites: profileState.favorites.slice(0, 200),
          watchLater: profileState.watchLater.slice(0, 100),
        }));

        const oldProgress = loadJson<Record<string, Record<string, unknown>>>('lammet-progress-v1', {});
        const nextProgress = { ...oldProgress };
        for (const [itemId, entry] of Object.entries(profileState.progress)) {
          nextProgress[itemId] = {
            ...(oldProgress[itemId] || {}),
            time: entry.time,
            duration: entry.duration,
            updatedAt: entry.updatedAt,
          };
        }
        localStorage.setItem('lammet-progress-v1', JSON.stringify(nextProgress));

        const oldActivity = loadJson<Record<string, Record<string, unknown>>>('lammet-watch-activity-v1', {});
        const nextActivity = { ...oldActivity };
        for (const [itemId, count] of Object.entries(profileState.playCounts)) {
          nextActivity[itemId] = { ...(oldActivity[itemId] || {}), count };
        }
        localStorage.setItem('lammet-watch-activity-v1', JSON.stringify(nextActivity));
        localStorage.setItem('lammet-search-history-v1', JSON.stringify(profileState.searchHistory.slice(0, 8)));
      }
    } catch {
      // Storage quota/private-mode restrictions must never break playback.
    }
  }, [profileId, profileState]);

  // Track Kids screen time (1 minute increments while watching/active in kids profile)
  const currentProfileObj: FamilyProfile = useMemo(
    () =>
      settings.customProfiles.find((p) => p.id === profileId) ||
      settings.customProfiles[0] ||
      DEFAULT_FAMILY_SETTINGS.customProfiles[0],
    [profileId, settings.customProfiles]
  );

  const addKidsWatchMinutes = useCallback(
    (minutes: number) => {
      if (!currentProfileObj.isKids && profileId !== 'kids') return;
      const today = todayIso();
      setProfileState((prev) => {
        const base = prev.kidsUsageDate === today ? Number(prev.kidsMinutesUsedToday || 0) : 0;
        return {
          ...prev,
          kidsUsageDate: today,
          kidsMinutesUsedToday: Math.round((base + minutes) * 10) / 10,
        };
      });
    },
    [currentProfileObj.isKids, profileId]
  );

  // Audio playback helpers
  const stopSynthAudio = useCallback(() => {
    if (synthTimerRef.current) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    try {
      oscRef.current?.stop();
      oscRef.current?.disconnect();
    } catch {
      // ignore
    }
    oscRef.current = null;
  }, []);

  const stopMiniAudio = useCallback(() => {
    audioElRef.current?.pause();
    stopSynthAudio();
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setAudioSleepMinutes(0);
    setAudioPlaying(false);
    setActiveAudioId(null);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, [stopSynthAudio]);

  useEffect(() => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (audioSleepMinutes > 0 && activeAudioId) {
      sleepTimerRef.current = window.setTimeout(() => {
        stopMiniAudio();
      }, audioSleepMinutes * 60_000);
    }
    return () => {
      if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
    };
  }, [audioSleepMinutes, activeAudioId, stopMiniAudio]);

  const activeAudioItem = useMemo(
    () => items.find((i) => i.id === activeAudioId) || null,
    [items, activeAudioId]
  );

  const playAudioItem = useCallback(
    (item: MediaItem) => {
      stopSynthAudio();
      audioElRef.current?.pause();

      setActiveAudioId(item.id);
      setAudioCurrentTime(0);
      const fallbackDur = Number(item.durationSeconds || 420);
      setAudioDuration(fallbackDur);
      setAudioPlaying(true);

      setProfileState((prev) => ({
        ...prev,
        playCounts: {
          ...prev.playCounts,
          [item.id]: (prev.playCounts[item.id] || 0) + 1,
        },
      }));

      if (item.audioUrl && item.audioUrl.startsWith('https://')) {
        if (!audioElRef.current) audioElRef.current = new Audio();
        const el = audioElRef.current;
        el.src = item.audioUrl;
        el.onloadedmetadata = () => {
          if (Number.isFinite(el.duration) && el.duration > 0) setAudioDuration(el.duration);
        };
        el.ontimeupdate = () => setAudioCurrentTime(el.currentTime);
        el.onended = () => setAudioPlaying(false);
        el.play().catch(() => {});
      } else {
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (Ctx) {
            if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 174;
            gain.gain.value = 0.014;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            oscRef.current = osc;
          }
        } catch {
          // Headless fallback
        }

        synthTimerRef.current = window.setInterval(() => {
          setAudioCurrentTime((prev) => {
            if (prev + 1 >= fallbackDur) {
              setAudioPlaying(false);
              stopSynthAudio();
              return fallbackDur;
            }
            return prev + 1;
          });
        }, 1000);
      }
    },
    [stopSynthAudio]
  );

  const toggleAudioPlayPause = useCallback(() => {
    if (!activeAudioItem) return;
    if (audioPlaying) {
      audioElRef.current?.pause();
      stopSynthAudio();
      setAudioPlaying(false);
    } else if (
      activeAudioItem.audioUrl &&
      activeAudioItem.audioUrl.startsWith('https://') &&
      audioElRef.current
    ) {
      audioElRef.current.play().catch(() => {});
      setAudioPlaying(true);
    } else {
      const dur = audioDuration || Number(activeAudioItem.durationSeconds || 420);
      setAudioPlaying(true);
      synthTimerRef.current = window.setInterval(() => {
        setAudioCurrentTime((prev) => (prev + 1 >= dur ? dur : prev + 1));
      }, 1000);
    }
  }, [activeAudioItem, audioDuration, audioPlaying, stopSynthAudio]);

  const seekMiniAudio = useCallback((seconds: number) => {
    setAudioCurrentTime(seconds);
    if (audioElRef.current && Number.isFinite(audioElRef.current.duration)) {
      audioElRef.current.currentTime = seconds;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSynthAudio();
      audioElRef.current?.pause();
    };
  }, [stopSynthAudio]);

  // Profile interactions
  // Favorites, watch-later, playback progress and family preferences intentionally
  // remain in localStorage as in the existing production site. No new user documents
  // are written to Firestore by this integration.
  const toggleFavorite = useCallback((itemId: string) => {
    setProfileState((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(itemId)
        ? prev.favorites.filter((id) => id !== itemId)
        : [itemId, ...prev.favorites],
    }));
  }, []);

  const toggleWatchLater = useCallback((itemId: string) => {
    setProfileState((prev) => ({
      ...prev,
      watchLater: prev.watchLater.includes(itemId)
        ? prev.watchLater.filter((id) => id !== itemId)
        : [itemId, ...prev.watchLater],
    }));
  }, []);

  const saveWatchProgress = useCallback(
    (itemId: string, time: number, duration: number) => {
      if (!itemId || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) {
        return;
      }
      const entry: WatchProgressEntry = {
        itemId,
        time: Math.max(0, Math.min(time, duration)),
        duration,
        updatedAt: Date.now(),
      };
      setProfileState((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          [itemId]: entry,
        },
      }));
    },
    []
  );

  const recordPlayCount = useCallback((itemId: string) => {
    setProfileState((prev) => ({
      ...prev,
      playCounts: {
        ...prev.playCounts,
        [itemId]: (prev.playCounts[itemId] || 0) + 1,
      },
    }));
  }, []);

  const addSearchHistory = useCallback((qText: string) => {
    const clean = qText.trim();
    if (!clean) return;
    setProfileState((prev) => ({
      ...prev,
      searchHistory: [clean, ...prev.searchHistory.filter((q) => q !== clean)].slice(0, 6),
    }));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setProfileState((prev) => ({ ...prev, searchHistory: [] }));
  }, []);

  // Admin CRUD + Firestore Sync
  const upsertItem = useCallback(
    async (item: MediaItem) => {
      const cleanId = item.id.replace(/[^a-zA-Z0-9_-]/g, '-') || `item-${Date.now()}`;
      const normalized: MediaItem = { ...item, id: cleanId, updatedAt: Date.now() };

      // Write to the existing production collection and retain unknown legacy fields.
      // merge:true prevents an editor save from deleting fields that this UI does not expose.
      const path = `episodes/${cleanId}`;
      try {
        await setDoc(doc(db, 'episodes', cleanId), toLegacyEpisode(normalized), { merge: true });
        setItems((prev) => {
          const exists = prev.some((x) => x.id === cleanId);
          return exists ? prev.map((x) => (x.id === cleanId ? normalized : x)) : [normalized, ...prev];
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    []
  );

  const upsertItemsBulk = useCallback(
    async (newItems: MediaItem[]) => {
      for (const it of newItems) {
        await upsertItem(it);
      }
    },
    [upsertItem]
  );

  const deleteItem = useCallback(async (itemId: string) => {
    const path = `episodes/${itemId}`;
    try {
      await deleteDoc(doc(db, 'episodes', itemId));
      setItems((prev) => prev.filter((x) => x.id !== itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }, []);

  const togglePublishItem = useCallback(
    (itemId: string) => {
      const target = items.find((x) => x.id === itemId);
      if (!target) return;
      upsertItem({ ...target, published: !target.published, updatedAt: Date.now() });
    },
    [items, upsertItem]
  );

  // New curated collections and guestbook notes are local-only until a compatible
  // schema is explicitly approved. The existing production Firestore schema is episodes.
  const upsertCollection = useCallback(async (col: FamilyCollection) => {
    const cleanId = col.id.replace(/[^a-zA-Z0-9_-]/g, '-') || `col-${Date.now()}`;
    const normalized: FamilyCollection = { ...col, id: cleanId, ownerUid: 'local', updatedAt: Date.now() };
    setCollections((prev) => {
      const exists = prev.some((c) => c.id === cleanId);
      return (exists ? prev.map((c) => (c.id === cleanId ? normalized : c)) : [...prev, normalized]).sort(
        (a, b) => a.order - b.order
      );
    });
  }, []);

  const deleteCollection = useCallback(async (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  }, []);

  const addFamilyNote = useCallback(async (workKey: string, authorName: string, text: string) => {
    const cleanAuthor = authorName.trim().slice(0, 60);
    const cleanText = text.trim().slice(0, 600);
    if (!cleanAuthor || !cleanText) return;
    const note: FamilyNote = {
      id: `note-${Date.now()}`,
      workKey: workKey.slice(0, 160),
      authorName: cleanAuthor,
      text: cleanText,
      published: true,
      authorUid: 'local',
      createdAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
  }, []);

  const resetToSeed = useCallback(() => {
    setItems(SEED_LIBRARY);
    setCollections(SEED_COLLECTIONS);
    setNotes(SEED_NOTES);
    setSettings(DEFAULT_FAMILY_SETTINGS);
  }, []);

  const importLibraryJson = useCallback(
    (rawJson: string): { ok: boolean; count: number; error?: string } => {
      try {
        const parsed = JSON.parse(rawJson);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.episodes)
            ? parsed.episodes
            : Array.isArray(parsed?.state?.episodes)
              ? parsed.state.episodes
              : null;
        if (!list) {
          return { ok: false, count: 0, error: 'الملف يجب أن يحتوي على قائمة episodes بصيغة JSON.' };
        }
        const normalized = list
          .filter((value: unknown) => value && typeof value === 'object')
          .map((value: Record<string, unknown>, index: number) => {
            const id = String(value.id || `imported-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '-');
            return fromLegacyEpisode(id, value);
          })
          .filter((item: MediaItem) => Boolean(item.title));
        if (normalized.length === 0) {
          return { ok: false, count: 0, error: 'لم يتم العثور على عناصر صالحة داخل الملف.' };
        }
        void Promise.all(normalized.map((item: MediaItem) => upsertItem(item))).catch((error) => {
          console.error('Firebase episode import failed:', error);
        });
        return { ok: true, count: normalized.length };
      } catch {
        return { ok: false, count: 0, error: 'صيغة ملف JSON غير صالحة.' };
      }
    },
    [upsertItem]
  );

  // Bridge sync command (BroadcastChannel + localStorage; no new Firestore collections)
  const sendBridgeCommand = useCallback(
    async (payload: Omit<BridgeMessage, 'senderId' | 'timestamp'>) => {
      const msg: BridgeMessage = {
        ...payload,
        senderId: senderIdRef.current,
        timestamp: Date.now(),
      };
      try {
        const ch = new BroadcastChannel(BRIDGE_CHANNEL_NAME);
        ch.postMessage(msg);
        ch.close();
      } catch {
        // fallback
      }
      try {
        localStorage.setItem('lammet_bridge_last_msg', JSON.stringify(msg));
      } catch {
        // ignore
      }
      setLastBridgeNotice(
        payload.type === 'launch-item'
          ? 'تم إرسال أمر التشغيل إلى شاشة التلفاز المتصلة.'
          : payload.type === 'search-query'
          ? `تم إرسال البحث "${payload.query}" إلى شاشة التلفاز.`
          : payload.type === 'remote-action'
          ? 'تم إرسال أمر الريموت إلى شاشة التلفاز.'
          : 'تم التحقق من اتصال الجسر.'
      );
    },
    []
  );

  return {
    items,
    collections,
    notes,
    settings,
    setSettings,
    theme,
    setTheme,
    profileId,
    setProfileId,
    currentProfileObj,
    tvMode,
    setTvMode,
    profileState,
    addKidsWatchMinutes,
    toggleFavorite,
    toggleWatchLater,
    saveWatchProgress,
    recordPlayCount,
    addSearchHistory,
    clearSearchHistory,
    upsertItem,
    upsertItemsBulk,
    deleteItem,
    togglePublishItem,
    upsertCollection,
    deleteCollection,
    addFamilyNote,
    resetToSeed,
    importLibraryJson,
    activeAudioItem,
    audioPlaying,
    audioCurrentTime,
    audioDuration,
    audioSleepMinutes,
    setAudioSleepMinutes,
    playAudioItem,
    toggleAudioPlayPause,
    seekMiniAudio,
    stopMiniAudio,
    pairCode,
    sendBridgeCommand,
    lastBridgeNotice,
    setLastBridgeNotice,
    senderId: senderIdRef.current,
    bridgeChannelName: BRIDGE_CHANNEL_NAME,
    cloudUser,
    cloudSyncConnected,
    signInCloud: signInFamilyGoogle,
    signOutCloud: signOutFamilyGoogle,
  };
}
