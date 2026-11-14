import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const { lang, t } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message_ar?: string; message_en?: string }>('/api/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ identifier, channel }),
      });
      setFeedback({
        ok: res.ok,
        msg:
          (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
          (res.ok ? 'Sent' : 'Error'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0D111D] flex items-center justify-center p-4">
      <SeoHead
        titleAr="استعادة كلمة المرور — EDUVERSE"
        titleEn="Recover Password — EDUVERSE"
        descriptionAr="استعد حسابك في منصة EDUVERSE بأمان."
        descriptionEn="Recover your EDUVERSE account password securely."
        noIndex
      />
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] shadow-xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <BrandLogo size="sm" />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold">{t.auth.recoverTitle}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.auth.recoverSubtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0D111D]">
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              channel === 'email' ? 'bg-white dark:bg-[#1E243B] text-[#635BFF] shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.auth.recoverByEmail}
          </button>
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
              channel === 'sms' ? 'bg-white dark:bg-[#1E243B] text-[#635BFF] shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.auth.recoverBySms}
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
              feedback.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-[#635BFF] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="01012345678 / student@gmail.com"
              className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#2A3250] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#635BFF] hover:bg-[#5249F5] text-white font-bold text-sm"
          >
            {loading ? t.common.loading : t.auth.sendRecovery}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-xs font-bold text-[#635BFF] hover:underline">
            {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
};
