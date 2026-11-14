import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  MessageSquare,
  Wallet,
  Bell,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
  Globe,
  Trophy,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from './BrandLogo';

interface PortalLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ title, children }) => {
  const { lang, toggleLang, theme, cycleTheme, t, profile, logout, unreadNotifications } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isApprovedAdmin =
    profile &&
    ['admin', 'super_admin', 'moderator'].includes(profile.role) &&
    profile.account_status === 'approved';

  const menuItems = [
    { to: '/', label: t.nav.home, icon: Home },
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/courses', label: t.nav.courses, icon: BookOpen },
    { to: '/exams', label: t.nav.exams, icon: FileCheck2 },
    { to: '/forum', label: t.nav.forum, icon: MessageSquare },
    { to: '/wallet', label: t.nav.wallet, icon: Wallet },
    { to: '/notifications', label: t.nav.notifications, icon: Bell, badge: unreadNotifications },
    { to: '/profile', label: t.nav.profile, icon: User },
    ...(isApprovedAdmin ? [{ to: '/admin', label: t.nav.admin, icon: ShieldCheck }] : []),
  ];

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F6F7FB] dark:bg-[#0D111D] text-[#171B2D] dark:text-[#F1F5F9]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Right side in Arabic RTL, Left side in English LTR (flex row automatically flips with dir=rtl!) */}
      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen w-68 shrink-0 bg-white dark:bg-[#151A2C] border-e border-slate-200 dark:border-[#252C44] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen
            ? 'translate-x-0'
            : lang === 'ar'
              ? 'translate-x-full lg:translate-x-0'
              : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo size="sm" />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1E243B]"
              aria-label={t.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1" aria-label={lang === 'ar' ? 'قائمة البوابة' : 'Portal Navigation'}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#635BFF] text-white shadow-sm shadow-[#635BFF]/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full tabular-nums ${
                        active ? 'bg-white/20 text-white' : 'bg-[#635BFF]/10 text-[#635BFF]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Progress/Achievements Callout & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-[#252C44] space-y-3">
          <Link
            to="/profile"
            className="block p-3.5 rounded-2xl bg-gradient-to-br from-[#635BFF]/10 to-[#14B8A6]/10 border border-[#635BFF]/20 hover:border-[#635BFF]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#635BFF] text-white flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#171B2D] dark:text-white truncate">
                  {lang === 'ar' ? 'الإنجازات والشهادات' : 'Achievements & Certs'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {lang === 'ar' ? 'استعرض تقدمك الفعلي' : 'View real progress'}
                </p>
              </div>
            </div>
          </Link>

          {profile && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.logout}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 bg-white/90 dark:bg-[#151A2C]/90 backdrop-blur-xl border-b border-slate-200 dark:border-[#252C44] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-[#252C44] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={t.theme[theme]}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-[#252C44] flex items-center justify-center hover:border-[#635BFF] transition-colors"
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleLang}
              className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs font-bold flex items-center gap-1 hover:border-[#635BFF] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>{lang === 'ar' ? 'EN' : 'AR'}</span>
            </button>
            <Link
              to="/notifications"
              aria-label={t.nav.notifications}
              className="relative w-9 h-9 rounded-xl border border-slate-200 dark:border-[#252C44] flex items-center justify-center hover:border-[#635BFF] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -end-1 min-w-4 h-4 px-1 rounded-full bg-[#635BFF] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifications}
                </span>
              )}
            </Link>
            {profile ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 ps-2 pe-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#635BFF] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {profile.full_name?.slice(0, 1) || 'ط'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold max-w-[120px] truncate">
                  {profile.full_name}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl bg-[#635BFF] text-white text-xs font-semibold"
              >
                {t.nav.login}
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
