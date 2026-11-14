import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PlayCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  FileCheck2,
  CheckCircle2,
  Clock,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { formatCurrencyAmount } from '../lib/walletEngine';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lang, t, accessToken } = useApp();
  const navigate = useNavigate();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'about' | 'materials' | 'exams'>('curriculum');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  const loadCourse = () => {
    if (!id) return;
    setLoading(true);
    apiFetch<any>(`/api/courses/${id}`, { token: accessToken })
      .then((res) => {
        if (res.ok && res.data?.course) {
          setDetails(res.data);
          const firstSec = res.data.sections?.[0]?.id;
          if (firstSec) setOpenSections({ [firstSec]: true });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken]);

  const handleEnroll = async () => {
    if (!accessToken) {
      navigate('/login');
      return;
    }
    if (!details?.course?.id) return;
    setEnrolling(true);
    setEnrollMsg(null);
    try {
      const res = await apiFetch<{ message_ar?: string; message_en?: string }>(
        `/api/courses/${details.course.id}/enroll`,
        { method: 'POST', token: accessToken }
      );
      setEnrollMsg(
        (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
          (res.ok ? 'Enrolled' : 'Failed')
      );
      if (res.ok) loadCourse();
    } finally {
      setEnrolling(false);
    }
  };

  const course = details?.course;
  const sections = details?.sections || [];
  const parts = details?.parts || [];
  const lectures = details?.lectures || [];
  const materials = details?.materials || [];
  const exams = details?.exams || [];
  const firstPlayable = lectures.find((l: any) => !l.locked) || lectures[0];

  return (
    <PortalLayout title={course ? course.title : t.courses.catalogTitle}>
      <SeoHead
        titleAr={course ? `${course.title} — EDUVERSE` : 'تفاصيل الكورس — EDUVERSE'}
        titleEn={course ? `${course.title_en || course.title} — EDUVERSE` : 'Course Details — EDUVERSE'}
        descriptionAr={course?.description || 'تفاصيل المنهج والدروس في منصة EDUVERSE.'}
        descriptionEn={course?.description_en || 'Structured syllabus and lessons on EDUVERSE.'}
      />

      {loading ? (
        <div className="h-64 rounded-2xl bg-white dark:bg-[#151A2C] animate-pulse" />
      ) : !course ? (
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-[#635BFF] mx-auto" />
          <p className="text-sm font-bold">{lang === 'ar' ? 'الكورس غير متاح.' : 'Course not found.'}</p>
          <Link to="/courses" className="inline-flex px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
            {t.courses.catalogTitle}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Header Card */}
          <div className="rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] overflow-hidden grid lg:grid-cols-12">
            <div className="lg:col-span-5 aspect-video lg:aspect-auto bg-[#171B2D] relative">
              {course.cover_image_url ? (
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[220px] flex items-center justify-center bg-gradient-to-br from-[#171B2D] to-[#635BFF]">
                  <BookOpen className="w-14 h-14 text-white/60" />
                </div>
              )}
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{course.category || 'EDUVERSE'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{course.teacher_name || 'EDUVERSE'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {sections.length} {lang === 'ar' ? 'أقسام' : 'sections'} · {lectures.length}{' '}
                    {lang === 'ar' ? 'محاضرة' : 'lectures'}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#171B2D] dark:text-white">
                  {lang === 'en' && course.title_en ? course.title_en : course.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'en' && course.description_en ? course.description_en : course.description}
                </p>
              </div>

              <div className="space-y-4">
                {details.isEnrolled && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{t.player.courseProgress}</span>
                      <span className="tabular-nums text-[#635BFF]">{details.progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-[#252C44] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#635BFF] to-[#14B8A6]"
                        style={{ width: `${details.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {enrollMsg && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{enrollMsg}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {details.isEnrolled && firstPlayable ? (
                    <Link
                      to={`/learn/${course.id}/${firstPlayable.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#635BFF] hover:bg-[#5249F5] text-white text-sm font-bold"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{t.courses.continueLearning}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] text-white text-sm font-bold"
                    >
                      <span>
                        {enrolling
                          ? t.common.loading
                          : Number(course.price) > 0
                            ? `${t.courses.enrollNow} (${formatCurrencyAmount(Number(course.price), course.currency || 'EGP', lang)})`
                            : t.courses.enrollNow}
                      </span>
                    </button>
                  )}

                  {course.duration_minutes ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                      <Clock className="w-4 h-4" />
                      {course.duration_minutes} {t.exams.minutes}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] w-fit">
            {[
              { id: 'curriculum', label: t.courses.curriculum },
              { id: 'about', label: t.courses.aboutCourse },
              { id: 'materials', label: t.courses.materials },
              { id: 'exams', label: t.courses.examsTab },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#635BFF] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content: Syllabus Hierarchy */}
          {activeTab === 'curriculum' && (
            <div className="space-y-4">
              {sections.length === 0 && lectures.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 text-center text-sm text-slate-500">
                  {lang === 'ar' ? 'لم تُضف دروس لهذا الكورس بعد.' : 'No syllabus lessons published yet.'}
                </div>
              ) : (
                (sections.length > 0 ? sections : [{ id: 'default', title: t.courses.curriculum }]).map(
                  (sec: any) => {
                    const secParts = parts.filter((p: any) => p.section_id === sec.id);
                    const secLectures = lectures.filter(
                      (l: any) => l.section_id === sec.id || (!l.section_id && sec.id === 'default')
                    );
                    const isOpen = openSections[sec.id] ?? true;

                    return (
                      <div
                        key={sec.id}
                        className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenSections((prev) => ({ ...prev, [sec.id]: !isOpen }))}
                          className="w-full px-6 py-4 flex items-center justify-between text-start font-bold text-sm hover:bg-slate-50 dark:hover:bg-[#1E243B]"
                        >
                          <span>{sec.title}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isOpen && (
                          <div className="px-6 pb-5 space-y-4 border-t border-slate-100 dark:border-[#252C44] pt-4">
                            {secParts.map((part: any) => {
                              const partLectures = secLectures.filter((l: any) => l.part_id === part.id);
                              return (
                                <div key={part.id} className="space-y-2">
                                  <h4 className="text-xs font-bold text-[#635BFF]">{part.title}</h4>
                                  <div className="space-y-2">
                                    {partLectures.map((lec: any) => (
                                      <LectureRow key={lec.id} courseId={course.id} lec={lec} t={t} />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {secLectures
                              .filter((l: any) => !l.part_id)
                              .map((lec: any) => (
                                <LectureRow key={lec.id} courseId={course.id} lec={lec} t={t} />
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4">
              <h3 className="text-base font-bold">{t.courses.aboutCourse}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{course.description}</p>
              {Array.isArray(course.objectives) && course.objectives.length > 0 && (
                <ul className="space-y-2 pt-2">
                  {course.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-3">
              {materials.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {details.isEnrolled
                    ? lang === 'ar'
                      ? 'لا توجد مرفقات مضافة لهذا الكورس.'
                      : 'No learning materials attached yet.'
                    : t.courses.lockedLesson}
                </p>
              ) : (
                materials.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#252C44]"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="w-4 h-4 text-[#635BFF]" />
                      <span>{m.title}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {m.is_downloadable
                        ? lang === 'ar'
                          ? 'مسموح بالتحميل'
                          : 'Downloadable'
                        : lang === 'ar'
                          ? 'عرض داخل المنصة فقط'
                          : 'View-only'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-3">
              {exams.length === 0 ? (
                <p className="text-sm text-slate-500">{t.exams.emptyExams}</p>
              ) : (
                exams.map((ex: any) => (
                  <Link
                    key={ex.id}
                    to={`/exams/${ex.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF]"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <FileCheck2 className="w-4 h-4 text-[#635BFF]" />
                      <span>{ex.title}</span>
                    </span>
                    <span className="text-xs font-bold text-[#635BFF]">{t.exams.startExam}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
};

const LectureRow: React.FC<{ courseId: string; lec: any; t: any }> = ({ courseId, lec, t }) => {
  if (lec.locked) {
    return (
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D111D] border border-slate-200/80 dark:border-[#252C44] opacity-80">
        <div className="flex items-center gap-3 min-w-0">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold truncate">{lec.title}</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">{t.courses.lockedLesson}</span>
      </div>
    );
  }

  return (
    <Link
      to={`/learn/${courseId}/${lec.id}`}
      className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] hover:border-[#635BFF] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <PlayCircle className="w-4 h-4 text-[#635BFF] shrink-0" />
        <span className="text-xs sm:text-sm font-semibold truncate">{lec.title}</span>
      </div>
      <span className="px-3 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-bold shrink-0">
        {t.courses.watchLesson}
      </span>
    </Link>
  );
};
