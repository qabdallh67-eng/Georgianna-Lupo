import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  PlayCircle,
  UserPlus,
  BookOpen,
  GraduationCap,
  Code2,
  Laptop,
  Users,
  Video,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from './BrandLogo';

export const HeroSection: React.FC = () => {
  const { lang, t, bootstrap, getAssetUrl, profile } = useApp();
  const shouldReduceMotion = useReducedMotion();

  const teacherPortrait = getAssetUrl('teacher_portrait', '/assets/eduverse-teacher-portrait.jpg');
  const heroCopy = bootstrap?.page_content?.hero?.[lang] || t.hero;
  const stats = bootstrap?.stats;

  return (
    <section className="relative overflow-hidden bg-[#171B2D] text-white pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Background atmospheric lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(99, 91, 255, 0.25), transparent 45%), radial-gradient(circle at 80% 30%, rgba(37, 99, 235, 0.28), transparent 45%), radial-gradient(circle at 50% 85%, rgba(20, 184, 166, 0.16), transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Arabic/English Welcome Column */}
          <div className="lg:col-span-5 text-center lg:text-start space-y-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-teal-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{heroCopy.badge || t.hero.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight text-balance">
              {heroCopy.heading || t.hero.heading}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {heroCopy.subheading || t.hero.subheading}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] hover:brightness-110 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#635BFF]/30 transition-all whitespace-nowrap"
              >
                <PlayCircle className="w-5 h-5" />
                <span>{heroCopy.primaryCta || t.hero.primaryCta}</span>
              </Link>

              {profile ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm sm:text-base transition-all whitespace-nowrap"
                >
                  <span>{t.nav.dashboard}</span>
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm sm:text-base transition-all whitespace-nowrap"
                >
                  <UserPlus className="w-5 h-5 text-[#14B8A6]" />
                  <span>{heroCopy.secondaryCta || t.hero.createAccountCta}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Centerpiece Teacher Portrait + Independently Animated Coding/Edu Elements */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] sm:min-h-[460px] order-1 lg:order-2">
            {/* Holographic orbital rings (animated independently, teacher stays static!) */}
            <div
              aria-hidden="true"
              className="absolute w-[310px] h-[310px] sm:w-[400px] sm:h-[400px] rounded-full border border-[#635BFF]/40 animate-orbit-slow"
            >
              <span className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-[#14B8A6] shadow-[0_0_12px_#14B8A6]" />
              <span className="absolute -bottom-1.5 left-1/2 w-2.5 h-2.5 rounded-full bg-[#635BFF] shadow-[0_0_12px_#635BFF]" />
            </div>
            <div
              aria-hidden="true"
              className="absolute w-[250px] h-[250px] sm:w-[330px] sm:h-[330px] rounded-full border border-[#2563EB]/40"
            />

            {/* Floating Code Panel (Top Left) */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden sm:block absolute top-0 left-0 lg:left-2 z-20 rounded-2xl bg-[#0F1426]/95 border border-[#2563EB]/40 backdrop-blur-md p-3 shadow-xl text-left"
              dir="ltr"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <pre className="font-mono-tabular text-[11px] leading-relaxed text-sky-200">
                <code>{`const learn = () => {\n  return Excellence();\n};`}</code>
              </pre>
            </motion.div>

            {/* Floating Graduation Cap (Top Right) */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, 8, 0], rotate: [0, 4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-2 right-4 sm:right-10 z-20 p-3 rounded-2xl bg-[#635BFF]/20 border border-[#635BFF]/50 backdrop-blur-md shadow-lg"
            >
              <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
            </motion.div>

            {/* Floating HTML </> Tile */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              className="absolute top-36 sm:top-40 left-1 sm:left-6 z-20 px-3 py-2 rounded-xl bg-gradient-to-br from-[#635BFF] to-[#2563EB] shadow-lg shadow-[#635BFF]/40 flex items-center gap-1.5 font-mono-tabular text-xs font-bold"
              dir="ltr"
            >
              <Code2 className="w-4 h-4" />
              <span>&lt;HTML/&gt;</span>
            </motion.div>

            {/* Floating JS/CSS/React Tech Tile (Right Side) */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, 9, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              className="hidden sm:flex absolute top-36 right-2 sm:right-6 z-20 px-3 py-2 rounded-xl bg-[#1E253E]/95 border border-[#635BFF]/50 text-xs font-mono-tabular font-semibold text-indigo-200 items-center gap-1.5 shadow-lg"
              dir="ltr"
            >
              <span className="text-[#14B8A6]">⚛</span>
              <span>React · CSS3</span>
            </motion.div>

            {/* Floating Language Stack (Python / JS / React / CSS / C++) */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, 9, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="absolute bottom-6 left-1 sm:left-4 z-20 space-y-1.5"
              dir="ltr"
            >
              <div className="px-3 py-1.5 rounded-xl bg-[#1E253E]/95 border border-amber-400/40 text-xs font-mono-tabular font-semibold text-amber-300 flex items-center gap-2 shadow-md">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Python · JS</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#1E253E]/95 border border-cyan-400/40 text-xs font-mono-tabular font-semibold text-cyan-300 flex items-center gap-2 shadow-md">
                <span>C++ · Algorithms</span>
              </div>
            </motion.div>

            {/* Floating EDUVERSE Laptop Card (Bottom Right) */}
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="hidden sm:flex absolute bottom-8 right-2 sm:right-6 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#111629]/95 border border-[#14B8A6]/40 backdrop-blur-md shadow-xl"
            >
              <Laptop className="w-5 h-5 text-[#14B8A6]" />
              <BrandLogo size="sm" className="h-6" />
            </motion.div>

            {/* Static Centered Teacher Portrait (Zero face distortion or warping) */}
            <div className="relative z-10 w-[230px] sm:w-[290px] aspect-[7/8] rounded-3xl overflow-hidden border-2 border-[#635BFF]/60 shadow-[0_20px_60px_rgba(37,99,235,0.35)] bg-[#111629]">
              <img
                src={teacherPortrait}
                alt={lang === 'ar' ? 'صورة المعلم في منصة EDUVERSE' : 'EDUVERSE Lead Instructor'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#171B2D] via-[#171B2D]/40 to-transparent"
              />
            </div>
          </div>
        </div>

        {/* Real Database Platform Statistics (Displayed strictly when live DB data exists) */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-6 py-5">
          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[#14B8A6]">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">
                    {stats.approvedStudents}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-300">{t.hero.statsStudents}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[#635BFF]">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">
                    {stats.publishedCourses}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-300">{t.hero.statsCourses}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[#2563EB]">
                  <Video className="w-5 h-5" />
                  <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">
                    {stats.totalLectures}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-300">{t.hero.statsLectures}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center text-xs sm:text-sm font-semibold text-slate-200">
              <span>{lang === 'ar' ? 'بث فيديو محمي بعلامة مائية' : 'Protected Watermarked Streaming'}</span>
              <span>{lang === 'ar' ? 'امتحانات ذكية بمؤقت دقيق' : 'Timed Smart Examinations'}</span>
              <span>{lang === 'ar' ? 'محفظة إلكترونية بعملة EGP' : 'Verified EGP Student Wallet'}</span>
              <span>{lang === 'ar' ? 'منتدى طلابي وإشعارات فورية' : 'Student Forum & Notifications'}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
