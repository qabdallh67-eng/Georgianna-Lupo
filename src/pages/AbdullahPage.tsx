import React from 'react';
import { Globe, Mail, Phone, ExternalLink, Code2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';

export const AbdullahPage: React.FC = () => {
  const { lang, t, bootstrap, getAssetUrl } = useApp();
  const data = bootstrap?.page_content?.abdullah?.[lang] || {
    name: lang === 'ar' ? 'عبد الله' : 'Abdullah',
    role: lang === 'ar' ? 'مطور ومهندس منصة EDUVERSE' : 'EDUVERSE Developer & Architect',
    bio: t.abdullah.editHint,
    website: '',
    email: '',
    phone: '',
    social: [],
  };

  const avatar = getAssetUrl('abdullah_avatar', '/assets/eduverse-teacher-portrait.jpg');

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#0D111D]">
      <SeoHead
        titleAr={t.abdullah.pageTitle}
        titleEn={t.abdullah.pageTitle}
        descriptionAr="الصفحة التعريفية للمطور عبد الله على منصة EDUVERSE."
        descriptionEn="Creator and developer profile page for Abdullah on EDUVERSE."
      />
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] shadow-xl overflow-hidden">
          <div className="h-36 bg-gradient-to-r from-[#171B2D] via-[#635BFF] to-[#2563EB]" />
          <div className="px-6 sm:px-10 pb-10">
            <div className="-mt-16 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div className="flex items-end gap-4">
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white dark:border-[#151A2C] shadow-lg bg-[#171B2D] shrink-0">
                  <img
                    src={avatar}
                    alt={data.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171B2D] dark:text-white">
                    {data.name}
                  </h1>
                  <p className="text-sm font-semibold text-[#635BFF] flex items-center gap-1.5 mt-1">
                    <Code2 className="w-4 h-4" />
                    <span>{data.role}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {data.bio}
              </p>

              <div className="pt-6 border-t border-slate-200 dark:border-[#252C44]">
                <h2 className="text-sm font-bold text-[#171B2D] dark:text-white mb-4">
                  {t.abdullah.contactTitle}
                </h2>

                <div className="flex flex-wrap gap-3">
                  {data.website && (
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs font-semibold hover:border-[#635BFF]"
                    >
                      <Globe className="w-4 h-4 text-[#635BFF]" />
                      <span>{data.website}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {data.email && (
                    <a
                      href={`mailto:${data.email}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs font-semibold hover:border-[#635BFF]"
                    >
                      <Mail className="w-4 h-4 text-[#2563EB]" />
                      <span>{data.email}</span>
                    </a>
                  )}
                  {data.phone && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs font-mono-tabular font-semibold">
                      <Phone className="w-4 h-4 text-[#14B8A6]" />
                      <span dir="ltr">{data.phone}</span>
                    </span>
                  )}
                  {!data.website && !data.email && !data.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.abdullah.editHint}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
