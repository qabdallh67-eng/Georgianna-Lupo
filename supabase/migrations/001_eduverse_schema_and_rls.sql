-- ============================================================================
-- EDUVERSE Non-Destructive Schema & RLS Verification Migration
-- Target Supabase Project: suldaiuxaxremmfxodak
-- Safe to run against existing database: uses IF NOT EXISTS & preserves data.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (Students, Instructors, Moderators, Authorized Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  guardian_phone TEXT,
  email TEXT,
  avatar_url TEXT,
  grade_level TEXT,
  group_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'moderator', 'admin', 'super_admin')),
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended')),
  bio TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  preferred_theme TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Site & Theme Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'EDUVERSE',
  site_tagline_ar TEXT NOT NULL DEFAULT 'تعلم بذكاء • برمج • تفوّق',
  site_tagline_en TEXT NOT NULL DEFAULT 'Learn • Code • Achieve',
  canonical_domain TEXT,
  default_language TEXT NOT NULL DEFAULT 'ar',
  default_currency TEXT NOT NULL DEFAULT 'EGP',
  require_student_approval BOOLEAN NOT NULL DEFAULT TRUE,
  watermark_enabled_default BOOLEAN NOT NULL DEFAULT TRUE,
  contact_email TEXT,
  contact_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.theme_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_theme TEXT NOT NULL DEFAULT 'system' CHECK (default_theme IN ('light', 'dark', 'system')),
  primary_navy TEXT NOT NULL DEFAULT '#171B2D',
  primary_purple TEXT NOT NULL DEFAULT '#635BFF',
  electric_blue TEXT NOT NULL DEFAULT '#2563EB',
  teal_accent TEXT NOT NULL DEFAULT '#14B8A6',
  light_background TEXT NOT NULL DEFAULT '#F6F7FB',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CMS Page Content, Media Assets, Navigation, Social Links
CREATE TABLE IF NOT EXISTS public.page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_key, section_key, locale)
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  storage_bucket TEXT NOT NULL DEFAULT 'public-media',
  storage_path TEXT,
  url TEXT NOT NULL,
  mime_type TEXT,
  alt_text_ar TEXT,
  alt_text_en TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  href TEXT NOT NULL,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT NOT NULL DEFAULT 'header',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Courses Hierarchy: Courses -> Sections -> Parts -> Lectures -> Video Lessons / Materials
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url TEXT,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teacher_name TEXT,
  category TEXT,
  grade_level TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  duration_minutes INTEGER DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_min_progress INTEGER NOT NULL DEFAULT 80,
  certificate_min_exam_score INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'enrollment',
  allowed_grades JSONB DEFAULT '[]'::jsonb,
  allowed_groups JSONB DEFAULT '[]'::jsonb,
  requires_payment BOOLEAN NOT NULL DEFAULT TRUE,
  max_concurrent_streams INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.course_parts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'supabase_signed',
  storage_bucket TEXT DEFAULT 'private-videos',
  storage_path TEXT,
  hls_manifest_path TEXT,
  available_qualities JSONB NOT NULL DEFAULT '["auto","360p","480p","720p","1080p"]'::jsonb,
  captions JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  drm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT NOT NULL,
  is_downloadable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, lecture_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_code TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

-- 5. Examinations System (Answers isolated from public questions)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 60,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  randomize_questions BOOLEAN NOT NULL DEFAULT TRUE,
  randomize_options BOOLEAN NOT NULL DEFAULT TRUE,
  results_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'short_answer', 'essay')),
  prompt TEXT NOT NULL,
  image_url TEXT,
  attachment_url TEXT,
  points NUMERIC(6,2) NOT NULL DEFAULT 1,
  correct_text_answer TEXT,
  explanation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'pending_manual_grading', 'graded')),
  score NUMERIC(8,2) DEFAULT 0,
  max_score NUMERIC(8,2) DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
  text_answer TEXT,
  is_correct BOOLEAN,
  awarded_points NUMERIC(6,2) DEFAULT 0,
  grader_feedback TEXT,
  UNIQUE (attempt_id, question_id)
);

-- 6. Wallet & Immutable Ledger
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('deposit', 'payment', 'refund', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_code TEXT UNIQUE NOT NULL,
  provider TEXT,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Forum & Community
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications, Admin RBAC, Audit Logs & Video Playback Security Logs
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'system',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.admin_permissions(permission_key) ON DELETE CASCADE,
  UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_playback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  session_token_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized', 'revoked', 'concurrent_blocked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, account_status);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published, is_featured);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_student ON public.wallet_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_logs_student ON public.video_playback_logs(student_id, created_at DESC);

-- ============================================================================
-- Enable Row Level Security (RLS) on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_playback_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check authorized admin securely without recursion
CREATE OR REPLACE FUNCTION public.is_eduverse_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND account_status = 'approved'
  );
$$;

-- Strict Policies (Idempotent creation via DO blocks)
DO $$ BEGIN
  -- Profiles: Users read/update own safe fields; Admins manage all. Never public!
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own_or_admin') THEN
    CREATE POLICY profiles_select_own_or_admin ON public.profiles
      FOR SELECT USING (auth.uid() = id OR public.is_eduverse_admin());
  END IF;

  -- Public CMS read policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='site_settings_public_read') THEN
    CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='theme_settings' AND policyname='theme_settings_public_read') THEN
    CREATE POLICY theme_settings_public_read ON public.theme_settings FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='page_content' AND policyname='page_content_public_read') THEN
    CREATE POLICY page_content_public_read ON public.page_content FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='media_assets' AND policyname='media_assets_public_read') THEN
    CREATE POLICY media_assets_public_read ON public.media_assets FOR SELECT USING (is_private = FALSE OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='navigation_items' AND policyname='navigation_public_read') THEN
    CREATE POLICY navigation_public_read ON public.navigation_items FOR SELECT USING (is_visible = TRUE OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='social_links' AND policyname='social_links_public_read') THEN
    CREATE POLICY social_links_public_read ON public.social_links FOR SELECT USING (is_visible = TRUE OR public.is_eduverse_admin());
  END IF;

  -- Courses: only published courses visible publicly
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='courses' AND policyname='courses_public_published') THEN
    CREATE POLICY courses_public_published ON public.courses FOR SELECT USING (is_published = TRUE OR public.is_eduverse_admin());
  END IF;

  -- Enrollments, progress, wallets, notifications, attempts: strictly owner or admin (NO direct client wallet writes!)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enrollments' AND policyname='enrollments_own_read') THEN
    CREATE POLICY enrollments_own_read ON public.enrollments FOR SELECT USING (auth.uid() = student_id OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lesson_progress' AND policyname='lesson_progress_own') THEN
    CREATE POLICY lesson_progress_own ON public.lesson_progress FOR ALL USING (auth.uid() = student_id OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallets' AND policyname='wallets_own_read_only') THEN
    CREATE POLICY wallets_own_read_only ON public.wallets FOR SELECT USING (auth.uid() = student_id OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='wallet_tx_own_read_only') THEN
    CREATE POLICY wallet_tx_own_read_only ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_own_read') THEN
    CREATE POLICY notifications_own_read ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_attempts' AND policyname='exam_attempts_own_read') THEN
    CREATE POLICY exam_attempts_own_read ON public.exam_attempts FOR SELECT USING (auth.uid() = student_id OR public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_answers' AND policyname='exam_answers_own_read') THEN
    CREATE POLICY exam_answers_own_read ON public.exam_answers FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = attempt_id AND ea.student_id = auth.uid())
      OR public.is_eduverse_admin()
    );
  END IF;
  -- Protected video_lessons & question_options (answer keys) are NEVER directly readable by anon/students without server/enrollment check
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_lessons' AND policyname='video_lessons_admin_only') THEN
    CREATE POLICY video_lessons_admin_only ON public.video_lessons FOR SELECT USING (public.is_eduverse_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_logs_admin_only') THEN
    CREATE POLICY audit_logs_admin_only ON public.audit_logs FOR SELECT USING (public.is_eduverse_admin());
  END IF;
END $$;
