import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, AlertCircle, LogIn, Globe, Sun, Moon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const LoginPage: React.FC = () => {
  const { lang, toggleLang, resolvedDark, setTheme, t, getAssetUrl, setAuthSession } = useApp();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const portraitUrl = getAssetUrl('teacher_portrait', '/assets/eduverse-teacher-portrait.jpg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال رقم الهاتف الشخصي وكلمة المرور.'
          : 'Please enter your personal phone number and password.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        ok?: boolean;
        session?: { access_token: string };
        profile?: any;
        message_ar?: string;
        message_en?: string;
      }>('/api/auth/phone-login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok || !res.data?.session?.access_token || !res.data?.profile) {
        setErrorMsg(
          (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
            (lang === 'ar' ? 'تعذر تسجيل الدخول.' : 'Sign in failed.')
        );
        return;
      }

      setAuthSession(res.data.session.access_token, res.data.profile, rememberMe);
      if (['admin', 'super_admin'].includes(res.data.profile.role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0D111D] flex items-center justify-center p-4 sm:p-6">
      <SeoHead
        titleAr="تسجيل الدخول — EDUVERSE"
        titleEn="Sign In — EDUVERSE"
        descriptionAr="تسجيل دخول الطلاب إلى منصة EDUVERSE التعليمية."
        descriptionEn="Sign in to your EDUVERSE student account."
        noIndex
      />

      <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] shadow-2xl overflow-hidden grid lg:grid-cols-12">
        {/* Left Artwork Side */}
        <div className="lg:col-span-6 bg-[#171B2D] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 25%, #635BFF, transparent 50%), radial-gradient(circle at 80% 80%, #14B8A6, transparent 45%)',
            }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/">
              <BrandLogo size="md" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(resolvedDark ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
              >
                {resolvedDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleLang}
                className="h-9 px-3 rounded-xl bg-white/10 text-xs font-bold flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 my-8 flex flex-col items-center text-center space-y-5">
            <div className="w-52 aspect-[7/8] rounded-3xl overflow-hidden border-2 border-[#635BFF]/60 shadow-2xl">
              <img
                src={portraitUrl}
                alt={lang === 'ar' ? 'معلم منصة EDUVERSE' : 'EDUVERSE Instructor'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-extrabold">{t.hero.heading}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{t.hero.subheading}</p>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400 text-center">
            {t.tagline}
          </div>
        </div>

        {/* Form Side */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center mx-auto">
                <LogIn className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#171B2D] dark:text-white">
                {t.auth.loginTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t.auth.loginSubtitle}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-phone" className="block text-xs font-bold mb-1.5">
                  {t.auth.phoneOrEmail}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                  <input
                    id="login-phone"
                    type="text"
                    dir="ltr"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="01012345678"
                    className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm font-mono-tabular focus:outline-none focus:border-[#635BFF]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold mb-1.5">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 ps-10 pe-10 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Toggle password visibility"
                    className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#635BFF] rounded"
                  />
                  <span>{t.auth.rememberMe}</span>
                </label>
                <Link to="/forgot-password" className="font-bold text-[#635BFF] hover:underline">
                  {t.auth.forgotPassword}
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] hover:opacity-95 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-[#635BFF]/25 transition-all"
              >
                {submitting ? t.common.loading : t.auth.submitLogin}
              </button>
            </form>

            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              {t.auth.noAccountYet}{' '}
              <Link to="/register" className="font-bold text-[#635BFF] hover:underline">
                {t.auth.registerLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
