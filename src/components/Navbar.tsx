import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor, Globe, Menu, X, ExternalLink, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from './BrandLogo';

export const Navbar: React.FC = () => {
  const { lang, toggleLang, theme, cycleTheme, t, bootstrap, profile } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = bootstrap?.navigation_items?.filter((n) => n.location === 'header') || [
    { id: 'home', label_ar: t.nav.home, label_en: t.nav.home, href: '/', is_external: false, location: 'header', sort_order: 1 },
    { id: 'courses', label_ar: t.nav.courses, label_en: t.nav.courses, href: '/courses', is_external: false, location: 'header', sort_order: 2 },
    { id: 'forum', label_ar: t.nav.forum, label_en: t.nav.forum, href: '/forum', is_external: false, location: 'header', sort_order: 3 },
    { id: 'exams', label_ar: t.nav.exams, label_en: t.nav.exams, href: '/exams', is_external: false, location: 'header', sort_order: 4 },
    { id: 'heroes', label_ar: t.nav.heroes, label_en: t.nav.heroes, href: 'https://www.facebook.com/share/1dMmrhFZks/', is_external: true, location: 'header', sort_order: 5 },
  ];

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-[#252C44] bg-white/90 dark:bg-[#171B2D]/90 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="EDUVERSE Home">
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6" aria-label={lang === 'ar' ? 'القائمة الرئيسية' : 'Main Navigation'}>
          {navItems.slice(0, 6).map((item) => {
            const label = lang === 'ar' ? item.label_ar : item.label_en;
            if (item.is_external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#635BFF] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{label}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              );
            }
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`text-sm font-semibold transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  active
                    ? 'text-[#635BFF] dark:text-white border-[#635BFF]'
                    : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-[#635BFF] dark:hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Controls & Auth CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={t.theme[theme]}
            title={t.theme[theme]}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#1E243B] text-slate-700 dark:text-slate-200 flex items-center justify-center hover:border-[#635BFF] transition-colors"
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleLang}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#1E243B] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:border-[#635BFF] transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-4 h-4 text-[#635BFF]" />
            <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
          </button>

          {profile ? (
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#635BFF] hover:bg-[#5249F5] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t.nav.dashboard}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2A3250] text-slate-700 dark:text-slate-200 hover:border-[#635BFF] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.nav.login}</span>
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] hover:opacity-95 text-white text-sm font-semibold shadow-md shadow-[#635BFF]/20 transition-all whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.nav.register}</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? t.common.close : 'Menu'}
            className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-[#2A3250] flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-[#252C44] bg-white dark:bg-[#171B2D] px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const label = lang === 'ar' ? item.label_ar : item.label_en;
            if (item.is_external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E243B]"
                >
                  <span>{label}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              );
            }
            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E243B]"
              >
                {label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-200 dark:border-[#252C44] flex gap-2">
            {profile ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-semibold"
              >
                {t.nav.dashboard}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 dark:border-[#2A3250] text-sm font-semibold"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-semibold"
                >
                  {t.nav.register}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
