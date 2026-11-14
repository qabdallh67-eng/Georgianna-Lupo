import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Wallet,
  PlayCircle,
  Award,
  FileCheck2,
  Bell,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { formatCurrencyAmount } from '../lib/walletEngine';

export const StudentDashboardPage: React.FC = () => {
  const { lang, t, accessToken, profile, setUnreadNotifications } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    apiFetch<any>('/api/student/dashboard', { token: accessToken })
      .then((res) => {
        if (res.ok && res.data) {
          setData(res.data);
          const unread = (res.data.notifications || []).filter((n: any) => !n.is_read).length;
          setUnreadNotifications(unread);
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken, setUnreadNotifications]);

  const enrollments = data?.enrollments || [];
  const progress = data?.progress || [];
  const completedLessons = progress.filter((p: any) => p.is_completed).length;
  const wallet = data?.wallet || { current_balance: 0, available_balance: 0, currency: 'EGP' };
  const recentAttempts = data?.recentAttempts || [];
  const certificates = data?.certificates || [];
  const latestWatched = progress[0];

  const overallPercent =
    progress.length > 0 ? Math.round((completedLessons / progress.length) * 100) : 0;

  return (
    <PortalLayout title={t.nav.dashboard}>
      <SeoHead
        titleAr="لوحة الطالب — EDUVERSE"
        titleEn="Student Dashboard — EDUVERSE"
        descriptionAr="لوحة تحكم الطالب في منصة EDUVERSE."
        descriptionEn="Student learning dashboard on EDUVERSE."
        noIndex
      />

      {!accessToken ? (
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 text-center space-y-4">
          <p className="text-base font-bold">
            {lang === 'ar'
              ? 'يرجى تسجيل الدخول للوصول إلى لوحة التعلم الخاصة بك'
              : 'Please sign in to access your student dashboard'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/login" className="px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold">
              {t.nav.login}
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#252C44] text-sm font-bold"
            >
              {t.nav.register}
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#171B2D] via-[#22294A] to-[#635BFF] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold">
                {t.dashboard.welcome} {profile?.full_name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200">
                {lang === 'ar'
                  ? 'تابع تقدمك الدراسي واستكمل دروسك من آخر موضع حفظته.'
                  : 'Track your real learning progress and resume lessons seamlessly.'}
              </p>
            </div>
            {latestWatched ? (
              <Link
                to={`/learn/${latestWatched.course_id}/${latestWatched.lecture_id}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#171B2D] text-xs sm:text-sm font-bold shadow-md shrink-0 hover:bg-slate-100"
              >
                <PlayCircle className="w-4 h-4 text-[#635BFF]" />
                <span>{t.dashboard.continueLearning}</span>
              </Link>
            ) : (
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#171B2D] text-xs sm:text-sm font-bold shadow-md shrink-0"
              >
                <BookOpen className="w-4 h-4 text-[#635BFF]" />
                <span>{t.hero.primaryCta}</span>
              </Link>
            )}
          </div>

          {/* 4 KPI Cards (Real Database Numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.dashboard.enrolledCourses}
                </span>
                <BookOpen className="w-4 h-4 text-[#635BFF]" />
              </div>
              <p className="text-2xl font-extrabold tabular-nums">{enrollments.length}</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.dashboard.completedLessons}
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <p className="text-2xl font-extrabold tabular-nums">{completedLessons}</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.dashboard.overallProgress}
                </span>
                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              </div>
              <p className="text-2xl font-extrabold tabular-nums">{overallPercent}%</p>
            </div>

            <Link
              to="/wallet"
              className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF] p-5 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.dashboard.walletBalance}
                </span>
                <Wallet className="w-4 h-4 text-[#635BFF]" />
              </div>
              <p className="text-xl font-extrabold tabular-nums">
                {formatCurrencyAmount(Number(wallet.available_balance), wallet.currency || 'EGP', lang)}
              </p>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Enrolled Courses */}
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{t.dashboard.enrolledCourses}</h3>
                <Link to="/courses" className="text-xs font-bold text-[#635BFF] hover:underline">
                  {t.common.viewAll}
                </Link>
              </div>

              {enrollments.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.dashboard.noEnrolled}</p>
                  <Link
                    to="/courses"
                    className="inline-flex px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-bold"
                  >
                    {t.hero.primaryCta}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enr: any) => (
                    <Link
                      key={enr.id}
                      to={`/courses/${enr.course_id}`}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{enr.courses?.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {enr.courses?.teacher_name || 'EDUVERSE'}
                        </p>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-[#635BFF]/10 text-[#635BFF] text-xs font-bold shrink-0">
                        {t.courses.continueLearning}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Results, Notifications & Certificates */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#635BFF]" />
                  <span>{t.dashboard.recentResults}</span>
                </h3>
                {recentAttempts.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.exams.emptyExams}</p>
                ) : (
                  <div className="space-y-2">
                    {recentAttempts.slice(0, 4).map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-[#252C44] last:border-0"
                      >
                        <span className="truncate font-semibold">{att.exams?.title}</span>
                        <span className="font-mono-tabular font-bold text-[#635BFF]">
                          {att.exams?.results_published ? `${att.score}/${att.max_score}` : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#14B8A6]" />
                  <span>{t.dashboard.certificates}</span>
                </h3>
                {certificates.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ar'
                      ? 'تُصدر الشهادات تلقائياً عند استيفاء شروط إكمال الكورس.'
                      : 'Certificates are issued automatically once completion thresholds are met.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {certificates.map((cert: any) => (
                      <div key={cert.id} className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-xs">
                        <p className="font-bold">{cert.courses?.title}</p>
                        <p className="font-mono-tabular text-[11px] opacity-80">{cert.certificate_code}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/notifications"
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF] text-xs font-bold"
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#635BFF]" />
                  <span>{t.nav.notifications}</span>
                </span>
                <span className="text-[#635BFF]">{t.common.viewAll}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};
