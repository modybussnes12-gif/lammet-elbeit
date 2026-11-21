import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Captions,
  Check,
  Expand,
  ExternalLink,
  FastForward,
  Headphones,
  ListVideo,
  Lock,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Shrink,
  Sun,
  Timer,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { GroupedWork, MediaItem } from '../types/media';
import { extractYoutubeId, formatDuration, safeHttpsUrl } from '../utils/library';
import { mapRemoteKey, moveSpatialFocus } from '../utils/tvRemote';
import { appAsset } from '../utils/assetPath';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

interface YTGlobal {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiLoadPromise: Promise<YTGlobal | null> | null = null;

function loadYouTubeIframeApi(): Promise<YTGlobal | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise((resolve) => {
    const existingReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      if (!window.YT?.Player) ytApiLoadPromise = null;
      resolve(window.YT || null);
    }, 5500);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      if (typeof existingReady === 'function') existingReady();
      resolve(window.YT || null);
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        ytApiLoadPromise = null;
        resolve(null);
      };
      document.head.appendChild(script);
    }
  });

  return ytApiLoadPromise;
}

interface WatchPlayerProps {
  item: MediaItem;
  seriesWork?: GroupedWork | null;
  initialTime?: number;
  tvMode?: boolean;
  onSaveProgress: (itemId: string, time: number, duration: number) => void;
  onSelectEpisode: (episode: MediaItem) => void;
  onBack: () => void;
}

const FALLBACK_ART = appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg');

export const WatchPlayer: React.FC<WatchPlayerProps> = ({
  item,
  seriesWork,
  initialTime = 0,
  tvMode = false,
  onSaveProgress,
  onSelectEpisode,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const prevRateRef = useRef<number>(1);
  const touchSwipeRef = useRef<{
    startY: number;
    startX: number;
    side: 'left' | 'right';
    startVal: number;
    active: boolean;
  } | null>(null);

  const youtubeId = useMemo(
    () => (item.sourceType === 'youtube' ? extractYoutubeId(item.youtubeUrl || item.videoUrl) : ''),
    [item]
  );
  const primaryVideoUrl = useMemo(() => safeHttpsUrl(item.videoUrl), [item.videoUrl]);
  const backupVideoUrl = useMemo(() => safeHttpsUrl(item.backupVideoUrl), [item.backupVideoUrl]);
  const [useBackupSource, setUseBackupSource] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [ytApiTimedOut, setYtApiTimedOut] = useState(false);
  const [ytEmbedError, setYtEmbedError] = useState<number | null>(null);
  const [ytRetrySeed, setYtRetrySeed] = useState(0);

  const useBackupNative = Boolean(useBackupSource && backupVideoUrl);
  const activeDirectUrl = useBackupNative ? backupVideoUrl : primaryVideoUrl || backupVideoUrl;

  const isNativeVideo =
    useBackupNative ||
    Boolean(activeDirectUrl && item.sourceType !== 'youtube' && item.sourceType !== 'demo');
  const isYoutube = !useBackupNative && Boolean(youtubeId);
  const isDemoStage = !isNativeVideo && !isYoutube;

  const fallbackDuration = Number(item.durationSeconds || 1800);
  const [duration, setDuration] = useState<number>(fallbackDuration);
  const [currentTime, setCurrentTime] = useState<number>(
    initialTime > 5 && initialTime < fallbackDuration - 10 ? initialTime : 0
  );
  const [playing, setPlaying] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [brightness, setBrightness] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isSpeedBoosted, setIsSpeedBoosted] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');
  const [qualityLabel, setQualityLabel] = useState<string>('تلقائي (1080p)');
  const [subtitleLang, setSubtitleLang] = useState<'off' | 'ar' | 'en'>('ar');
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [sleepMinutes, setSleepMinutes] = useState<number>(0);
  const [audioOnlyMode, setAudioOnlyMode] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [locked, setLocked] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hudFeedback, setHudFeedback] = useState<{ label: string; key: number } | null>(null);
  const [hoverTime, setHoverTime] = useState<{ xPct: number; time: number } | null>(null);
  const [upNextDismissed, setUpNextDismissed] = useState<boolean>(false);

  const episodes = seriesWork?.episodes || [];
  const currentEpIndex = episodes.findIndex((ep) => ep.id === item.id);
  const nextEpisode =
    currentEpIndex >= 0 && currentEpIndex < episodes.length - 1
      ? episodes[currentEpIndex + 1]
      : null;

  const showFeedback = useCallback((label: string) => {
    setHudFeedback({ label, key: Date.now() });
    window.setTimeout(() => setHudFeedback(null), 950);
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, tvMode ? 5200 : 3600);
  }, [tvMode]);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [bumpControls]);

  const initialTimeRef = useRef<number>(initialTime);
  initialTimeRef.current = initialTime;

  // Reset state ONLY when episode item.id changes
  useEffect(() => {
    const dur = Number(item.durationSeconds || 1800);
    const startAt = initialTimeRef.current;
    setDuration(dur);
    setCurrentTime(startAt > 5 && startAt < dur - 10 ? startAt : 0);
    setPlaying(true);
    setUpNextDismissed(false);
    setSettingsOpen(false);
    setUseBackupSource(false);
    setAudioOnlyMode(false);
    setYtApiReady(false);
    setYtApiTimedOut(false);
    setYtEmbedError(null);
  }, [item.id, item.durationSeconds]);

  // Sleep Timer inside Video Player
  useEffect(() => {
    if (sleepMinutes <= 0) return;
    const t = window.setTimeout(() => {
      setPlaying(false);
      onSaveProgress(item.id, currentTime, duration);
      showFeedback('انتهى مؤقت النوم — تم إيقاف العرض');
    }, sleepMinutes * 60_000);
    return () => window.clearTimeout(t);
  }, [sleepMinutes, currentTime, duration, item.id, onSaveProgress, showFeedback]);

  // MediaSession integration
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: item.title,
          artist: item.story || 'لمة البيت',
          album: item.category,
          artwork: item.posterUrl ? [{ src: item.posterUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
      } catch {
        // ignore unsupported browser fields
      }
    }
  }, [item]);

  // Official YouTube IFrame Player API controller
  useEffect(() => {
    if (!isYoutube || !youtubeId || audioOnlyMode || ytEmbedError !== null) {
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // ignore
      }
      ytPlayerRef.current = null;
      if (ytHostRef.current) ytHostRef.current.innerHTML = '';
      setYtApiReady(false);
      return;
    }

    let cancelled = false;
    setYtApiTimedOut(false);
    setYtApiReady(false);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      if (!YT || typeof YT.Player !== 'function') {
        setYtApiTimedOut(true);
        return;
      }

      const host = ytHostRef.current;
      if (!host) return;
      host.innerHTML = '';
      const mountEl = document.createElement('div');
      mountEl.className = 'h-full w-full';
      host.appendChild(mountEl);

      const startSec =
        initialTimeRef.current > 5 && initialTimeRef.current < fallbackDuration - 10
          ? Math.floor(initialTimeRef.current)
          : 0;

      const player = new YT.Player(mountEl, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          enablejsapi: 1,
          start: startSec,
          origin: window.location.origin,
        },
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            ytPlayerRef.current = ev.target;
            setYtApiReady(true);
            try {
              const dur = ev.target.getDuration();
              if (Number.isFinite(dur) && dur > 0) setDuration(dur);
              ev.target.setVolume(Math.round(volume * 100));
              if (muted) ev.target.mute();
              else ev.target.unMute();
              ev.target.setPlaybackRate(playbackRate);
            } catch {
              // ignore transient YT API read errors
            }
          },
          onStateChange: (ev) => {
            if (cancelled) return;
            if (ev.data === 1) {
              setPlaying(true);
            } else if (ev.data === 2) {
              setPlaying(false);
            } else if (ev.data === 0) {
              setPlaying(false);
              try {
                const dur = ev.target.getDuration();
                if (Number.isFinite(dur) && dur > 0) setCurrentTime(dur);
              } catch {
                // ignore
              }
            }
          },
          onError: (ev) => {
            if (cancelled) return;
            if (!useBackupSource && backupVideoUrl) {
              setUseBackupSource(true);
              showFeedback('تعذر تضمين يوتيوب — تم التحويل للسيرفر الاحتياطي');
            } else {
              setYtEmbedError(ev.data);
            }
          },
        },
      });

      ytPlayerRef.current = player;
    });

    return () => {
      cancelled = true;
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // ignore destroy errors
      }
      ytPlayerRef.current = null;
      if (ytHostRef.current) ytHostRef.current.innerHTML = '';
    };
    // Intentionally re-create only on source identity, error clear, or explicit retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioOnlyMode, backupVideoUrl, isYoutube, ytEmbedError, ytRetrySeed, youtubeId]);

  // Sync volume, mute, rate, play/pause -> active YT.Player
  useEffect(() => {
    const yt = ytPlayerRef.current;
    if (!isYoutube || !ytApiReady || !yt) return;
    try {
      yt.setVolume(Math.round(volume * 100));
      if (muted) yt.mute();
      else yt.unMute();
      yt.setPlaybackRate(playbackRate);
      if (playing) yt.playVideo();
      else yt.pauseVideo();
    } catch {
      // ignore while player transitions
    }
  }, [isYoutube, muted, playbackRate, playing, volume, ytApiReady]);

  // Poll YouTube player real currentTime + duration for progress save & Skip Intro
  useEffect(() => {
    if (!isYoutube || !ytApiReady || audioOnlyMode) return;
    const interval = window.setInterval(() => {
      const yt = ytPlayerRef.current;
      if (!yt) return;
      try {
        const cur = yt.getCurrentTime();
        const dur = yt.getDuration();
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);
        if (Number.isFinite(cur) && cur >= 0) setCurrentTime(cur);
      } catch {
        // ignore
      }
    }, 450);
    return () => window.clearInterval(interval);
  }, [audioOnlyMode, isYoutube, ytApiReady]);

  // Native <video> sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isNativeVideo) return;
    v.volume = muted ? 0 : volume;
    v.playbackRate = playbackRate;
    if (playing) {
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  }, [isNativeVideo, muted, playbackRate, playing, volume]);

  // Demo Stage Canvas Animation + Deterministic Playback Clock
  useEffect(() => {
    if (!isDemoStage) return;
    const interval = window.setInterval(() => {
      if (!playing) return;
      setCurrentTime((prev) => {
        const next = prev + playbackRate;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [duration, isDemoStage, playbackRate, playing]);

  // Auto-Queue when track ends naturally
  useEffect(() => {
    if (nextEpisode && !upNextDismissed && currentTime >= duration && duration > 10) {
      onSelectEpisode(nextEpisode);
    }
  }, [currentTime, duration, nextEpisode, onSelectEpisode, upNextDismissed]);

  useEffect(() => {
    if (!isDemoStage || audioOnlyMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = item.backdropUrl || item.posterUrl || FALLBACK_ART;
    let frameId = 0;
    let t = 0;

    const render = () => {
      const w = (canvas.width = canvas.clientWidth || 1280);
      const h = (canvas.height = canvas.clientHeight || 720);
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, w, h);

      if (img.complete && img.naturalWidth > 0) {
        const scale = 1.04 + Math.sin(t * 0.008) * 0.025;
        const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight) * scale;
        const dw = img.naturalWidth * ratio;
        const dh = img.naturalHeight * ratio;
        const dx = (w - dw) / 2 + Math.cos(t * 0.006) * 14;
        const dy = (h - dh) / 2;
        ctx.globalAlpha = 0.84;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }

      const accent = item.ambientColor || '#f4ba48';
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.65);
      grad.addColorStop(0, 'rgba(6, 9, 17, 0.12)');
      grad.addColorStop(1, 'rgba(6, 9, 17, 0.78)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (playing) {
        for (let i = 0; i < 16; i++) {
          const px = ((i * 197 + t * 0.55) % (w + 40)) - 20;
          const py = ((i * 113 + Math.sin(t * 0.02 + i) * 35) % h + h) % h;
          ctx.fillStyle = i % 3 === 0 ? accent : 'rgba(255,255,255,0.28)';
          ctx.beginPath();
          ctx.arc(px, py, (i % 3) + 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        t += 1;
      }
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameId);
  }, [audioOnlyMode, isDemoStage, item.ambientColor, item.backdropUrl, item.posterUrl, playing]);

  const latestTimeRef = useRef<number>(currentTime);
  const latestDurationRef = useRef<number>(duration);
  latestTimeRef.current = currentTime;
  latestDurationRef.current = duration;

  // Persist watch progress periodically & on exit without tearing down interval each tick
  useEffect(() => {
    const timer = window.setInterval(() => {
      onSaveProgress(item.id, latestTimeRef.current, latestDurationRef.current);
    }, 4000);
    return () => {
      window.clearInterval(timer);
      onSaveProgress(item.id, latestTimeRef.current, latestDurationRef.current);
    };
  }, [item.id, onSaveProgress]);

  const seekTo = useCallback(
    (seconds: number, feedbackLabel?: string) => {
      const clamped = Math.max(0, Math.min(seconds, duration));
      setCurrentTime(clamped);
      if (videoRef.current && isNativeVideo) {
        videoRef.current.currentTime = clamped;
      } else if (ytPlayerRef.current && isYoutube && ytApiReady) {
        try {
          ytPlayerRef.current.seekTo(clamped, true);
        } catch {
          // ignore
        }
      }
      if (feedbackLabel) showFeedback(feedbackLabel);
      onSaveProgress(item.id, clamped, duration);
      bumpControls();
    },
    [bumpControls, duration, isNativeVideo, isYoutube, item.id, onSaveProgress, showFeedback, ytApiReady]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore if restricted
    }
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (videoRef.current && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Touch Long-Press 2x + Vertical Swipe Brightness/Volume (works across Video, YouTube, Demo)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (locked || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const width = window.innerWidth || 1200;
    const side = touch.clientX < width / 2 ? 'left' : 'right';
    touchSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      side,
      startVal: side === 'left' ? volume : brightness,
      active: false,
    };

    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      prevRateRef.current = playbackRate;
      setPlaybackRate(2);
      setIsSpeedBoosted(true);
      showFeedback('2x تسريع مؤقت');
    }, 380);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchSwipeRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dy = touchSwipeRef.current.startY - touch.clientY;
    const dx = Math.abs(touchSwipeRef.current.startX - touch.clientX);
    if (Math.abs(dy) > 18 && Math.abs(dy) > dx) {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchSwipeRef.current.active = true;
      const delta = dy / 220;
      if (touchSwipeRef.current.side === 'left') {
        const nextVol = Math.max(0, Math.min(1, touchSwipeRef.current.startVal + delta));
        setVolume(nextVol);
        setMuted(nextVol === 0);
        showFeedback(`الصوت ${Math.round(nextVol * 100)}%`);
      } else {
        const nextBright = Math.max(0.4, Math.min(1.25, touchSwipeRef.current.startVal + delta));
        setBrightness(nextBright);
        showFeedback(`السطوع ${Math.round((nextBright / 1.25) * 100)}%`);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isSpeedBoosted) {
      setPlaybackRate(prevRateRef.current || 1);
      setIsSpeedBoosted(false);
    }
    touchSwipeRef.current = null;
  };

  // Unified Keyboard + Samsung Smart TV Hardware Remote Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = mapRemoteKey(e.keyCode, e.key);

      if (action === 'back') {
        e.preventDefault();
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (drawerOpen) {
          setDrawerOpen(false);
        } else {
          onSaveProgress(item.id, currentTime, duration);
          onBack();
        }
        return;
      }

      if (locked) return;

      if (action === 'play') {
        e.preventDefault();
        setPlaying(true);
        bumpControls();
        return;
      }
      if (action === 'pause' || action === 'stop') {
        e.preventDefault();
        setPlaying(false);
        bumpControls();
        return;
      }
      if (action === 'playPause' || e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPlaying((p) => !p);
        bumpControls();
        return;
      }
      if (action === 'ff') {
        e.preventDefault();
        seekTo(currentTime + 15, '+15 ث');
        return;
      }
      if (action === 'rw') {
        e.preventDefault();
        seekTo(currentTime - 15, '-15 ث');
        return;
      }

      // TV Mode D-Pad navigation across visible focusables when controls are open
      if (
        tvMode &&
        (action === 'up' || action === 'down' || action === 'left' || action === 'right')
      ) {
        if (controlsVisible || settingsOpen || drawerOpen) {
          const moved = moveSpatialFocus(action, containerRef.current || document);
          if (moved) {
            e.preventDefault();
            bumpControls();
            return;
          }
        }
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekTo(currentTime + 10, '+10 ث');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekTo(currentTime - 10, '-10 ث');
      } else if (e.key.toLowerCase() === 'm') {
        setMuted((m) => !m);
        bumpControls();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'e' && episodes.length > 1) {
        setDrawerOpen((d) => !d);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    bumpControls,
    controlsVisible,
    currentTime,
    drawerOpen,
    duration,
    episodes.length,
    item.id,
    locked,
    onBack,
    onSaveProgress,
    seekTo,
    settingsOpen,
    toggleFullscreen,
    tvMode,
  ]);

  const showSkipIntro =
    Number(item.introEndSec || 0) > Number(item.introStartSec || 0) &&
    currentTime >= Number(item.introStartSec || 0) &&
    currentTime < Number(item.introEndSec || 0);

  const showUpNext =
    Boolean(nextEpisode) &&
    !upNextDismissed &&
    duration > 30 &&
    duration - currentTime <= 20;

  const upNextCountdown = Math.max(1, Math.ceil(duration - currentTime));

  const captionText =
    subtitleLang === 'off'
      ? ''
      : subtitleLang === 'en'
      ? `${item.title} — Family Cinema Experience`
      : item.description;

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const subTextSizeClass =
    subtitleSize === 'sm'
      ? 'text-xs'
      : subtitleSize === 'lg'
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpControls}
      onClick={bumpControls}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-black text-white select-none"
    >
      {/* Video / Stage / Audio-Only Layer */}
      <div className="absolute inset-0" style={{ filter: `brightness(${brightness})` }}>
        {audioOnlyMode ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 text-center">
            <img
              src={item.posterUrl || FALLBACK_ART}
              alt={item.title}
              className="h-44 w-44 rounded-3xl border border-white/15 object-cover shadow-2xl"
            />
            <div className="space-y-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Headphones className="h-4 w-4" />
                <span>وضع الاستماع الصوتي الهادئ</span>
              </p>
              <h2 className="text-xl font-black">{item.title}</h2>
            </div>
          </div>
        ) : isNativeVideo ? (
          <video
            ref={videoRef}
            src={activeDirectUrl}
            playsInline
            onError={() => {
              if (!useBackupSource && backupVideoUrl) {
                setUseBackupSource(true);
                showFeedback('تم التحويل تلقائياً إلى السيرفر الاحتياطي');
              }
            }}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) setDuration(dur);
              if (initialTimeRef.current > 5 && initialTimeRef.current < dur - 10) {
                e.currentTarget.currentTime = initialTimeRef.current;
              }
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
            className={`absolute inset-0 h-full w-full ${
              aspectMode === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          >
            {item.subtitleUrl && safeHttpsUrl(item.subtitleUrl) && (
              <track
                kind="subtitles"
                src={item.subtitleUrl}
                srcLang="ar"
                label="العربية"
                default={subtitleLang === 'ar'}
              />
            )}
          </video>
        ) : isYoutube ? (
          ytEmbedError !== null ? (
            <div
              key="yt-error"
              className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center"
            >
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <div className="max-w-md space-y-1.5">
                <h2 className="text-lg font-black text-white">تعذر تضمين فيديو يوتيوب داخل المشغل</h2>
                <p className="text-xs leading-relaxed text-slate-300">
                  بعض مقاطع يوتيوب تُقيّد التشغيل داخل المتصفحات المدمجة (رمز {ytEmbedError}). يمكنك إعادة المحاولة أو فتحه مباشرة.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => {
                    setYtEmbedError(null);
                    setYtRetrySeed((s) => s + 1);
                  }}
                  className="btn-royal rounded-xl px-4 py-2 text-xs font-extrabold"
                >
                  إعادة المحاولة
                </button>
                <a
                  href={safeHttpsUrl(item.youtubeUrl) || `https://www.youtube.com/watch?v=${youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-focusable="true"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>فتح على يوتيوب</span>
                </a>
              </div>
            </div>
          ) : ytApiTimedOut ? (
            <iframe
              key="yt-fallback"
              title={item.title}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div key="yt-host" ref={ytHostRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          )
        ) : (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        )}
      </div>

      {/* Interactive Tap & Double-Tap Overlay (Video, YouTube API Stage, and Demo Stage) */}
      {!locked && ytEmbedError === null && !ytApiTimedOut && (
        <div className="absolute inset-0 z-10 grid grid-cols-3">
          <div
            onDoubleClick={() => seekTo(currentTime + 10, '+10 ث')}
            onClick={() => {
              setPlaying((p) => !p);
              bumpControls();
            }}
          />
          <div
            onClick={() => {
              setPlaying((p) => !p);
              bumpControls();
            }}
          />
          <div
            onDoubleClick={() => seekTo(currentTime - 10, '-10 ث')}
            onClick={() => {
              setPlaying((p) => !p);
              bumpControls();
            }}
          />
        </div>
      )}

      {/* HUD Gesture / Speed / Fallback Feedback */}
      {hudFeedback && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-xl border border-white/15 bg-black/80 px-5 py-2.5 text-base font-black text-amber-400 backdrop-blur-md tabular-nums">
            {hudFeedback.label}
          </div>
        </div>
      )}

      {/* Subtitles Overlay */}
      {captionText && !audioOnlyMode && ytEmbedError === null && (
        <div className="pointer-events-none absolute inset-x-4 bottom-24 z-20 flex justify-center sm:bottom-28">
          <p
            className={`max-w-2xl rounded-lg bg-black/75 px-4 py-1.5 text-center font-semibold leading-relaxed text-white backdrop-blur-sm ${subTextSizeClass}`}
          >
            {captionText}
          </p>
        </div>
      )}

      {/* Top Overlay Bar */}
      <div
        className={`relative z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-4 py-4 transition-opacity duration-300 focus-within:pointer-events-auto focus-within:opacity-100 sm:px-6 ${
          controlsVisible || !playing || settingsOpen || drawerOpen
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            data-focusable="true"
            aria-label="رجوع"
            onClick={(e) => {
              e.stopPropagation();
              onSaveProgress(item.id, currentTime, duration);
              onBack();
            }}
            className="btn-glass flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold"
          >
            <ArrowRight className="h-4 w-4" />
            <span>رجوع</span>
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold sm:text-base">{item.title}</h1>
            <p className="truncate text-xs text-slate-300 tabular-nums">
              {item.story}
              {item.contentType === 'series'
                ? ` · م${item.seasonNumber || 1} ح${item.episodeNumber || 1}`
                : ''}
              {isDemoStage ? ' · عرض سينمائي تفاعلي' : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {episodes.length > 1 && (
            <button
              type="button"
              data-focusable="true"
              onClick={(e) => {
                e.stopPropagation();
                setDrawerOpen((d) => !d);
              }}
              className="btn-glass flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold"
            >
              <ListVideo className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">الحلقات ({episodes.length})</span>
            </button>
          )}

          <button
            type="button"
            data-focusable="true"
            aria-label={locked ? 'فتح قفل الشاشة' : 'قفل الشاشة ضد اللمس'}
            onClick={(e) => {
              e.stopPropagation();
              setLocked((l) => !l);
            }}
            className="btn-glass flex h-10 w-10 items-center justify-center rounded-xl"
          >
            {locked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Skip Intro Button */}
      {showSkipIntro && !locked && (
        <div className="absolute bottom-28 right-4 z-30 sm:right-8">
          <button
            type="button"
            data-focusable="true"
            onClick={(e) => {
              e.stopPropagation();
              seekTo(Number(item.introEndSec), 'تم تخطي المقدمة');
            }}
            className="btn-royal flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-black"
          >
            <FastForward className="h-4 w-4" />
            <span>تخطي المقدمة</span>
          </button>
        </div>
      )}

      {/* Center Pause Status Overlay */}
      {!playing && !locked && !audioOnlyMode && ytEmbedError === null && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-white/15 bg-black/65 px-6 py-4 text-center backdrop-blur-md">
            <p className="text-xs font-bold text-amber-400">متوقف مؤقتاً</p>
            <p className="mt-1 text-lg font-black">{item.title}</p>
          </div>
        </div>
      )}

      {/* Smart Up Next Card with Countdown */}
      {showUpNext && nextEpisode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-28 left-4 z-30 w-72 rounded-2xl border border-white/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl sm:left-8"
        >
          <p className="text-[11px] font-bold text-amber-400 tabular-nums">
            الحلقة التالية خلال {upNextCountdown} ث
          </p>
          <p className="mt-0.5 truncate text-sm font-extrabold text-white">
            ح{nextEpisode.episodeNumber || 1}: {nextEpisode.title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              data-focusable="true"
              onClick={() => onSelectEpisode(nextEpisode)}
              className="btn-royal flex-1 rounded-lg py-2 text-xs font-black"
            >
              تشغيل الآن
            </button>
            <button
              type="button"
              data-focusable="true"
              onClick={() => setUpNextDismissed(true)}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Floating Glass Control Dock */}
      {!locked && ytEmbedError === null && !ytApiTimedOut && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative z-30 mx-2 mb-3 rounded-2xl border border-white/15 bg-black/65 p-3.5 shadow-2xl backdrop-blur-xl transition-opacity duration-300 focus-within:pointer-events-auto focus-within:opacity-100 sm:mx-6 sm:mb-5 sm:p-4 ${
            controlsVisible || !playing || settingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {/* Pro Scrubber */}
          <div className="relative mb-2">
            {hoverTime && (
              <div
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-300"
                style={{ left: `${hoverTime.xPct}%` }}
              >
                {formatDuration(hoverTime.time)}
              </div>
            )}
            <div
              role="slider"
              aria-label="شريط تقديم الفيديو"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.round(currentTime)}
              tabIndex={0}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (rect.right - e.clientX) / rect.width));
                setHoverTime({
                  xPct: ((e.clientX - rect.left) / rect.width) * 100,
                  time: ratio * duration,
                });
              }}
              onMouseLeave={() => setHoverTime(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (rect.right - e.clientX) / rect.width));
                seekTo(ratio * duration);
              }}
              className="group relative flex h-4 cursor-pointer items-center"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover:h-2">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${pct}%`, marginRight: '0', marginLeft: 'auto' }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Primary Playback & Time */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                data-focusable="true"
                aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
                onClick={() => setPlaying((p) => !p)}
                className="btn-royal flex h-10 w-10 items-center justify-center rounded-xl"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </button>

              <button
                type="button"
                data-focusable="true"
                aria-label="تقديم 10 ثوان"
                onClick={() => seekTo(currentTime + 10, '+10 ث')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-focusable="true"
                aria-label="ترجيع 10 ثوان"
                onClick={() => seekTo(currentTime - 10, '-10 ث')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  data-focusable="true"
                  aria-label={muted ? 'إلغاء الكتم' : 'كتم الصوت'}
                  onClick={() => setMuted((m) => !m)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="مستوى الصوت"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setMuted(v === 0);
                  }}
                  className="h-1.5 w-20 cursor-pointer accent-amber-400"
                />
              </div>

              <span className="text-xs font-bold tabular-nums text-slate-200 sm:text-sm">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            {/* Unified Controls: Audio-Only + Aspect + Captions + Settings + PiP + Fullscreen */}
            <div className="relative flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                data-focusable="true"
                aria-label={audioOnlyMode ? 'العودة لعرض الفيديو' : 'تشغيل الصوت فقط'}
                title="وضع الصوت فقط"
                onClick={() => setAudioOnlyMode((a) => !a)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  audioOnlyMode ? 'bg-amber-400 text-slate-950' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Headphones className="h-4 w-4" />
              </button>

              {isNativeVideo && (
                <button
                  type="button"
                  data-focusable="true"
                  aria-label="تبديل أبعاد الشاشة"
                  title={aspectMode === 'contain' ? 'تكبير لملء العرض' : 'الأبعاد الأصلية'}
                  onClick={() =>
                    setAspectMode((m) => (m === 'contain' ? 'cover' : 'contain'))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                >
                  {aspectMode === 'cover' ? (
                    <Shrink className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                data-focusable="true"
                aria-label="تبديل الترجمة النصية"
                onClick={() =>
                  setSubtitleLang((prev) =>
                    prev === 'ar' ? 'en' : prev === 'en' ? 'off' : 'ar'
                  )
                }
                className={`flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold ${
                  subtitleLang !== 'off'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-white/10 text-slate-200'
                }`}
              >
                <Captions className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {subtitleLang === 'off' ? 'بلا ترجمة' : subtitleLang === 'ar' ? 'عربي' : 'EN'}
                </span>
              </button>

              <button
                type="button"
                data-focusable="true"
                aria-label="إعدادات المشغل"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((s) => !s)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-xs font-bold hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                <span className="tabular-nums">{playbackRate}x</span>
              </button>

              {isNativeVideo && (
                <button
                  type="button"
                  data-focusable="true"
                  aria-label="صورة داخل صورة"
                  onClick={togglePiP}
                  className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 sm:flex"
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                data-focusable="true"
                aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
                onClick={toggleFullscreen}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>

              {/* Unified Gear Settings */}
              {settingsOpen && (
                <div
                  role="dialog"
                  aria-label="إعدادات التشغيل"
                  className="absolute bottom-12 left-0 z-40 max-h-[70vh] w-72 space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-right shadow-2xl backdrop-blur-xl"
                >
                  <div>
                    <p className="mb-2 text-xs font-extrabold text-amber-400">سرعة التشغيل</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          data-focusable="true"
                          onClick={() => setPlaybackRate(rate)}
                          className={`rounded-lg py-1.5 text-xs font-bold tabular-nums ${
                            playbackRate === rate
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-extrabold text-amber-400">جودة العرض</p>
                    <div className="space-y-1">
                      {['تلقائي (1080p)', '720p متوازن', '480p توفير البيانات'].map((q) => (
                        <button
                          key={q}
                          type="button"
                          data-focusable="true"
                          onClick={() => setQualityLabel(q)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
                        >
                          <span>{q}</span>
                          {qualityLabel === q && <Check className="h-3.5 w-3.5 text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Timer className="h-3.5 w-3.5" />
                      <span>مؤقت النوم التلقائي</span>
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0, 15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          data-focusable="true"
                          onClick={() => setSleepMinutes(mins)}
                          className={`rounded-lg py-1.5 text-xs font-bold tabular-nums ${
                            sleepMinutes === mins
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {mins === 0 ? 'إيقاف' : `${mins}د`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-extrabold text-amber-400">الترجمة وحجم الخط</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'off', label: 'إيقاف' },
                          { id: 'ar', label: 'العربية' },
                          { id: 'en', label: 'English' },
                        ] as const
                      ).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          data-focusable="true"
                          onClick={() => setSubtitleLang(sub.id)}
                          className={`rounded-lg py-1.5 text-xs font-bold ${
                            subtitleLang === sub.id
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'sm', label: 'صغير' },
                          { id: 'md', label: 'متوسط' },
                          { id: 'lg', label: 'كبير' },
                        ] as const
                      ).map((sz) => (
                        <button
                          key={sz.id}
                          type="button"
                          data-focusable="true"
                          onClick={() => setSubtitleSize(sz.id)}
                          className={`rounded-lg py-1 text-[11px] font-bold ${
                            subtitleSize === sz.id
                              ? 'bg-white/25 text-amber-300'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Sun className="h-3.5 w-3.5" />
                      <span>إضاءة العرض ({Math.round((brightness / 1.25) * 100)}%)</span>
                    </p>
                    <input
                      type="range"
                      min={0.4}
                      max={1.25}
                      step={0.05}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer accent-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-Player Episode Drawer */}
      {drawerOpen && episodes.length > 1 && (
        <aside
          onClick={(e) => e.stopPropagation()}
          aria-label="قائمة الحلقات داخل المشغل"
          className="fixed inset-y-0 left-0 z-40 flex w-80 max-w-[88vw] flex-col border-r border-white/15 bg-slate-950/95 p-4 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white">{seriesWork?.displayTitle}</h2>
              <p className="text-xs text-slate-400 tabular-nums">{episodes.length} حلقة</p>
            </div>
            <button
              type="button"
              data-focusable="true"
              aria-label="إغلاق قائمة الحلقات"
              onClick={() => setDrawerOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {episodes.map((ep) => {
              const active = ep.id === item.id;
              return (
                <button
                  key={ep.id}
                  type="button"
                  data-focusable="true"
                  onClick={() => {
                    onSelectEpisode(ep);
                    setDrawerOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition-colors ${
                    active
                      ? 'border-amber-400 bg-amber-400/15'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                  }`}
                >
                  <img
                    src={ep.posterUrl || FALLBACK_ART}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-amber-400 tabular-nums">
                      م{ep.seasonNumber || 1} · ح{ep.episodeNumber || 1}
                    </p>
                    <p className="truncate text-xs font-extrabold text-white">{ep.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
};
