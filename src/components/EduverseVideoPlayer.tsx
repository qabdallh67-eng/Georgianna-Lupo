import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  Shield,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getWatermarkZone, WatermarkRenderPayload } from '../lib/securityEngine';

export interface CaptionTrack {
  lang: 'ar' | 'en';
  label: string;
  src: string;
}

interface EduverseVideoPlayerProps {
  streamUrl: string;
  title: string;
  initialPositionSeconds?: number;
  availableQualities?: string[];
  captions?: CaptionTrack[];
  watermark?: WatermarkRenderPayload | null;
  drmConfig?: {
    enabled: boolean;
    widevineLicenseUrl?: string | null;
    fairplayLicenseUrl?: string | null;
    playreadyLicenseUrl?: string | null;
  };
  onProgressSave?: (positionSeconds: number, durationSeconds: number, completed?: boolean) => void;
  onStreamExpired?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const EduverseVideoPlayer: React.FC<EduverseVideoPlayerProps> = ({
  streamUrl,
  title,
  initialPositionSeconds = 0,
  availableQualities = ['auto', '360p', '480p', '720p', '1080p'],
  captions = [],
  watermark,
  drmConfig,
  onProgressSave,
  onStreamExpired,
}) => {
  const { t, lang } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(initialPositionSeconds);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [hlsLevels, setHlsLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [activeCaption, setActiveCaption] = useState<string>('off');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);
  const [watermarkStep, setWatermarkStep] = useState(0);
  const [resumedBanner, setResumedBanner] = useState(initialPositionSeconds > 5);

  // Move dynamic watermark periodically across 6 safe zones
  useEffect(() => {
    if (!watermark) return;
    const timer = setInterval(() => {
      setWatermarkStep((prev) => (prev + 1) % 6);
    }, 7000);
    return () => clearInterval(timer);
  }, [watermark]);

  // Hide resume banner after 5s
  useEffect(() => {
    if (!resumedBanner) return;
    const timer = setTimeout(() => setResumedBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [resumedBanner]);

  // Initialize HLS or native video stream cleanly
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setErrorMsg(null);
    setBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = streamUrl.includes('.m3u8');

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startPosition: initialPositionSeconds > 0 ? initialPositionSeconds : -1,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        const levels = data.levels.map((lvl, idx) => ({
          index: idx,
          label: lvl.height ? `${lvl.height}p` : `L${idx + 1}`,
        }));
        setHlsLevels(levels);
        setBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.response?.code === 401 || data.response?.code === 403) {
            setErrorMsg(
              lang === 'ar'
                ? 'انتهت صلاحية جلسة التشغيل المحمية. جاري تجديد التفويض...'
                : 'Protected playback authorization expired.'
            );
            onStreamExpired?.();
          } else {
            setErrorMsg(
              lang === 'ar'
                ? 'تعذر تحميل بث الفيديو حالياً. يرجى التحقق من الاتصال.'
                : 'Unable to load video stream. Check your connection.'
            );
          }
          setBuffering(false);
        }
      });
    } else {
      video.src = streamUrl;
      const handleLoadedMetadata = () => {
        if (initialPositionSeconds > 0 && initialPositionSeconds < video.duration) {
          video.currentTime = initialPositionSeconds;
        }
        setDuration(video.duration || 0);
        setBuffering(false);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, initialPositionSeconds, lang, onStreamExpired]);

  // Periodic playback progress persistence
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && playing && onProgressSave && video.duration > 0) {
        onProgressSave(Math.floor(video.currentTime), Math.floor(video.duration), false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [playing, onProgressSave]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
      if (onProgressSave && video.duration > 0) {
        onProgressSave(Math.floor(video.currentTime), Math.floor(video.duration), false);
      }
    }
  }, [onProgressSave]);

  const skipBy = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
    video.currentTime = next;
    setCurrentTime(next);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleQualityChange = (q: string, levelIndex?: number) => {
    setSelectedQuality(q);
    if (hlsRef.current && typeof levelIndex === 'number') {
      hlsRef.current.currentLevel = levelIndex;
    } else if (hlsRef.current && q === 'auto') {
      hlsRef.current.currentLevel = -1;
    }
    setShowSettingsMenu(false);
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setShowSettingsMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
    if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      skipBy(10);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      skipBy(-10);
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMute();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  const zone = getWatermarkZone(watermarkStep);
  const zonePositionClass: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'center-left': 'top-1/2 -translate-y-1/2 left-6',
    'center-right': 'top-1/2 -translate-y-1/2 right-6',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
  };

  const drmActive =
    drmConfig?.enabled &&
    Boolean(
      drmConfig.widevineLicenseUrl ||
        drmConfig.fairplayLicenseUrl ||
        drmConfig.playreadyLicenseUrl
    );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="eduverse-player-shell relative rounded-2xl overflow-hidden bg-[#0A0E1C] border border-[#252C44] shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF]"
      dir="ltr"
    >
      {/* Top Protected Header Overlay */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="flex items-center gap-2 text-xs text-white/90 font-semibold truncate">
          <Shield className="w-4 h-4 text-[#14B8A6] shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-300">
          <span className="px-2 py-0.5 rounded bg-white/10">{selectedQuality.toUpperCase()}</span>
          {drmActive && <span className="px-2 py-0.5 rounded bg-[#14B8A6]/20 text-[#14B8A6]">DRM</span>}
        </div>
      </div>

      {/* Main Video Surface */}
      <div className="relative aspect-video bg-black flex items-center justify-center" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={() => {
            setPlaying(false);
            if (onProgressSave && duration > 0) {
              onProgressSave(Math.floor(duration), Math.floor(duration), true);
            }
          }}
          onError={() => {
            setBuffering(false);
            setErrorMsg(
              lang === 'ar'
                ? 'تعذر تشغيل ملف الفيديو. قد يكون الرابط منتهي الصلاحية أو غير مرفوع بعد.'
                : 'Video playback failed. The signed stream may have expired or is not uploaded.'
            );
          }}
        >
          {captions.map((cap) => (
            <track
              key={cap.lang}
              kind="subtitles"
              srcLang={cap.lang}
              label={cap.label}
              src={cap.src}
              default={activeCaption === cap.lang}
            />
          ))}
        </video>

        {/* Dynamic Student Watermark */}
        {watermark && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute z-20 px-3 py-1.5 rounded-lg bg-black/35 backdrop-blur-[2px] border border-white/10 text-white/60 text-[11px] font-mono-tabular transition-all duration-700 ${zonePositionClass[zone]}`}
          >
            <div>{watermark.primaryText}</div>
            <div className="text-[10px] opacity-80">{watermark.secondaryText}</div>
          </div>
        )}

        {/* Resume Toast */}
        {resumedBanner && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-[#635BFF]/90 text-white text-xs font-semibold shadow-lg">
            {t.player.resumedFrom} {formatTime(initialPositionSeconds)}
          </div>
        )}

        {/* Buffering Spinner */}
        {buffering && !errorMsg && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <Loader2 className="w-10 h-10 text-[#635BFF] animate-spin" />
          </div>
        )}

        {/* Error Overlay */}
        {errorMsg && (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0A0E1C]/95 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-sm text-slate-200 max-w-md">{errorMsg}</p>
            {onStreamExpired && (
              <button
                type="button"
                onClick={onStreamExpired}
                className="px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-semibold hover:bg-[#5249F5]"
              >
                {lang === 'ar' ? 'تجديد جلسة البث' : 'Refresh Stream Authorization'}
              </button>
            )}
          </div>
        )}

        {/* Center Play Overlay when paused */}
        {!playing && !buffering && !errorMsg && (
          <button
            type="button"
            aria-label={lang === 'ar' ? 'تشغيل الفيديو' : 'Play Video'}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="z-20 w-16 h-16 rounded-full bg-[#635BFF]/95 hover:bg-[#635BFF] text-white flex items-center justify-center shadow-2xl shadow-[#635BFF]/50 transition-transform hover:scale-105"
          >
            <Play className="w-7 h-7 fill-current ms-0.5" />
          </button>
        )}
      </div>

      {/* Custom EDUVERSE Control Bar */}
      <div className="bg-[#111629] px-4 py-3 space-y-2.5 border-t border-white/10">
        {/* Seek Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono-tabular text-slate-300 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            aria-label={lang === 'ar' ? 'شريط التقدم' : 'Seek bar'}
            min={0}
            max={duration || 100}
            value={Math.min(currentTime, duration || 100)}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="flex-1 h-1.5 accent-[#635BFF] cursor-pointer"
          />
          <span className="text-[11px] font-mono-tabular text-slate-400 w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-lg bg-[#635BFF] hover:bg-[#5249F5] text-white flex items-center justify-center"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => skipBy(-10)}
              aria-label="Skip back 10 seconds"
              title="-10s"
              className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono-tabular flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>10</span>
            </button>

            <button
              type="button"
              onClick={() => skipBy(10)}
              aria-label="Skip forward 10 seconds"
              title="+10s"
              className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono-tabular flex items-center gap-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>10</span>
            </button>

            <div className="flex items-center gap-1.5 ms-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="w-8 h-8 rounded-lg text-slate-200 hover:bg-white/10 flex items-center justify-center"
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  setMuted(v === 0);
                  if (videoRef.current) {
                    videoRef.current.volume = v;
                    videoRef.current.muted = v === 0;
                  }
                }}
                className="hidden sm:block w-16 h-1 accent-[#14B8A6] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 relative">
            {/* Captions Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowCaptionMenu(!showCaptionMenu);
                  setShowSettingsMenu(false);
                }}
                aria-label={t.player.captions}
                className={`h-9 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  activeCaption !== 'off'
                    ? 'bg-[#14B8A6]/20 text-[#14B8A6]'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Subtitles className="w-4 h-4" />
                <span className="hidden sm:inline">{t.player.captions}</span>
              </button>

              {showCaptionMenu && (
                <div className="absolute bottom-11 right-0 w-44 rounded-xl bg-[#171B2D] border border-white/15 shadow-2xl p-1.5 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCaption('off');
                      setShowCaptionMenu(false);
                    }}
                    className={`w-full text-start px-3 py-1.5 rounded-lg text-xs ${
                      activeCaption === 'off' ? 'bg-[#635BFF] text-white' : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {t.player.captionsOff}
                  </button>
                  {captions.map((c) => (
                    <button
                      key={c.lang}
                      type="button"
                      onClick={() => {
                        setActiveCaption(c.lang);
                        setShowCaptionMenu(false);
                      }}
                      className={`w-full text-start px-3 py-1.5 rounded-lg text-xs ${
                        activeCaption === c.lang ? 'bg-[#635BFF] text-white' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality & Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowCaptionMenu(false);
                }}
                aria-label={`${t.player.quality} & ${t.player.speed}`}
                className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono-tabular flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>{speed}x</span>
              </button>

              {showSettingsMenu && (
                <div className="absolute bottom-11 right-0 w-60 rounded-xl bg-[#171B2D] border border-white/15 shadow-2xl p-3 z-40 space-y-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5">{t.player.speed}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSpeedChange(s)}
                          className={`py-1 rounded text-[11px] font-mono-tabular ${
                            speed === s ? 'bg-[#635BFF] text-white' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5">{t.player.quality}</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleQualityChange('auto', -1)}
                        className={`px-2.5 py-1 rounded text-[11px] ${
                          selectedQuality === 'auto' ? 'bg-[#14B8A6] text-white' : 'bg-white/5 text-slate-200'
                        }`}
                      >
                        {t.player.autoQuality}
                      </button>
                      {(hlsLevels.length > 0
                        ? hlsLevels
                        : availableQualities
                            .filter((q) => q !== 'auto')
                            .map((q, idx) => ({ index: idx, label: q }))
                      ).map((lvl) => (
                        <button
                          key={lvl.label}
                          type="button"
                          onClick={() => handleQualityChange(lvl.label, lvl.index)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular ${
                            selectedQuality === lvl.label
                              ? 'bg-[#635BFF] text-white'
                              : 'bg-white/5 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
