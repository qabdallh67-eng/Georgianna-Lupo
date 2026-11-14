import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PlayCircle,
  Lock,
  Bookmark,
  MessageSquare,
  FileText,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { EduverseVideoPlayer } from '../components/EduverseVideoPlayer';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const LessonPlayerPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { lang, t, accessToken } = useApp();

  const [courseData, setCourseData] = useState<any>(null);
  const [authStream, setAuthStream] = useState<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'details' | 'materials'>('notes');
  const [notes, setNotes] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState('');

  const authorizePlayback = useCallback(async () => {
    if (!courseId || !lessonId || !accessToken) return;
    setStreamError(null);
    const res = await apiFetch<any>('/api/video/authorize', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ courseId, lectureId: lessonId }),
    });
    if (!res.ok) {
      setStreamError(
        (lang === 'ar' ? res.data?.message_ar : res.data?.message_en) ||
          (lang === 'ar' ? 'غير مصرح بمشاهدة هذا الفيديو.' : 'Unauthorized video playback.')
      );
      setAuthStream(null);
    } else {
      setAuthStream(res.data);
    }
  }, [courseId, lessonId, accessToken, lang]);

  useEffect(() => {
    if (!courseId) return;
    apiFetch<any>(`/api/courses/${courseId}`, { token: accessToken }).then((res) => {
      if (res.ok) setCourseData(res.data);
    });
  }, [courseId, accessToken]);

  useEffect(() => {
    authorizePlayback();
    if (lessonId && accessToken) {
      apiFetch<{ notes: any[] }>(`/api/lessons/${lessonId}/notes`, { token: accessToken }).then((res) => {
        if (res.ok && res.data?.notes) setNotes(res.data.notes);
      });
    }
  }, [authorizePlayback, lessonId, accessToken]);

  const handleSaveProgress = useCallback(
    async (positionSeconds: number, durationSeconds: number, isCompleted = false) => {
      if (!accessToken || !courseId || !lessonId) return;
      await apiFetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ courseId, positionSeconds, durationSeconds, isCompleted }),
      });
    },
    [accessToken, courseId, lessonId]
  );

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !lessonId || !accessToken) return;
    const res = await apiFetch<{ note: any }>(`/api/lessons/${lessonId}/notes`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ content: noteInput.trim(), isBookmarked: true }),
    });
    if (res.ok && res.data?.note) {
      setNotes((prev) => [res.data.note, ...prev]);
      setNoteInput('');
    }
  };

  const lectures = courseData?.lectures || [];
  const currentIndex = lectures.findIndex((l: any) => l.id === lessonId);
  const currentLecture = lectures[currentIndex];
  const prevLecture = currentIndex > 0 ? lectures[currentIndex - 1] : null;
  const nextLecture = currentIndex >= 0 && currentIndex < lectures.length - 1 ? lectures[currentIndex + 1] : null;
  const progressPercent = courseData?.progressPercent || 0;

  return (
    <PortalLayout title={currentLecture?.title || courseData?.course?.title || t.player.playlist}>
      <SeoHead
        titleAr={currentLecture ? `${currentLecture.title} — EDUVERSE` : 'مشاهدة الدرس — EDUVERSE'}
        titleEn={currentLecture ? `${currentLecture.title} — EDUVERSE` : 'Watch Lesson — EDUVERSE'}
        descriptionAr="مشغل فيديو EDUVERSE المحمي."
        descriptionEn="Protected EDUVERSE lesson player."
        noIndex
      />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Main Video Player Column */}
        <div className="lg:col-span-8 space-y-5">
          {!accessToken ? (
            <div className="rounded-2xl bg-[#171B2D] text-white p-10 text-center space-y-4">
              <ShieldAlert className="w-10 h-10 text-[#14B8A6] mx-auto" />
              <p className="text-sm font-bold">
                {lang === 'ar'
                  ? 'يرجى تسجيل الدخول للتحقق من اشتراكك وتشغيل الدرس المحمي.'
                  : 'Please sign in to verify enrollment and stream this protected lesson.'}
              </p>
              <Link to="/login" className="inline-flex px-5 py-2.5 rounded-xl bg-[#635BFF] text-sm font-bold">
                {t.nav.login}
              </Link>
            </div>
          ) : streamError ? (
            <div className="rounded-2xl bg-[#171B2D] text-white p-10 text-center space-y-3 border border-rose-500/30">
              <Lock className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-bold">{streamError}</p>
              <Link
                to={`/courses/${courseId}`}
                className="inline-flex px-4 py-2 rounded-xl bg-[#635BFF] text-xs font-bold"
              >
                {t.common.back}
              </Link>
            </div>
          ) : authStream ? (
            <EduverseVideoPlayer
              streamUrl={authStream.streamUrl}
              title={authStream.title || currentLecture?.title || ''}
              initialPositionSeconds={authStream.resumePositionSeconds || 0}
              availableQualities={authStream.availableQualities}
              captions={authStream.captions}
              watermark={authStream.watermark}
              drmConfig={authStream.drm}
              onProgressSave={handleSaveProgress}
              onStreamExpired={authorizePlayback}
            />
          ) : (
            <div className="aspect-video rounded-2xl bg-[#0A0E1C] flex items-center justify-center text-white text-sm">
              {t.player.loadingStream}
            </div>
          )}

          {/* Security Notice */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.player.securityNotice}</p>

          {/* Lesson Tabs: Notes, Details, Materials */}
          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-4">
            <div className="flex gap-2 border-b border-slate-200 dark:border-[#252C44] pb-3">
              {[
                { id: 'notes', label: t.player.notesTab, icon: Bookmark },
                { id: 'details', label: t.player.qaTab, icon: MessageSquare },
                { id: 'materials', label: t.player.materialsTab, icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold ${
                      activeTab === tab.id
                        ? 'bg-[#635BFF] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={3}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder={t.player.notePlaceholder}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm focus:outline-none focus:border-[#635BFF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-bold"
                  >
                    {t.player.saveNote}
                  </button>
                </form>

                <div className="space-y-2">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#0D111D] border border-slate-200 dark:border-[#252C44] text-xs"
                    >
                      <p>{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {currentLecture?.description || courseData?.course?.description}
              </p>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-2">
                {(courseData?.materials || []).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs"
                  >
                    <span className="font-semibold">{m.title}</span>
                    <span className="text-slate-500">{m.material_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Playlist & Progress Ring Column */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-4">
            <h3 className="text-sm font-bold">{t.player.playlist}</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {lectures.map((lec: any, idx: number) => {
                const isActive = lec.id === lessonId;
                return (
                  <Link
                    key={lec.id}
                    to={lec.locked ? `/courses/${courseId}` : `/learn/${courseId}/${lec.id}`}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#635BFF] text-white'
                        : 'bg-slate-50 dark:bg-[#0D111D] hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {lec.locked ? (
                        <Lock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      ) : (
                        <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">
                        {idx + 1}. {lec.title}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{t.player.courseProgress}</p>
              <p className="text-2xl font-extrabold text-[#14B8A6] tabular-nums">{progressPercent}%</p>
            </div>
            <div className="flex gap-2">
              {prevLecture && !prevLecture.locked && (
                <Link
                  to={`/learn/${courseId}/${prevLecture.id}`}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#252C44] text-xs font-bold inline-flex items-center gap-1"
                >
                  {lang === 'ar' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{t.player.previousLesson}</span>
                </Link>
              )}
              {nextLecture && !nextLecture.locked && (
                <Link
                  to={`/learn/${courseId}/${nextLecture.id}`}
                  className="px-3 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <span>{t.player.nextLesson}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};
