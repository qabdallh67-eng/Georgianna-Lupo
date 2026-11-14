import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Clock, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { formatCurrencyAmount } from '../lib/walletEngine';

export const CoursesPage: React.FC = () => {
  const { lang, t } = useApp();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [grade, setGrade] = useState('');
  const [teacher, setTeacher] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (category) params.set('category', category);
    if (grade) params.set('grade', grade);
    if (teacher) params.set('teacher', teacher);

    apiFetch<{ courses: any[] }>(`/api/courses?${params.toString()}`)
      .then((res) => {
        if (res.ok && res.data?.courses) {
          setCourses(
            res.data.courses.map((course: any) => {
              const title = course.title && typeof course.title === 'object'
                ? course.title[lang] || course.title.ar || course.title.en || ''
                : course.title || '';
              const description = course.description && typeof course.description === 'object'
                ? course.description[lang] || course.description.ar || course.description.en || ''
                : course.description || '';
              return {
                ...course,
                title,
                title_en: course.title_en || (typeof course.title === 'object' ? course.title.en : ''),
                description,
                description_en: course.description_en || (typeof course.description === 'object' ? course.description.en : ''),
                cover_image_url: course.cover_image_url || '',
                teacher_name: course.teacher_name || course.instructor_name || '',
                category: course.category || course.course_type || '',
                grade_level: course.grade_level || course.grade_key || '',
              };
            })
          );
        }
      })
      .finally(() => setLoading(false));
  }, [search, category, grade, teacher]);

  const categories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
  const grades = Array.from(new Set(courses.map((c) => c.grade_level).filter(Boolean)));
  const teachers = Array.from(new Set(courses.map((c) => c.teacher_name).filter(Boolean)));

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#0D111D]">
      <SeoHead
        titleAr="مكتبة الكورسات — EDUVERSE"
        titleEn="Course Catalog — EDUVERSE"
        descriptionAr="استكشف جميع الكورسات المنشورة على منصة EDUVERSE التعليمية."
        descriptionEn="Browse all published courses on EDUVERSE."
      />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171B2D] dark:text-white">
            {t.courses.catalogTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.courses.catalogSubtitle}</p>
        </div>

        {/* Search & Filters */}
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.courses.searchPlaceholder}
              className="w-full h-10 ps-10 pe-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs sm:text-sm focus:outline-none focus:border-[#635BFF]"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t.courses.allCategories}
              className="w-full h-10 ps-10 pe-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs sm:text-sm"
            >
              <option value="">{t.courses.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            aria-label={t.courses.allGrades}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs sm:text-sm"
          >
            <option value="">{t.courses.allGrades}</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            aria-label={t.courses.allTeachers}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs sm:text-sm"
          >
            <option value="">{t.courses.allTeachers}</option>
            {teachers.map((tc) => (
              <option key={tc} value={tc}>
                {tc}
              </option>
            ))}
          </select>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] animate-pulse"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-[#635BFF] mx-auto opacity-80" />
            <p className="text-sm font-bold">{t.courses.emptyCatalog}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.slug || c.id}`}
                className="group rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] overflow-hidden hover:border-[#635BFF] transition-all flex flex-col"
              >
                <div className="aspect-video bg-[#171B2D] relative overflow-hidden">
                  {c.cover_image_url ? (
                    <img
                      src={c.cover_image_url}
                      alt={c.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#171B2D] to-[#635BFF]/40">
                      <BookOpen className="w-10 h-10 text-white/60" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{c.category || 'EDUVERSE'}</span>
                      {c.grade_level && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{c.grade_level}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{c.teacher_name || 'EDUVERSE'}</span>
                    </div>
                    <h2 className="text-base font-bold group-hover:text-[#635BFF] transition-colors">
                      {lang === 'en' && c.title_en ? c.title_en : c.title}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {lang === 'en' && c.description_en ? c.description_en : c.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-[#252C44] flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#635BFF] tabular-nums">
                      {Number(c.price) > 0
                        ? formatCurrencyAmount(Number(c.price), c.currency || 'EGP', lang)
                        : t.courses.free}
                    </span>
                    {c.duration_minutes ? (
                      <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {c.duration_minutes} {t.exams.minutes}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
