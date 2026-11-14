import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Heart } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { lang, t, bootstrap } = useApp();
  const socialLinks = bootstrap?.social_links || [];
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#171B2D] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="space-y-3">
            <Link to="/" className="inline-block">
              <BrandLogo size="md" />
            </Link>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              {lang === 'ar'
                ? bootstrap?.site_settings?.site_tagline_ar || t.tagline
                : bootstrap?.site_settings?.site_tagline_en || t.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-start md:justify-center gap-5 text-sm font-semibold">
            <Link to="/" className="hover:text-white transition-colors">
              {t.nav.home}
            </Link>
            <Link to="/courses" className="hover:text-white transition-colors">
              {t.nav.courses}
            </Link>
            <Link to="/forum" className="hover:text-white transition-colors">
              {t.nav.forum}
            </Link>
            <a
              href="https://www.facebook.com/share/1dMmrhFZks/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#14B8A6] hover:text-teal-300 transition-colors"
            >
              <span>{t.nav.heroes}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-start md:justify-end gap-3">
            {socialLinks.map((soc) => (
              <a
                key={soc.id}
                href={soc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:border-[#635BFF] hover:text-white transition-colors"
              >
                {lang === 'ar' ? soc.label_ar : soc.label_en}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="tabular-nums">
            © {year} {bootstrap?.site_settings?.site_name || 'EDUVERSE'}. {t.footer.rights}.
          </p>
          <p className="flex items-center gap-1.5">
            <span>{t.footer.developedBy}</span>
            <Heart className="w-3.5 h-3.5 text-[#635BFF] fill-[#635BFF]" />
            <Link
              to="/abdullah"
              className="font-bold text-white hover:text-[#14B8A6] underline underline-offset-4 transition-colors"
            >
              {t.footer.abdullahName}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};
