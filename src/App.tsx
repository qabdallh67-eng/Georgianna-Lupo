import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { HomePage } from './pages/HomePage';

const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const StudentDashboardPage = lazy(() =>
  import('./pages/StudentDashboardPage').then((m) => ({ default: m.StudentDashboardPage }))
);
const CoursesPage = lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() =>
  import('./pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))
);
const LessonPlayerPage = lazy(() =>
  import('./pages/LessonPlayerPage').then((m) => ({ default: m.LessonPlayerPage }))
);
const ExamsPage = lazy(() => import('./pages/ExamsPage').then((m) => ({ default: m.ExamsPage })));
const ExamRunnerPage = lazy(() =>
  import('./pages/ExamRunnerPage').then((m) => ({ default: m.ExamRunnerPage }))
);
const WalletPage = lazy(() => import('./pages/WalletPage').then((m) => ({ default: m.WalletPage })));
const ForumPage = lazy(() => import('./pages/ForumPage').then((m) => ({ default: m.ForumPage })));
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AbdullahPage = lazy(() => import('./pages/AbdullahPage').then((m) => ({ default: m.AbdullahPage })));
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB] dark:bg-[#0D111D]">
    <div className="w-10 h-10 rounded-full border-4 border-[#635BFF]/30 border-t-[#635BFF] animate-spin" />
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7FB] dark:bg-[#0D111D] p-6 text-center space-y-4">
    <h1 className="text-4xl font-extrabold text-[#635BFF]">404</h1>
    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
      الصفحة المطلوبة غير موجودة / Page not found
    </p>
    <Link to="/" className="px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold">
      العودة للرئيسية / Back Home
    </Link>
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/dashboard" element={<StudentDashboardPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/learn/:courseId/:lessonId" element={<LessonPlayerPage />} />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/exams/:examId" element={<ExamRunnerPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/abdullah" element={<AbdullahPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
