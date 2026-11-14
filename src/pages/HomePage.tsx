import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Layers,
  PlaySquare,
  ShieldCheck,
  FileCheck2,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { formatCurrencyAmount } from '../lib/walletEngine';

const FEATURE_ICONS = [Award, Layers, PlaySquare, ShieldCheck, FileCheck2];

export const HomePage: React.FC = () => {
  const { lang, t, bootstrap } = useApp();
  const featuredCourses = (bootstrap?.featured_courses || []).map((course: any) => ({
    ...course,
    title: course.title && typeof course.title === 'object'
      ? course.title[lang] || course.title.ar || course.title.en || ''
      : course.title || '',
    title_en: course.title_en || (typeof course.title === 'object' ? course.title.en : ''),
    description: course.description && typeof course.description === 'object'
      ? course.description[lang] || course.description.ar || course.description.en || ''
      : course.description || '',
    description_en: course.description_en || (typeof course.description === 'object' ? course.description.en : ''),
    cover_image_url: course.cover_image_url || '',
    teacher_name: course.teacher_name || course.instructor_name || '',
    category: course.category || course.course_type || '',
    duration_minutes: course.duration_minutes || null,
  }));
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#0D111D]">
      <SeoHead
        titleAr="EDUVERSE — منصة التعليم الإلكتروني والبرمجة المتكاملة"
        titleEn="EDUVERSE — Integrated E-Learning & Programming Platform"
        descriptionAr="منصة EDUVERSE التعليمية: كورسات منظمة، بث فيديو محمي، امتحانات ذكية، محفظة إلكترونية، ومنتدى طلابي."
        descriptionEn="EDUVERSE educational platform: structured courses, protected video streaming, smart exams, student wallet, and community forum."
      />
      <Navbar />

      <main className="flex-1">
        <HeroSection />

        {/* Platform Advantages */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171B2D] dark:text-white text-balance">
              {t.features.sectionTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t.features.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {t.features.items.map((item, idx) => {
              const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
              return (
                <div
                  key={item.title}
                  className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 hover:border-[#635BFF] transition-colors flex flex-col gap-3"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#171B2D] dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured Published Courses from Real Database */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-[#171B2D] dark:text-white">
                {lang === 'ar' ? 'الكورسات المتاحة على المنصة' : 'Available Platform Courses'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'كورسات منشورة مباشرة من قاعدة بيانات EDUVERSE'
                  : 'Published directly from the live EDUVERSE database'}
              </p>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#635BFF] hover:underline whitespace-nowrap"
            >
              <span>{t.common.viewAll}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>

          {featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug || course.id}`}
                  className="group rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] overflow-hidden hover:border-[#635BFF] transition-all flex flex-col"
                >
                  <div className="aspect-video bg-slate-900 relative overflow-hidden">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#171B2D] via-[#2563EB]/40 to-[#635BFF]/40 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-white/60" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{course.category || (lang === 'ar' ? 'تعليمي' : 'Course')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{course.teacher_name || 'EDUVERSE'}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#171B2D] dark:text-white group-hover:text-[#635BFF] transition-colors">
                        {lang === 'en' && course.title_en ? course.title_en : course.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {lang === 'en' && course.description_en
                          ? course.description_en
                          : course.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#252C44] flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#635BFF] tabular-nums">
                        {Number(course.price) > 0
                          ? formatCurrencyAmount(Number(course.price), course.currency || 'EGP', lang)
                          : t.courses.free}
                      </span>
                      {course.duration_minutes ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {course.duration_minutes} {t.exams.minutes}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-10 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-[#635BFF] mx-auto opacity-80" />
              <p className="text-sm font-semibold text-[#171B2D] dark:text-white">
                {t.courses.emptyCatalog}
              </p>
              {bootstrap && !bootstrap.dbConnected && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  {t.common.dbNoticeBody}
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};
