import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle2, FileCheck2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { getRemainingExamSeconds } from '../lib/examEngine';

export const ExamRunnerPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { lang, t, accessToken } = useApp();

  const [started, setStarted] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected_option_id?: string; text_answer?: string }>>({});
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!examId || !accessToken) return;
    setErrorMsg(null);
    const res = await apiFetch<any>(`/api/exams/${examId}/start`, {
      method: 'POST',
      token: accessToken,
    });
    if (!res.ok) {
      setErrorMsg(
        (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
          (lang === 'ar' ? 'تعذر بدء الامتحان.' : 'Unable to start exam.')
      );
      return;
    }
    setExam(res.data.exam);
    setAttempt(res.data.attempt);
    setQuestions(res.data.questions || []);
    setOptions(res.data.options || []);
    setRemainingSec(
      getRemainingExamSeconds(res.data.attempt.started_at, res.data.exam.duration_minutes)
    );
    setStarted(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!examId || !attempt?.id || !accessToken || submitting || result) return;
    setSubmitting(true);
    try {
      const formatted = Object.entries(answers).map(([question_id, val]) => ({
        question_id,
        ...val,
      }));
      const res = await apiFetch<any>(`/api/exams/${examId}/submit`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ attemptId: attempt.id, answers: formatted }),
      });
      if (res.ok) setResult(res.data);
      else setErrorMsg(res.data?.message_ar || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [examId, attempt, accessToken, answers, submitting, result]);

  useEffect(() => {
    if (!started || result) return;
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, result, handleSubmit]);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  return (
    <PortalLayout title={exam?.title || t.exams.title}>
      <SeoHead
        titleAr="أداء الامتحان — EDUVERSE"
        titleEn="Take Examination — EDUVERSE"
        descriptionAr="صفحة أداء الامتحان على EDUVERSE."
        descriptionEn="Examination runner on EDUVERSE."
        noIndex
      />

      {!accessToken ? (
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 text-center space-y-4">
          <p className="text-sm font-bold">
            {lang === 'ar' ? 'يرجى تسجيل الدخول لبدء الامتحان.' : 'Please sign in to take this exam.'}
          </p>
          <Link to="/login" className="inline-flex px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold">
            {t.nav.login}
          </Link>
        </div>
      ) : result ? (
        <div className="max-w-2xl mx-auto rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#14B8A6] mx-auto" />
          <h2 className="text-2xl font-extrabold">{lang === 'ar' ? 'تم تسليم الامتحان بنجاح' : 'Exam Submitted'}</h2>
          {result.resultsVisible ? (
            <div className="space-y-2">
              <p className="text-3xl font-extrabold text-[#635BFF] font-mono-tabular">
                {result.attempt?.score} / {result.attempt?.max_score}
              </p>
              <p className="text-sm font-semibold">
                {result.attempt?.status === 'pending_manual_grading'
                  ? lang === 'ar'
                    ? 'تحتوي الورقة على أسئلة مقالية بانتظار تصحيح المعلم.'
                    : 'Essay questions are awaiting instructor manual review.'
                  : result.attempt?.passed
                    ? lang === 'ar'
                      ? 'تهانينا! لقد اجتزت الامتحان بنجاح.'
                      : 'Congratulations! You passed.'
                    : lang === 'ar'
                      ? 'لم تصل لدرجة النجاح المطلوبة، يمكنك المحاولة مجدداً إذا سمح عدد المحاولات.'
                      : 'Score below passing threshold.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{result.summary?.message_ar}</p>
          )}
          <Link to="/exams" className="inline-flex px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
            {t.common.back}
          </Link>
        </div>
      ) : !started ? (
        <div className="max-w-2xl mx-auto rounded-3xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{t.exams.importantRules}</h2>
              <p className="text-xs text-slate-500">{t.exams.subtitle}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
            {t.exams.rulesList.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleStart}
            className="w-full h-12 rounded-xl bg-[#635BFF] hover:bg-[#5249F5] text-white font-bold text-sm"
          >
            {t.exams.startExam}
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Countdown Sticky Bar */}
          <div className="sticky top-20 z-20 rounded-2xl bg-[#171B2D] text-white px-5 py-3 flex items-center justify-between shadow-lg">
            <span className="text-xs font-bold">{t.exams.timeRemaining}</span>
            <span
              className={`font-mono-tabular text-base font-extrabold flex items-center gap-1.5 ${
                remainingSec < 120 ? 'text-rose-400' : 'text-[#14B8A6]'
              }`}
            >
              <Clock className="w-4 h-4" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>

          {/* Questions List */}
          <div className="space-y-5">
            {questions.map((q, idx) => {
              const qOptions = options.filter((o) => o.question_id === q.id);
              const val = answers[q.id] || {};
              return (
                <div
                  key={q.id}
                  className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-bold">
                      {idx + 1}. {q.prompt}
                    </h3>
                    <span className="text-xs font-mono-tabular text-[#635BFF] font-bold shrink-0">
                      {q.points} pts
                    </span>
                  </div>

                  {q.image_url && (
                    <img
                      src={q.image_url}
                      alt="Question visual"
                      referrerPolicy="no-referrer"
                      className="max-h-64 rounded-xl border border-slate-200 dark:border-[#252C44]"
                    />
                  )}

                  {(q.question_type === 'mcq' || q.question_type === 'true_false') && (
                    <div className="space-y-2">
                      {qOptions.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                            val.selected_option_id === opt.id
                              ? 'border-[#635BFF] bg-[#635BFF]/10'
                              : 'border-slate-200 dark:border-[#252C44] hover:border-[#635BFF]/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={val.selected_option_id === opt.id}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: { selected_option_id: opt.id },
                              }))
                            }
                            className="accent-[#635BFF]"
                          />
                          <span className="text-sm">{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(q.question_type === 'short_answer' || q.question_type === 'essay') && (
                    <textarea
                      rows={q.question_type === 'essay' ? 5 : 2}
                      value={val.text_answer || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { text_answer: e.target.value },
                        }))
                      }
                      placeholder={lang === 'ar' ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                      className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#2563EB] text-white font-bold text-sm"
          >
            {submitting ? t.common.loading : t.exams.submitExam}
          </button>
        </div>
      )}
    </PortalLayout>
  );
};
