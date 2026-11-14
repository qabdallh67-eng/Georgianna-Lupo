import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sun,
  Moon,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { SeoHead } from '../components/SeoHead';
import { evaluatePasswordStrength, validateRegistrationInput } from '../lib/validation';
import { apiFetch } from '../lib/api';

export const RegisterPage: React.FC = () => {
  const { lang, toggleLang, resolvedDark, setTheme, t, getAssetUrl } = useApp();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const artworkUrl = getAssetUrl('auth_illustration', '/assets/eduverse-student-art.jpg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    const check = validateRegistrationInput(
      { fullName, phone, guardianPhone, email, password, confirmPassword, acceptedTerms },
      lang
    );

    if (!check.valid) {
      setFieldErrors(check.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await apiFetch<{
        ok?: boolean;
        message_ar?: string;
        message_en?: string;
        errors?: Record<string, string>;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          phone,
          guardianPhone,
          email,
          password,
          confirmPassword,
          acceptedTerms,
          locale: lang,
        }),
      });

      if (!res.ok) {
        if (res.data?.errors) setFieldErrors(res.data.errors);
        setServerError(
          (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
            (lang === 'ar' ? 'تعذر إنشاء الحساب، يرجى مراجعة البيانات.' : 'Registration failed.')
        );
      } else {
        setSuccessMsg(
          (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
            (lang === 'ar' ? 'تم إنشاء الحساب بنجاح.' : 'Account created successfully.')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-[#EEF1FA] to-[#E6E9F8] dark:from-[#0D111D] dark:via-[#14192D] dark:to-[#171B2D] flex items-center justify-center p-4 sm:p-6">
      <SeoHead
        titleAr="إنشاء حساب طالب جديد — EDUVERSE"
        titleEn="Create Student Account — EDUVERSE"
        descriptionAr="سجل حسابك كطالب في منصة EDUVERSE التعليمية."
        descriptionEn="Register a new student account on EDUVERSE."
        noIndex
      />

      <div className="w-full max-w-6xl rounded-3xl bg-white/95 dark:bg-[#151A2C] border border-slate-200/80 dark:border-[#252C44] shadow-2xl overflow-hidden grid lg:grid-cols-12">
        {/* Visual Side */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#ECEFFE] to-[#DFE4FB] dark:from-[#171B2D] dark:to-[#1E2440] p-8 flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between">
            <Link to="/">
              <BrandLogo size="md" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(resolvedDark ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-xl bg-white/80 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white"
              >
                {resolvedDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleLang}
                className="h-9 px-3 rounded-xl bg-white/80 dark:bg-white/10 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-white"
              >
                <Globe className="w-3.5 h-3.5 text-[#635BFF]" />
                <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <div className="w-56 h-56 mx-auto rounded-3xl overflow-hidden border-4 border-white/80 dark:border-[#2E3658] shadow-xl">
              <img
                src={artworkUrl}
                alt={lang === 'ar' ? 'طالب يتعلم عبر EDUVERSE' : 'EDUVERSE Student Illustration'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-extrabold text-[#171B2D] dark:text-white">
              {lang === 'ar' ? 'مرحباً بك في منصة EDUVERSE' : 'Welcome to EDUVERSE'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {lang === 'ar' ? 'رحلتك نحو المعرفة والنجاح تبدأ من هنا' : 'Your journey to knowledge and mastery begins here'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {t.auth.highlights.map((item) => (
              <div
                key={item}
                className="px-3 py-2 rounded-xl bg-white/85 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs font-semibold text-[#171B2D] dark:text-slate-200 flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF] shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Side (Student-Only Registration) */}
        <div className="lg:col-span-7 p-6 sm:p-10">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#635BFF] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#635BFF]/30">
                <UserPlus className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#171B2D] dark:text-white">
                {t.auth.registerTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t.auth.registerSubtitle}
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {successMsg ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{successMsg}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold"
                >
                  {t.auth.loginLink}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* 1. Full Name */}
                <div>
                  <label htmlFor="reg-fullname" className="block text-xs font-bold mb-1.5">
                    {t.auth.fullName}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                    <input
                      id="reg-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t.auth.fullName}
                      className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* 2. Personal Phone & 3. Guardian Phone */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-bold mb-1.5">
                      {t.auth.phone}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                      <input
                        id="reg-phone"
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm font-mono-tabular focus:outline-none focus:border-[#635BFF]"
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-guardian" className="block text-xs font-bold mb-1.5">
                      {t.auth.guardianPhone}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#14B8A6] absolute top-1/2 -translate-y-1/2 start-3.5" />
                      <input
                        id="reg-guardian"
                        type="tel"
                        dir="ltr"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="01198765432"
                        className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm font-mono-tabular focus:outline-none focus:border-[#635BFF]"
                      />
                    </div>
                    {fieldErrors.guardianPhone && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors.guardianPhone}</p>
                    )}
                  </div>
                </div>

                {/* 4. Gmail Address */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-bold mb-1.5">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                    <input
                      id="reg-email"
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* 5. Password & 6. Confirm Password */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold mb-1.5">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                      <input
                        id="reg-password"
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
                    {fieldErrors.password && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-confirm" className="block text-xs font-bold mb-1.5">
                      {t.auth.confirmPassword}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
                      <input
                        id="reg-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 ps-10 pe-10 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label="Toggle confirm password visibility"
                        className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Password Strength Guidance */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">{t.auth.strengthLabel}</span>
                      <span
                        className={
                          strength.level === 'strong'
                            ? 'text-emerald-600'
                            : strength.level === 'good'
                              ? 'text-blue-600'
                              : strength.level === 'fair'
                                ? 'text-amber-600'
                                : 'text-rose-600'
                        }
                      >
                        {t.auth.strengthLevels[strength.level]}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#252C44] overflow-hidden grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-colors ${
                            strength.score >= step
                              ? strength.level === 'strong'
                                ? 'bg-emerald-500'
                                : strength.level === 'good'
                                  ? 'bg-[#2563EB]'
                                  : strength.level === 'fair'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms */}
                <div>
                  <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 accent-[#635BFF] rounded"
                    />
                    <span>{t.auth.acceptTerms}</span>
                  </label>
                  {fieldErrors.acceptedTerms && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.acceptedTerms}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] hover:opacity-95 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-[#635BFF]/25 transition-all"
                >
                  {submitting ? t.common.loading : t.auth.submitRegister}
                </button>

                <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
                  {t.auth.alreadyHaveAccount}{' '}
                  <Link to="/login" className="font-bold text-[#635BFF] hover:underline">
                    {t.auth.loginLink}
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
