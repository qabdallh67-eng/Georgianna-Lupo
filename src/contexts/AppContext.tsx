import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TRANSLATIONS, Locale } from '../lib/i18n';
import { getBrowserSupabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface MediaAssetItem {
  asset_key: string;
  title: string;
  url: string;
  alt_text_ar?: string;
  alt_text_en?: string;
}

export interface NavItem {
  id: string;
  label_ar: string;
  label_en: string;
  href: string;
  is_external: boolean;
  location: string;
  sort_order: number;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  guardian_phone: string | null;
  email: string | null;
  avatar_url: string | null;
  grade_level: string | null;
  group_name: string | null;
  role: string;
  account_status: string;
  bio: string | null;
  preferred_language: string;
  preferred_theme: string;
}

export interface BootstrapData {
  dbConnected: boolean;
  missingVariables: string[];
  site_settings: {
    site_name: string;
    site_tagline_ar: string;
    site_tagline_en: string;
    canonical_domain: string;
    default_language: string;
    default_currency: string;
    require_student_approval: boolean;
    watermark_enabled_default: boolean;
    contact_email?: string;
    contact_phone?: string;
  };
  theme_settings: {
    default_theme: ThemeMode;
    primary_navy: string;
    primary_purple: string;
    electric_blue: string;
    teal_accent: string;
    light_background: string;
  };
  media_assets: MediaAssetItem[];
  navigation_items: NavItem[];
  social_links: Array<{ id: string; platform: string; label_ar: string; label_en: string; url: string }>;
  page_content: Record<string, Record<string, any>>;
  featured_courses: any[];
  stats: {
    approvedStudents: number;
    publishedCourses: number;
    totalLectures: number;
  } | null;
}

interface AppContextValue {
  lang: Locale;
  setLang: (l: Locale) => void;
  toggleLang: () => void;
  t: (typeof TRANSLATIONS)['ar'] | (typeof TRANSLATIONS)['en'];
  theme: ThemeMode;
  resolvedDark: boolean;
  setTheme: (m: ThemeMode) => void;
  cycleTheme: () => void;
  bootstrap: BootstrapData | null;
  refreshBootstrap: () => Promise<void>;
  getAssetUrl: (assetKey: string, fallbackUrl: string) => string;
  accessToken: string | null;
  profile: UserProfile | null;
  authLoading: boolean;
  setAuthSession: (token: string | null, profile: UserProfile | null, remember?: boolean) => void;
  logout: () => Promise<void>;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_TOKEN_KEY = 'eduverse_access_token';
const STORAGE_PROFILE_KEY = 'eduverse_profile';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Locale>(() => {
    const saved = localStorage.getItem('eduverse_lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eduverse_theme') as ThemeMode | null;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  const [resolvedDark, setResolvedDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY) || sessionStorage.getItem(STORAGE_TOKEN_KEY);
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PROFILE_KEY) || sessionStorage.getItem(STORAGE_PROFILE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const setLang = useCallback((next: Locale) => {
    setLangState(next);
    localStorage.setItem('eduverse_lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  const applyThemeToDom = useCallback((mode: ThemeMode) => {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
    setResolvedDark(shouldBeDark);
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      localStorage.setItem('eduverse_theme', mode);
      applyThemeToDom(mode);
    },
    [applyThemeToDom]
  );

  const cycleTheme = useCallback(() => {
    const next: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  useEffect(() => {
    applyThemeToDom(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyThemeToDom('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyThemeToDom]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }, [lang]);

  const refreshBootstrap = useCallback(async () => {
    const res = await apiFetch<BootstrapData>('/api/public/bootstrap');
    if (res.ok && res.data) {
      setBootstrap(res.data);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  // Restore session with Supabase if configured
  useEffect(() => {
    const supa = getBrowserSupabase();
    if (!supa) return;

    setAuthLoading(true);
    supa.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session?.access_token) {
          setAccessToken(data.session.access_token);
          const dashRes = await apiFetch<{ profile?: UserProfile; notifications?: any[] }>(
            '/api/student/dashboard',
            { token: data.session.access_token }
          );
          if (dashRes.ok && dashRes.data?.profile) {
            setProfile(dashRes.data.profile);
            const unread = (dashRes.data.notifications || []).filter((n) => !n.is_read).length;
            setUnreadNotifications(unread);
          }
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const setAuthSession = useCallback(
    (token: string | null, nextProfile: UserProfile | null, remember = true) => {
      setAccessToken(token);
      setProfile(nextProfile);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_PROFILE_KEY);
      sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_PROFILE_KEY);

      if (token && nextProfile) {
        const store = remember ? localStorage : sessionStorage;
        store.setItem(STORAGE_TOKEN_KEY, token);
        store.setItem(STORAGE_PROFILE_KEY, JSON.stringify(nextProfile));
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const supa = getBrowserSupabase();
    if (supa) {
      await supa.auth.signOut();
    }
    setAuthSession(null, null);
    setUnreadNotifications(0);
  }, [setAuthSession]);

  const getAssetUrl = useCallback(
    (assetKey: string, fallbackUrl: string) => {
      const found = bootstrap?.media_assets?.find((a) => a.asset_key === assetKey);
      return found?.url || fallbackUrl;
    },
    [bootstrap]
  );

  const t = TRANSLATIONS[lang];

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        theme,
        resolvedDark,
        setTheme,
        cycleTheme,
        bootstrap,
        refreshBootstrap,
        getAssetUrl,
        accessToken,
        profile,
        authLoading,
        setAuthSession,
        logout,
        unreadNotifications,
        setUnreadNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
