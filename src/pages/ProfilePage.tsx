import React, { useState } from 'react';
import { User, Shield, CheckCircle2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { maskPhoneForDisplay } from '../lib/securityEngine';

export const ProfilePage: React.FC = () => {
  const { lang, t, accessToken, profile, setAuthSession } = useApp();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await apiFetch<{ profile: any }>('/api/student/profile', {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({ full_name: fullName, bio, grade_level: gradeLevel }),
      });
      if (res.ok && res.data?.profile) {
        setAuthSession(accessToken, res.data.profile);
        setSavedMsg(lang === 'ar' ? 'تم حفظ التعديلات بنجاح.' : 'Profile updated successfully.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title={t.profile.title}>
      <SeoHead
        titleAr="الملف الشخصي — EDUVERSE"
        titleEn="Student Profile — EDUVERSE"
        descriptionAr="إدارة بيانات الحساب الشخصي للطالب."
        descriptionEn="Manage your student account profile."
        noIndex
      />

      <div className="max-w-3xl space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#635BFF] text-white text-2xl font-extrabold flex items-center justify-center">
              {profile?.full_name?.slice(0, 1) || <User className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold">{profile?.full_name || t.nav.profile}</h2>
              <p className="text-xs text-slate-500">
                {t.profile.accountStatus}: <span className="font-bold text-[#14B8A6]">{profile?.account_status || 'guest'}</span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0D111D] text-xs">
            <div>
              <p className="text-slate-500 mb-1">{t.auth.phone}</p>
              <p className="font-mono-tabular font-bold" dir="ltr">
                {maskPhoneForDisplay(profile?.phone)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">{t.auth.guardianPhone}</p>
              <p className="font-mono-tabular font-bold" dir="ltr">
                {maskPhoneForDisplay(profile?.guardian_phone)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">{t.auth.email}</p>
              <p className="font-mono-tabular font-bold truncate" dir="ltr">
                {profile?.email || '—'}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#635BFF]" />
            <span>{t.profile.privacyHint}</span>
          </p>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedMsg}</span>
            </div>
          )}

          {accessToken && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5">{t.auth.fullName}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  {lang === 'ar' ? 'المرحلة الدراسية' : 'Grade Level'}
                </label>
                <input
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  {lang === 'ar' ? 'نبذة شخصية' : 'Bio'}
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold"
              >
                {saving ? t.common.loading : t.profile.saveChanges}
              </button>
            </form>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};
