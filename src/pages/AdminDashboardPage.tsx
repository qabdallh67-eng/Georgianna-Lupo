import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Video,
  Wallet,
  Image as ImageIcon,
  FileText,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

type AdminTab =
  | 'overview'
  | 'students'
  | 'courses'
  | 'videos'
  | 'wallet'
  | 'content'
  | 'media'
  | 'audit'
  | 'settings';

export const AdminDashboardPage: React.FC = () => {
  const { lang, accessToken, profile, bootstrap, refreshBootstrap } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Course creation state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [coursePrice, setCoursePrice] = useState('0');
  const [coursePublished, setCoursePublished] = useState(true);

  // Media replacement state
  const [assetKey, setAssetKey] = useState('official_logo');
  const [assetUrl, setAssetUrl] = useState('');

  // Abdullah & Hero content editor state
  const [abdName, setAbdName] = useState(bootstrap?.page_content?.abdullah?.ar?.name || 'عبد الله');
  const [abdRole, setAbdRole] = useState(bootstrap?.page_content?.abdullah?.ar?.role || '');
  const [abdBio, setAbdBio] = useState(bootstrap?.page_content?.abdullah?.ar?.bio || '');
  const [abdWebsite, setAbdWebsite] = useState(bootstrap?.page_content?.abdullah?.ar?.website || '');
  const [abdEmail, setAbdEmail] = useState(bootstrap?.page_content?.abdullah?.ar?.email || '');

  // Wallet adjustment state
  const [adjStudentId, setAdjStudentId] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDesc, setAdjDesc] = useState('');

  // Site settings state
  const [defaultTheme, setDefaultTheme] = useState(bootstrap?.theme_settings?.default_theme || 'system');
  const [canonicalDomain, setCanonicalDomain] = useState(bootstrap?.site_settings?.canonical_domain || '');

  const isAuthorized =
    profile && ['admin', 'super_admin', 'moderator'].includes(profile.role) && profile.account_status === 'approved';

  const loadAdminData = useCallback(async () => {
    if (!accessToken || !isAuthorized) return;
    const [ovRes, stRes] = await Promise.all([
      apiFetch<any>('/api/admin/overview', { token: accessToken }),
      apiFetch<{ students: any[] }>(`/api/admin/students?q=${encodeURIComponent(studentFilter)}`, {
        token: accessToken,
      }),
    ]);
    if (ovRes.ok) setOverview(ovRes.data);
    if (stRes.ok && stRes.data?.students) setStudents(stRes.data.students);
  }, [accessToken, isAuthorized, studentFilter]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const updateStudentStatus = async (id: string, status: string) => {
    if (!accessToken) return;
    const res = await apiFetch(`/api/admin/students/${id}/status`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFeedback(lang === 'ar' ? 'تم تحديث حالة الطالب بنجاح.' : 'Student status updated.');
      loadAdminData();
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !courseTitle.trim()) return;
    const res = await apiFetch('/api/admin/courses', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        title: courseTitle.trim(),
        category: courseCategory.trim() || 'برمجة',
        price: Number(coursePrice) || 0,
        is_published: coursePublished,
        is_featured: true,
      }),
    });
    if (res.ok) {
      setCourseTitle('');
      setFeedback(lang === 'ar' ? 'تم إنشاء الكورس بنجاح.' : 'Course created.');
      loadAdminData();
      refreshBootstrap();
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !assetUrl.trim()) return;
    const res = await apiFetch('/api/admin/media/asset', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ asset_key: assetKey, url: assetUrl.trim(), title: assetKey }),
    });
    if (res.ok) {
      setFeedback(lang === 'ar' ? 'تم تحديث الصورة عبر المنصة بالكامل.' : 'Asset replaced globally.');
      setAssetUrl('');
      refreshBootstrap();
    }
  };

  const handleSaveAbdullah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const res = await apiFetch('/api/admin/content', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        page_key: 'abdullah',
        section_key: 'profile',
        locale: 'ar',
        content: { name: abdName, role: abdRole, bio: abdBio, website: abdWebsite, email: abdEmail },
      }),
    });
    if (res.ok) {
      setFeedback(lang === 'ar' ? 'تم حفظ صفحة عبد الله بنجاح.' : 'Abdullah profile updated.');
      refreshBootstrap();
    }
  };

  const handleWalletAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const res = await apiFetch('/api/admin/wallet/adjust', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        studentId: adjStudentId,
        txType: 'adjustment',
        amount: Number(adjAmount),
        description: adjDesc || 'رصيد إداري',
      }),
    });
    if (res.ok) {
      setFeedback(lang === 'ar' ? 'تم تنفيذ العملية المالية وتسجيلها في السجل.' : 'Wallet adjusted.');
      setAdjAmount('');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const res = await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({
        site_settings: { canonical_domain: canonicalDomain },
        theme_settings: { default_theme: defaultTheme },
      }),
    });
    if (res.ok) {
      setFeedback(lang === 'ar' ? 'تم حفظ إعدادات الموقع والمظهر.' : 'Settings saved.');
      refreshBootstrap();
    }
  };

  const revokePlayback = async (logId: string) => {
    if (!accessToken) return;
    await apiFetch(`/api/admin/video-logs/${logId}/revoke`, { method: 'POST', token: accessToken });
    setFeedback(lang === 'ar' ? 'تم إيقاف جلسة التشغيل فوراً.' : 'Playback session revoked.');
    loadAdminData();
  };

  const tabs: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Activity },
    { id: 'students', label: lang === 'ar' ? 'إدارة الطلاب' : 'Students', icon: Users },
    { id: 'courses', label: lang === 'ar' ? 'إدارة الكورسات' : 'Courses', icon: BookOpen },
    { id: 'videos', label: lang === 'ar' ? 'أمان الفيديو' : 'Video Logs', icon: Video },
    { id: 'wallet', label: lang === 'ar' ? 'المحفظة المالية' : 'Wallet', icon: Wallet },
    { id: 'content', label: lang === 'ar' ? 'صفحة عبد الله والمحتوى' : 'Content', icon: FileText },
    { id: 'media', label: lang === 'ar' ? 'الشعار والصور' : 'Media', icon: ImageIcon },
    { id: 'audit', label: lang === 'ar' ? 'سجل الأمان' : 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: lang === 'ar' ? 'إعدادات المنصة' : 'Settings', icon: Settings },
  ];

  return (
    <PortalLayout title={lang === 'ar' ? 'لوحة الإدارة المعتمدة' : 'Authorized Admin Dashboard'}>
      <SeoHead
        titleAr="لوحة الإدارة — EDUVERSE"
        titleEn="Admin Dashboard — EDUVERSE"
        descriptionAr="لوحة تحكم الإدارة."
        descriptionEn="EDUVERSE Administration Console."
        noIndex
      />

      {!isAuthorized ? (
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-rose-200 dark:border-rose-900/50 p-10 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-extrabold">
            {lang === 'ar' ? 'وصول مقيد للإدارة المصرح لها فقط' : 'Restricted to Authorized Administrators'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {lang === 'ar'
              ? 'هذه اللوحة محمية بالخادم وسياسات RLS ولا يمكن إنشاء حسابات إدارة من الواجهة العامة.'
              : 'Admin access requires an existing authorized administrator account verified on the server.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs Bar */}
          <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44]">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    tab === item.id
                      ? 'bg-[#635BFF] text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {feedback}
            </div>
          )}

          {tab === 'overview' && overview?.stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students', val: overview.stats.studentsTotal },
                { label: lang === 'ar' ? 'الطلاب المفعلين' : 'Active Students', val: overview.stats.studentsActive },
                { label: lang === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval', val: overview.stats.studentsPending },
                { label: lang === 'ar' ? 'الكورسات المنشورة' : 'Published Courses', val: overview.stats.coursesPublished },
                { label: lang === 'ar' ? 'الاشتراكات النشطة' : 'Active Enrollments', val: overview.stats.enrollmentsCount },
                { label: lang === 'ar' ? 'محاولات الامتحان' : 'Exam Attempts', val: overview.stats.examAttemptsCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5"
                >
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-extrabold font-mono-tabular">{stat.val}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-4">
              <input
                type="search"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث باسم الطالب أو الهاتف...' : 'Search student...'}
                className="w-full sm:w-80 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0D111D]">
                    <tr>
                      <th className="text-start p-3">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th className="text-start p-3">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                      <th className="text-start p-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="text-start p-3">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252C44]">
                    {students.map((st) => (
                      <tr key={st.id}>
                        <td className="p-3 font-bold">{st.full_name}</td>
                        <td className="p-3 font-mono-tabular" dir="ltr">{st.phone}</td>
                        <td className="p-3 font-semibold">{st.account_status}</td>
                        <td className="p-3 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.id, 'approved')}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'قبول' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.id, 'rejected')}
                            className="px-2.5 py-1 rounded bg-amber-600 text-white inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'رفض' : 'Reject'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(st.id, 'suspended')}
                            className="px-2.5 py-1 rounded bg-rose-600 text-white inline-flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'إيقاف' : 'Suspend'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'courses' && (
            <form
              onSubmit={handleCreateCourse}
              className="max-w-xl rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">{lang === 'ar' ? 'إنشاء كورس جديد' : 'Create Course'}</h3>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'عنوان الكورس' : 'Course Title'}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value)}
                  placeholder={lang === 'ar' ? 'التصنيف (برمجة...)' : 'Category'}
                  className="h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                  placeholder="0"
                  className="h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm font-mono-tabular"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={coursePublished}
                  onChange={(e) => setCoursePublished(e.target.checked)}
                />
                <span>{lang === 'ar' ? 'نشر الكورس للطلاب فوراً' : 'Publish immediately'}</span>
              </label>
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
                {lang === 'ar' ? 'حفظ الكورس' : 'Save Course'}
              </button>
            </form>
          )}

          {tab === 'videos' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-3">
              <h3 className="text-sm font-bold">{lang === 'ar' ? 'سجل جلسات البث المحمي' : 'Playback Security Logs'}</h3>
              <div className="space-y-2">
                {(overview?.playbackLogs || []).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs"
                  >
                    <div>
                      <span className="font-bold">{log.profiles?.full_name}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="font-mono-tabular">{log.status}</span>
                    </div>
                    {log.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => revokePlayback(log.id)}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold"
                      >
                        {lang === 'ar' ? 'إلغاء الوصول' : 'Revoke'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'wallet' && (
            <form
              onSubmit={handleWalletAdjust}
              className="max-w-xl rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">{lang === 'ar' ? 'تعديل رصيد طالب' : 'Adjust Student Wallet'}</h3>
              <input
                type="text"
                required
                value={adjStudentId}
                onChange={(e) => setAdjStudentId(e.target.value)}
                placeholder="Student UUID"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs font-mono-tabular"
              />
              <input
                type="number"
                required
                min={1}
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="Amount (EGP)"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm font-mono-tabular"
              />
              <input
                type="text"
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                placeholder={lang === 'ar' ? 'سبب الإيداع أو التعديل' : 'Reason'}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
                {lang === 'ar' ? 'اعتماد العملية' : 'Apply Adjustment'}
              </button>
            </form>
          )}

          {tab === 'content' && (
            <form
              onSubmit={handleSaveAbdullah}
              className="max-w-xl rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">{lang === 'ar' ? 'تعديل صفحة عبد الله (/abdullah)' : 'Edit /abdullah Page'}</h3>
              <input
                type="text"
                value={abdName}
                onChange={(e) => setAbdName(e.target.value)}
                placeholder="Name"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <input
                type="text"
                value={abdRole}
                onChange={(e) => setAbdRole(e.target.value)}
                placeholder="Role"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <textarea
                rows={4}
                value={abdBio}
                onChange={(e) => setAbdBio(e.target.value)}
                placeholder="Biography"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <input
                type="url"
                value={abdWebsite}
                onChange={(e) => setAbdWebsite(e.target.value)}
                placeholder="Website URL"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <input
                type="email"
                value={abdEmail}
                onChange={(e) => setAbdEmail(e.target.value)}
                placeholder="Contact Email"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
                {lang === 'ar' ? 'حفظ المحتوى' : 'Save Content'}
              </button>
            </form>
          )}

          {tab === 'media' && (
            <form
              onSubmit={handleSaveAsset}
              className="max-w-xl rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">
                {lang === 'ar' ? 'استبدال الشعار وصورة المعلم والوسائط' : 'Replace Platform Images & Logo'}
              </h3>
              <select
                value={assetKey}
                onChange={(e) => setAssetKey(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              >
                <option value="official_logo">{lang === 'ar' ? 'الشعار الرسمي (Logo)' : 'Official Logo'}</option>
                <option value="teacher_portrait">{lang === 'ar' ? 'صورة المعلم بالرئيسية' : 'Hero Teacher Portrait'}</option>
                <option value="auth_illustration">{lang === 'ar' ? 'صورة صفحة التسجيل' : 'Auth Illustration'}</option>
                <option value="abdullah_avatar">{lang === 'ar' ? 'صورة عبد الله' : 'Abdullah Portrait'}</option>
              </select>
              <input
                type="url"
                required
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                placeholder="https://.../storage/v1/object/public/..."
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
              />
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
                {lang === 'ar' ? 'تحديث الصورة' : 'Update Asset'}
              </button>
            </form>
          )}

          {tab === 'audit' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-2">
              <h3 className="text-sm font-bold mb-3">{lang === 'ar' ? 'سجل التدقيق الأمني' : 'Security Audit Logs'}</h3>
              {(overview?.auditLogs || []).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0D111D] text-xs"
                >
                  <span className="font-mono-tabular font-bold">{log.action}</span>
                  <span className="text-slate-500">
                    {log.profiles?.full_name || 'System'} · {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="max-w-xl rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
            >
              <h3 className="text-base font-bold">{lang === 'ar' ? 'إعدادات الموقع والمظهر' : 'Site & Theme Settings'}</h3>
              <div>
                <label className="block text-xs font-bold mb-1.5">{lang === 'ar' ? 'المظهر الافتراضي' : 'Default Theme'}</label>
                <select
                  value={defaultTheme}
                  onChange={(e) => setDefaultTheme(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5">Canonical Production Domain</label>
                <input
                  type="url"
                  value={canonicalDomain}
                  onChange={(e) => setCanonicalDomain(e.target.value)}
                  placeholder="https://eduverse.example.com"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
                />
              </div>
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
                {lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
              </button>
            </form>
          )}
        </div>
      )}
    </PortalLayout>
  );
};
