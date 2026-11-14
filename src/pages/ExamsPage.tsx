import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, Clock, Award, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const ExamsPage: React.FC = () => {
  const { t } = useApp();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ exams: any[] }>('/api/exams')
      .then((res) => {
        if (res.ok && res.data?.exams) setExams(res.data.exams);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title={t.exams.title}>
      <SeoHead
        titleAr="الامتحانات — EDUVERSE"
        titleEn="Examinations — EDUVERSE"
        descriptionAr="منصة الامتحانات والتقييم على EDUVERSE."
        descriptionEn="Examinations and assessments on EDUVERSE."
        noIndex
      />

      <div className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6">
          <h2 className="text-lg font-extrabold">{t.exams.title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t.exams.subtitle}</p>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-white dark:bg-[#151A2C] animate-pulse" />
        ) : exams.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-10 text-center space-y-3">
            <FileCheck2 className="w-10 h-10 text-[#635BFF] mx-auto" />
            <p className="text-sm font-bold">{t.exams.emptyExams}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#635BFF]">{ex.courses?.title || 'EDUVERSE'}</span>
                  <h3 className="text-lg font-bold">{ex.title}</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ex.duration_minutes} {t.exams.minutes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {t.exams.passScore}: {ex.pass_score}%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t.exams.attemptsLimit}: {ex.max_attempts}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/exams/${ex.id}`}
                  className="w-full py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5249F5] text-white text-xs font-bold text-center"
                >
                  {t.exams.startExam}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};
