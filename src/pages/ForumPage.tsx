import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Plus, Search, Flag, Send, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const ForumPage: React.FC = () => {
  const { lang, t, accessToken } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCatId, setNewCatId] = useState('');

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState('');
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadPosts = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (search.trim()) params.set('q', search.trim());
    apiFetch<{ categories: any[]; posts: any[] }>(`/api/forum/posts?${params.toString()}`).then((res) => {
      if (res.ok && res.data) {
        setCategories(res.data.categories || []);
        setPosts(res.data.posts || []);
      }
    });
  }, [selectedCategory, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const res = await apiFetch<{ post: any; message_ar?: string }>('/api/forum/posts', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ title: newTitle, body: newBody, categoryId: newCatId || null }),
    });
    if (res.ok) {
      setShowNewModal(false);
      setNewTitle('');
      setNewBody('');
      loadPosts();
    } else {
      setStatusMsg(res.data?.message_ar || 'Failed to publish post');
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    const res = await apiFetch<{ comments: any[] }>(`/api/forum/posts/${postId}/comments`);
    if (res.ok) {
      setCommentsByPost((prev) => ({ ...prev, [postId]: res.data.comments || [] }));
    }
  };

  const handleReply = async (postId: string) => {
    if (!accessToken || !replyText.trim()) return;
    const res = await apiFetch<{ comment: any }>(`/api/forum/posts/${postId}/comments`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ body: replyText.trim() }),
    });
    if (res.ok && res.data?.comment) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data.comment],
      }));
      setReplyText('');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !reportTargetId || !reportReason.trim()) return;
    const res = await apiFetch<{ message_ar?: string }>('/api/forum/report', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ postId: reportTargetId, reason: reportReason }),
    });
    if (res.ok) {
      setStatusMsg(res.data?.message_ar || 'Reported');
      setReportTargetId(null);
      setReportReason('');
    }
  };

  return (
    <PortalLayout title={t.forum.title}>
      <SeoHead
        titleAr="المنتدى التعليمي — EDUVERSE"
        titleEn="Student Forum — EDUVERSE"
        descriptionAr="منتدى النقاش التعليمي للطلاب على منصة EDUVERSE."
        descriptionEn="EDUVERSE student discussion forum."
      />

      <div className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold">{t.forum.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500">{t.forum.subtitle}</p>
          </div>
          {accessToken && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs sm:text-sm font-bold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.forum.newPost}</span>
            </button>
          )}
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
            {statusMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-4 space-y-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold ${
                  selectedCategory === '' ? 'bg-[#635BFF] text-white' : 'hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                }`}
              >
                {t.forum.allCategories}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold ${
                    selectedCategory === cat.slug
                      ? 'bg-[#635BFF] text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1E243B]'
                  }`}
                >
                  {lang === 'ar' ? cat.name_ar : cat.name_en}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Feed */}
          <div className="lg:col-span-9 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.forum.searchPlaceholder}
                className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-[#252C44] bg-white dark:bg-[#151A2C] text-sm focus:outline-none focus:border-[#635BFF]"
              />
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-10 text-center space-y-2">
                <MessageSquare className="w-9 h-9 text-[#635BFF] mx-auto opacity-80" />
                <p className="text-sm font-bold">{t.forum.emptyPosts}</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#171B2D] dark:text-white">
                          {post.profiles?.full_name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(post.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </div>
                      <h3 className="text-base font-bold mt-1">{post.title}</h3>
                    </div>

                    {accessToken && (
                      <button
                        type="button"
                        onClick={() => setReportTargetId(post.id)}
                        aria-label={t.forum.report}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{post.body}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#252C44]">
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="text-xs font-bold text-[#635BFF] hover:underline"
                    >
                      {t.forum.replies}
                    </button>
                  </div>

                  {expandedPostId === post.id && (
                    <div className="pt-3 space-y-3 border-t border-slate-100 dark:border-[#252C44]">
                      {(commentsByPost[post.id] || []).map((c) => (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0D111D] text-xs space-y-1">
                          <span className="font-bold">{c.profiles?.full_name}</span>
                          <p className="text-slate-600 dark:text-slate-300">{c.body}</p>
                        </div>
                      ))}

                      {accessToken && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t.forum.writeReply}
                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleReply(post.id)}
                            className="px-4 rounded-xl bg-[#635BFF] text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{t.forum.sendReply}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePost}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#151A2C] p-6 space-y-4 border border-slate-200 dark:border-[#252C44]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">{t.forum.newPost}</h3>
              <button type="button" onClick={() => setShowNewModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {categories.length > 0 && (
              <select
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-xs"
              >
                <option value="">{t.forum.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t.forum.postTitle}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
            />
            <textarea
              rows={4}
              required
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={t.forum.postBody}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
            />
            <button type="submit" className="w-full h-11 rounded-xl bg-[#635BFF] text-white text-sm font-bold">
              {t.forum.publishPost}
            </button>
          </form>
        </div>
      )}

      {/* Report Modal */}
      {reportTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleReport}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151A2C] p-6 space-y-4 border border-slate-200 dark:border-[#252C44]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">{t.forum.report}</h3>
              <button type="button" onClick={() => setReportTargetId(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              rows={3}
              required
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t.forum.reportReason}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#252C44] bg-slate-50 dark:bg-[#0D111D] text-sm"
            />
            <button type="submit" className="w-full h-10 rounded-xl bg-rose-600 text-white text-xs font-bold">
              {t.common.confirm}
            </button>
          </form>
        </div>
      )}
    </PortalLayout>
  );
};
