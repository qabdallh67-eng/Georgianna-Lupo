import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';

export const NotificationsPage: React.FC = () => {
  const { lang, t, accessToken, setUnreadNotifications } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    apiFetch<{ notifications: any[] }>('/api/student/dashboard', { token: accessToken })
      .then((res) => {
        if (res.ok && res.data?.notifications) {
          setNotifications(res.data.notifications);
          setUnreadNotifications(res.data.notifications.filter((n) => !n.is_read).length);
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken, setUnreadNotifications]);

  const markRead = async (id: string) => {
    if (!accessToken) return;
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST', token: accessToken });
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      setUnreadNotifications(next.filter((n) => !n.is_read).length);
      return next;
    });
  };

  return (
    <PortalLayout title={t.nav.notifications}>
      <SeoHead
        titleAr="الإشعارات — EDUVERSE"
        titleEn="Notifications — EDUVERSE"
        descriptionAr="مركز الإشعارات والتنبيهات."
        descriptionEn="Student notifications center."
        noIndex
      />

      <div className="max-w-3xl space-y-4">
        {loading ? (
          <div className="h-32 rounded-2xl bg-white dark:bg-[#151A2C] animate-pulse" />
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-10 text-center space-y-2">
            <Bell className="w-9 h-9 text-[#635BFF] mx-auto" />
            <p className="text-sm font-bold">
              {lang === 'ar' ? 'لا توجد إشعارات جديدة حالياً.' : 'No notifications right now.'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-5 flex items-start justify-between gap-4 ${
                n.is_read
                  ? 'bg-white dark:bg-[#151A2C] border-slate-200 dark:border-[#252C44]'
                  : 'bg-[#635BFF]/5 border-[#635BFF]/30'
              }`}
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold">{n.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
              </div>
              {!n.is_read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تمت القراءة' : 'Mark Read'}</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </PortalLayout>
  );
};
