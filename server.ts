import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  getSupabaseAdmin,
  createSupabaseAnonClient,
  getSupabaseConfigStatus,
  authenticateRequest,
  requireAuthorizedAdmin,
  writeAuditLog,
} from './server/supabaseAdmin';
import { signPlaybackToken, verifyPlaybackToken } from './server/securityToken';
import {
  normalizePhone,
  validateRegistrationInput,
  sanitizeStudentProfilePatch,
} from './src/lib/validation';
import {
  stripAnswerKeysForStudent,
  gradeExamSubmission,
  shuffleWithSeed,
} from './src/lib/examEngine';
import { buildWatermarkPayload, calculateCourseCompletion } from './src/lib/securityEngine';

const PORT = Number(process.env.PORT) || 3000;
const VIDEO_TOKEN_SECRET =
  process.env.VIDEO_TOKEN_SECRET ||
  crypto.createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY || 'eduverse-ephemeral-dev-key').digest('hex');

const DEFAULT_BOOTSTRAP = {
  site_settings: {
    site_name: 'EDUVERSE',
    site_tagline_ar: 'تعلم بذكاء • برمج • تفوّق',
    site_tagline_en: 'Learn • Code • Achieve',
    canonical_domain: process.env.APP_URL || '',
    default_language: 'ar',
    default_currency: 'EGP',
    require_student_approval: true,
    watermark_enabled_default: true,
    contact_email: '',
    contact_phone: '',
  },
  theme_settings: {
    default_theme: 'system',
    primary_navy: '#171B2D',
    primary_purple: '#635BFF',
    electric_blue: '#2563EB',
    teal_accent: '#14B8A6',
    light_background: '#F6F7FB',
  },
  media_assets: [
    {
      asset_key: 'official_logo',
      title: 'Official EDUVERSE Logo',
      url: '/assets/eduverse-logo.png',
      alt_text_ar: 'الشعار الرسمي لمنصة EDUVERSE',
      alt_text_en: 'Official EDUVERSE Logo',
    },
    {
      asset_key: 'teacher_portrait',
      title: 'Hero Teacher Portrait',
      url: '/assets/eduverse-teacher-portrait.jpg',
      alt_text_ar: 'صورة المعلم في منصة EDUVERSE',
      alt_text_en: 'EDUVERSE Lead Instructor Portrait',
    },
    {
      asset_key: 'auth_illustration',
      title: 'Student Registration & Login Artwork',
      url: '/assets/eduverse-student-art.jpg',
      alt_text_ar: 'رسم توضيحي للطلاب في منصة EDUVERSE',
      alt_text_en: 'EDUVERSE Student Learning Artwork',
    },
    {
      asset_key: 'abdullah_avatar',
      title: 'Abdullah Profile Portrait',
      url: '/assets/eduverse-teacher-portrait.jpg',
      alt_text_ar: 'صورة عبد الله',
      alt_text_en: 'Abdullah Profile Picture',
    },
  ],
  navigation_items: [
    { id: 'nav-home', label_ar: 'الرئيسية', label_en: 'Home', href: '/', is_external: false, location: 'header', sort_order: 1 },
    { id: 'nav-courses', label_ar: 'الكورسات', label_en: 'Courses', href: '/courses', is_external: false, location: 'header', sort_order: 2 },
    { id: 'nav-forum', label_ar: 'المنتدى', label_en: 'Forum', href: '/forum', is_external: false, location: 'header', sort_order: 3 },
    { id: 'nav-exams', label_ar: 'الامتحانات', label_en: 'Exams', href: '/exams', is_external: false, location: 'header', sort_order: 4 },
    { id: 'nav-wallet', label_ar: 'المحفظة', label_en: 'Wallet', href: '/wallet', is_external: false, location: 'header', sort_order: 5 },
    {
      id: 'nav-heroes',
      label_ar: 'أبطال',
      label_en: 'Heroes',
      href: 'https://www.facebook.com/share/1dMmrhFZks/',
      is_external: true,
      location: 'header',
      sort_order: 6,
    },
  ],
  social_links: [
    { id: 'soc-fb', platform: 'facebook', label_ar: 'فيسبوك', label_en: 'Facebook', url: 'https://www.facebook.com/share/1dMmrhFZks/', sort_order: 1 },
  ],
  page_content: {
    hero: {
      ar: {
        badge: 'منصة تعليمية متطورة',
        heading: 'مرحباً بك في EDUVERSE',
        subheading: 'منصتك التعليمية الشاملة .. تعلم بذكاء، حقق أهدافك، واصنع مستقبلك في عالم البرمجة والمعرفة',
        primaryCta: 'استكشف الكورسات',
        secondaryCta: 'إنشاء حساب طالب',
      },
      en: {
        badge: 'Advanced Learning Ecosystem',
        heading: 'Welcome to EDUVERSE',
        subheading: 'Your comprehensive educational platform — learn smartly, master coding, and build your future with structured courses and secure assessments.',
        primaryCta: 'Explore Courses',
        secondaryCta: 'Create Student Account',
      },
    },
    abdullah: {
      ar: {
        name: 'عبد الله',
        role: 'مطور ومهندس منصة EDUVERSE',
        bio: 'يمكن تعديل السيرة الذاتية وروابط التواصل الخاصة بـ عبد الله مباشرة من لوحة التحكم الإدارية.',
        website: '',
        email: '',
        phone: '',
        social: [],
      },
      en: {
        name: 'Abdullah',
        role: 'EDUVERSE Creator & Platform Architect',
        bio: 'Biography, social links, and contact details for Abdullah can be customized directly from the Admin Dashboard.',
        website: '',
        email: '',
        phone: '',
        social: [],
      },
    },
  },
};

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(express.json({ limit: '5mb' }));

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message_ar: 'محاولات كثيرة متتالية، يرجى الانتظار دقيقة واحدة.',
      message_en: 'Too many requests, please wait a minute.',
    },
  });

  const sensitiveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // --------------------------------------------------------------------------
  // 1. Health & Public Bootstrap
  // --------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    const supa = getSupabaseConfigStatus();
    res.json({
      ok: true,
      supabase: {
        url: supa.url,
        configured: supa.configured,
        missingVariables: supa.missingVariables,
      },
      videoProvider: process.env.VIDEO_PROVIDER || 'supabase_signed',
      drmConfigured: Boolean(
        process.env.DRM_WIDEVINE_LICENSE_URL ||
          process.env.DRM_FAIRPLAY_LICENSE_URL ||
          process.env.DRM_PLAYREADY_LICENSE_URL
      ),
      smsProviderConfigured: Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY),
      paymentProviderConfigured: Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_WEBHOOK_SECRET),
    });
  });

  app.get('/api/public/bootstrap', async (_req, res) => {
    const admin = getSupabaseAdmin();
    const configStatus = getSupabaseConfigStatus();

    if (!admin) {
      return res.json({
        dbConnected: false,
        missingVariables: configStatus.missingVariables,
        ...DEFAULT_BOOTSTRAP,
        featured_courses: [],
        stats: null,
      });
    }

    try {
      const [
        siteRes,
        themeRes,
        mediaRes,
        navRes,
        socialRes,
        contentRes,
        coursesRes,
        studentsCountRes,
        coursesCountRes,
        lessonsCountRes,
      ] = await Promise.all([
        admin.from('site_settings').select('*').eq('id', true).maybeSingle(),
        admin.from('theme_settings').select('*').eq('id', true).maybeSingle(),
        admin.from('media_assets').select('*').eq('is_private', false),
        admin.from('navigation_items').select('*').eq('is_visible', true).order('sort_order'),
        admin.from('social_links').select('*').eq('is_visible', true).order('sort_order'),
        admin.from('page_content').select('*'),
        admin
          .from('courses')
          .select('id, slug, title, description, cover_asset_id, instructor_name, course_type, grade_key, price, currency, is_published')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6),
        admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('account_status', 'approved'),
        admin.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        admin.from('lectures').select('id', { count: 'exact', head: true }),
      ]);

      const pageContentMap: Record<string, Record<string, unknown>> = {
        hero: { ...DEFAULT_BOOTSTRAP.page_content.hero },
        abdullah: { ...DEFAULT_BOOTSTRAP.page_content.abdullah },
      };

      for (const row of contentRes.data || []) {
        if (!pageContentMap[row.page_key]) pageContentMap[row.page_key] = {};
        pageContentMap[row.page_key][row.locale] = row.content;
      }

      const dbMedia = mediaRes.data || [];
      const mergedMedia = [...DEFAULT_BOOTSTRAP.media_assets];
      for (const item of dbMedia) {
        const idx = mergedMedia.findIndex((m) => m.asset_key === item.asset_key);
        if (idx >= 0) mergedMedia[idx] = item;
        else mergedMedia.push(item);
      }

      res.json({
        dbConnected: true,
        missingVariables: [],
        site_settings: siteRes.data || DEFAULT_BOOTSTRAP.site_settings,
        theme_settings: themeRes.data || DEFAULT_BOOTSTRAP.theme_settings,
        media_assets: mergedMedia,
        navigation_items: (navRes.data && navRes.data.length > 0) ? navRes.data : DEFAULT_BOOTSTRAP.navigation_items,
        social_links: (socialRes.data && socialRes.data.length > 0) ? socialRes.data : DEFAULT_BOOTSTRAP.social_links,
        page_content: pageContentMap,
        featured_courses: coursesRes.data || [],
        stats: {
          approvedStudents: studentsCountRes.count ?? 0,
          publishedCourses: coursesCountRes.count ?? 0,
          totalLectures: lessonsCountRes.count ?? 0,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: 'BOOTSTRAP_ERROR',
        message_ar: 'تعذر تحميل إعدادات المنصة من قاعدة البيانات.',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // --------------------------------------------------------------------------
  // 2. Student-Only Authentication & Recovery (Zero Public Admin Signup)
  // --------------------------------------------------------------------------
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';
    const validation = validateRegistrationInput(
      {
        fullName: req.body?.fullName || '',
        phone: req.body?.phone || '',
        guardianPhone: req.body?.guardianPhone || '',
        email: req.body?.email || '',
        password: req.body?.password || '',
        confirmPassword: req.body?.confirmPassword || '',
        acceptedTerms: Boolean(req.body?.acceptedTerms),
      },
      locale
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: validation.errors,
        message_ar: Object.values(validation.errors)[0],
        message_en: Object.values(validation.errors)[0],
      });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(503).json({
        error: 'SUPABASE_NOT_CONFIGURED',
        message_ar: 'يرجى استكمال مفاتيح Supabase في إعدادات البيئة لتفعيل التسجيل الفعلي.',
        message_en: 'Supabase service credentials are required to complete registration.',
        missing: getSupabaseConfigStatus().missingVariables,
      });
    }

    try {
      // Check duplicates by normalized phone or email
      const { data: existingPhone } = await admin
        .from('profiles')
        .select('id')
        .eq('phone', validation.normalizedPhone)
        .maybeSingle();

      if (existingPhone) {
        return res.status(409).json({
          error: 'DUPLICATE_PHONE',
          message_ar: 'رقم الهاتف الشخصي مسجل بالفعل في المنصة.',
          message_en: 'This personal phone number is already registered.',
        });
      }

      const { data: existingEmail } = await admin
        .from('profiles')
        .select('id')
        .eq('email', validation.normalizedEmail)
        .maybeSingle();

      if (existingEmail) {
        return res.status(409).json({
          error: 'DUPLICATE_EMAIL',
          message_ar: 'البريد الإلكتروني مسجل بالفعل.',
          message_en: 'This email address is already registered.',
        });
      }

      const { data: settings } = await admin
        .from('site_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle();

      const requireApproval = settings?.settings?.require_student_approval ?? true;
      const initialStatus = requireApproval ? 'pending' : 'approved';

      // Create user in Supabase Auth (always strictly student role)
      const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
        email: validation.normalizedEmail,
        password: req.body.password,
        email_confirm: true,
        user_metadata: {
          full_name: req.body.fullName.trim(),
          phone: validation.normalizedPhone,
          role: 'student',
        },
      });

      if (authErr || !createdAuth.user) {
        return res.status(400).json({
          error: 'AUTH_CREATE_FAILED',
          message_ar: 'تعذر إنشاء الحساب. قد يكون البريد الإلكتروني مستخدماً بالفعل.',
          message_en: authErr?.message || 'Unable to create student account.',
        });
      }

      const userId = createdAuth.user.id;
      const { error: profileErr } = await admin.from('profiles').insert({
        id: userId,
        full_name: req.body.fullName.trim(),
        phone: validation.normalizedPhone,
        guardian_phone: validation.normalizedGuardianPhone,
        email: validation.normalizedEmail,
        grade_key: req.body.gradeLevel || null,
        role: 'student',
        account_status: initialStatus,
        preferred_language: locale,
      });

      if (profileErr) {
        await admin.auth.admin.deleteUser(userId);
        return res.status(500).json({
          error: 'PROFILE_CREATE_FAILED',
          message_ar: 'حدث خطأ أثناء حفظ بيانات الطالب.',
          message_en: profileErr.message,
        });
      }

      // Initialize zero-balance student wallet
      await admin.from('wallets').upsert({
        student_id: userId,
        currency: settings?.settings?.default_currency || 'EGP',
      });

      await writeAuditLog({
        actorId: userId,
        action: 'student_registered',
        targetTable: 'profiles',
        targetId: userId,
        metadata: { status: initialStatus },
        ipAddress: req.ip,
      });

      return res.status(201).json({
        ok: true,
        accountStatus: initialStatus,
        message_ar:
          initialStatus === 'pending'
            ? 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة والموافقة من الإدارة.'
            : 'تم إنشاء حسابك وتفعيله بنجاح! يمكنك تسجيل الدخول الآن.',
        message_en:
          initialStatus === 'pending'
            ? 'Your account has been created and is pending administrator approval.'
            : 'Your student account is ready. You may log in now.',
      });
    } catch (err) {
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message_ar: 'حدث خطأ غير متوقع أثناء التسجيل.',
        message_en: err instanceof Error ? err.message : 'Unexpected registration error.',
      });
    }
  });

  app.post('/api/auth/phone-login', authLimiter, async (req, res) => {
    const rawIdentifier = String(req.body?.identifier || req.body?.phone || '').trim();
    const password = String(req.body?.password || '');

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message_ar: 'يرجى إدخال رقم الهاتف وكلمة المرور.',
        message_en: 'Please enter your phone number and password.',
      });
    }

    const admin = getSupabaseAdmin();
    const anonClient = createSupabaseAnonClient();
    if (!admin || !anonClient) {
      return res.status(503).json({
        error: 'SUPABASE_NOT_CONFIGURED',
        message_ar: 'مفاتيح Supabase غير مهيأة على الخادم بعد.',
        message_en: 'Supabase credentials are not configured yet.',
        missing: getSupabaseConfigStatus().missingVariables,
      });
    }

    try {
      const normalized = rawIdentifier.includes('@')
        ? rawIdentifier.toLowerCase()
        : normalizePhone(rawIdentifier);

      const query = admin.from('profiles').select('*');
      const { data: profile } = rawIdentifier.includes('@')
        ? await query.eq('email', normalized).maybeSingle()
        : await query.eq('phone', normalized).maybeSingle();

      if (!profile || !profile.email) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة.',
          message_en: 'Invalid phone number or password.',
        });
      }

      const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (signInErr || !signInData.session) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة.',
          message_en: 'Invalid phone number or password.',
        });
      }

      if (profile.account_status === 'pending') {
        return res.status(403).json({
          error: 'ACCOUNT_PENDING',
          message_ar: 'حسابك قيد المراجعة حالياً بانتظار موافقة الإدارة. سيتم إشعارك فور التفعيل.',
          message_en: 'Your account is pending administrator approval.',
        });
      }

      if (profile.account_status === 'rejected' || profile.account_status === 'suspended') {
        return res.status(403).json({
          error: 'ACCOUNT_SUSPENDED',
          message_ar: 'تم إيقاف هذا الحساب أو تعليقه. يرجى التواصل مع إدارة المنصة.',
          message_en: 'This account has been suspended or rejected.',
        });
      }

      return res.json({
        ok: true,
        session: signInData.session,
        profile,
      });
    } catch (err) {
      return res.status(500).json({
        error: 'LOGIN_FAILED',
        message_ar: 'تعذر تسجيل الدخول حالياً.',
        message_en: err instanceof Error ? err.message : 'Login failed.',
      });
    }
  });

  app.post('/api/auth/recover', authLimiter, async (req, res) => {
    const channel = req.body?.channel === 'sms' ? 'sms' : 'email';
    if (channel === 'sms' && (!process.env.SMS_PROVIDER || !process.env.SMS_API_KEY)) {
      return res.status(501).json({
        error: 'SMS_NOT_CONFIGURED',
        message_ar: 'استعادة كلمة المرور عبر الرسائل النصية SMS غير مفعلة لعدم ربط مزود SMS. يرجى استخدام البريد الإلكتروني.',
        message_en: 'SMS recovery is not enabled because no SMS provider is configured. Please use email recovery.',
      });
    }

    const admin = getSupabaseAdmin();
    const anon = createSupabaseAnonClient();
    if (!admin || !anon) {
      return res.status(503).json({
        error: 'SUPABASE_NOT_CONFIGURED',
        message_ar: 'خدمة استعادة كلمة المرور تتطلب تهيئة مفاتيح Supabase.',
        message_en: 'Supabase configuration required for password recovery.',
      });
    }

    const identifier = String(req.body?.identifier || '').trim();
    if (!identifier) {
      return res.status(400).json({
        error: 'MISSING_IDENTIFIER',
        message_ar: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل.',
        message_en: 'Please provide your registered email or phone.',
      });
    }

    let emailToReset = identifier.includes('@') ? identifier.toLowerCase() : '';
    if (!emailToReset) {
      const norm = normalizePhone(identifier);
      const { data: prof } = await admin.from('profiles').select('email').eq('phone', norm).maybeSingle();
      emailToReset = prof?.email || '';
    }

    if (emailToReset) {
      const redirectTo = `${process.env.APP_URL || ''}/login`;
      await anon.auth.resetPasswordForEmail(emailToReset, { redirectTo });
    }

    // Always return non-enumerating confirmation message
    return res.json({
      ok: true,
      message_ar: 'إذا كان الحساب مسجلاً لدينا، فقد تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.',
      message_en: 'If an account matches those details, a password recovery link has been sent to the registered email.',
    });
  });

  // --------------------------------------------------------------------------
  // 3. Courses Catalog & Hierarchy
  // --------------------------------------------------------------------------
  app.get('/api/courses', async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.json({ dbConnected: false, courses: [] });
    }

    const search = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const grade = String(req.query.grade || '').trim();
    const teacher = String(req.query.teacher || '').trim();

    let query = admin
      .from('courses')
      .select('id, slug, title, description, cover_asset_id, instructor_name, course_type, grade_key, price, currency, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('course_type', category);
    if (grade) query = query.eq('grade_key', grade);
    if (teacher) query = query.eq('instructor_name', teacher);
    if (search) query = query.or(`title.ilike.%${search}%,instructor_name.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'COURSES_FETCH_FAILED', message_en: error.message });
    }

    return res.json({ dbConnected: true, courses: data || [] });
  });

  app.get('/api/courses/:idOrSlug', async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(404).json({ error: 'NOT_FOUND', message_ar: 'الكورس غير موجود.' });
    }

    const idOrSlug = req.params.idOrSlug;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const { data: course } = await admin
      .from('courses')
      .select('*')
      .eq(isUuid ? 'id' : 'slug', idOrSlug)
      .maybeSingle();

    if (!course || !course.is_published) {
      return res.status(404).json({
        error: 'COURSE_NOT_FOUND',
        message_ar: 'الكورس غير متاح أو غير منشور.',
        message_en: 'Course not found.',
      });
    }

    // Optional auth check to reveal enrollment and progress
    let studentId: string | null = null;
    let isEnrolled = false;
    let isFavorite = false;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: u } = await admin.auth.getUser(token);
      if (u.user) {
        studentId = u.user.id;
        const { data: enr } = await admin
          .from('enrollments')
          .select('id, status, is_favorite')
          .eq('student_id', studentId)
          .eq('course_id', course.id)
          .maybeSingle();
        isEnrolled = enr?.status === 'active';
        isFavorite = Boolean(enr?.is_favorite);
      }
    }

    const [sectionsRes, partsRes, lecturesRes, materialsRes, examsRes, progressRes] = await Promise.all([
      admin.from('course_sections').select('*').eq('course_id', course.id).order('sort_order'),
      admin
        .from('course_parts')
        .select('*, course_sections!inner(course_id)')
        .eq('course_sections.course_id', course.id)
        .order('sort_order'),
      admin.from('lectures').select('*').eq('course_id', course.id).order('sort_order'),
      admin.from('course_materials').select('id, lecture_id, title, material_type, is_downloadable, created_at').eq('course_id', course.id),
      admin.from('exams').select('id, title, duration_minutes, pass_score, max_attempts, is_published').eq('course_id', course.id).eq('is_published', true),
      studentId
        ? admin.from('lesson_progress').select('*').eq('student_id', studentId).eq('course_id', course.id)
        : Promise.resolve({ data: [] }),
    ]);

    const lectures = (lecturesRes.data || []).map((l) => ({
      ...l,
      locked: !isEnrolled && !l.is_free_preview,
    }));

    const progressRows = progressRes.data || [];
    const completedCount = progressRows.filter((p) => p.is_completed).length;
    const { progressPercent } = calculateCourseCompletion({
      totalLessons: lectures.length,
      completedLessons: completedCount,
    });

    return res.json({
      course,
      isEnrolled,
      isFavorite,
      progressPercent,
      sections: sectionsRes.data || [],
      parts: partsRes.data || [],
      lectures,
      materials: isEnrolled ? (materialsRes.data || []) : [],
      exams: examsRes.data || [],
      progress: progressRows,
    });
  });

  app.post('/api/courses/:id/enroll', sensitiveLimiter, async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    if (auth.profile.account_status !== 'approved') {
      return res.status(403).json({
        error: 'ACCOUNT_NOT_APPROVED',
        message_ar: 'حسابك لم يتم تفعيله بعد للاشتراك في الكورسات.',
      });
    }

    const admin = getSupabaseAdmin()!;
    const courseId = req.params.id;
    const { data: course } = await admin.from('courses').select('*').eq('id', courseId).eq('is_published', true).maybeSingle();
    if (!course) {
      return res.status(404).json({ error: 'COURSE_NOT_FOUND', message_ar: 'الكورس غير موجود.' });
    }

    const { data: existing } = await admin
      .from('enrollments')
      .select('*')
      .eq('student_id', auth.userId)
      .eq('course_id', course.id)
      .maybeSingle();

    if (existing?.status === 'active') {
      return res.json({ ok: true, enrollment: existing, message_ar: 'أنت مشترك بالفعل في هذا الكورس.' });
    }

    const price = Number(course.price) || 0;
    if (price > 0) {
      const { data: wallet } = await admin.from('wallets').select('*').eq('student_id', auth.userId).maybeSingle();
      if (!wallet || Number(wallet.available_balance) < price) {
        return res.status(402).json({
          error: 'INSUFFICIENT_WALLET_BALANCE',
          message_ar: 'رصيد محفظتك غير كافٍ للاشتراك في هذا الكورس. يرجى شحن المحفظة أولاً.',
        });
      }

      const refCode = `CRS-${course.id.slice(0, 6)}-${auth.userId.slice(0, 6)}-${Date.now()}`;
      const nextCurrent = Math.round((Number(wallet.current_balance) - price) * 100) / 100;
      const nextAvail = Math.round((Number(wallet.available_balance) - price) * 100) / 100;

      await admin.from('wallets').update({ current_balance: nextCurrent, available_balance: nextAvail, updated_at: new Date().toISOString() }).eq('id', wallet.id);
      await admin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        student_id: auth.userId,
        tx_type: 'payment',
        amount: price,
        currency: course.currency || 'EGP',
        status: 'completed',
        reference_code: refCode,
        description: `الاشتراك في كورس: ${course.title}`,
      });
    }

    const { data: enrollment, error: enrErr } = await admin
      .from('enrollments')
      .upsert({ student_id: auth.userId, course_id: course.id, status: 'active' }, { onConflict: 'student_id,course_id' })
      .select()
      .single();

    if (enrErr) {
      return res.status(500).json({ error: 'ENROLL_FAILED', message_en: enrErr.message });
    }

    await admin.from('notifications').insert({
      user_id: auth.userId,
      title: 'تم تفعيل اشتراكك بنجاح',
      body: `أصبح بإمكانك الآن مشاهدة جميع دروس كورس: ${course.title}`,
      notification_type: 'course',
      link_url: `/courses/${course.id}`,
    });

    return res.json({ ok: true, enrollment, message_ar: 'تم الاشتراك في الكورس بنجاح!' });
  });

  // --------------------------------------------------------------------------
  // 4. Protected EDUVERSE Video Delivery & Signed Short-Lived Playback
  // --------------------------------------------------------------------------
  app.post('/api/video/authorize', sensitiveLimiter, async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const admin = getSupabaseAdmin()!;
    const lectureId = String(req.body?.lectureId || '');
    const courseId = String(req.body?.courseId || '');

    if (!lectureId || !courseId) {
      return res.status(400).json({ error: 'MISSING_IDS', message_ar: 'بيانات الدرس غير مكتملة.' });
    }

    // Server-side verification of lecture & course ownership (never trust client courseId blindly)
    const { data: lecture } = await admin
      .from('lectures')
      .select('id, course_id, title, is_free_preview')
      .eq('id', lectureId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!lecture) {
      return res.status(404).json({ error: 'LECTURE_NOT_FOUND', message_ar: 'الدرس غير موجود.' });
    }

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id, status')
      .eq('student_id', auth.userId)
      .eq('course_id', lecture.course_id)
      .maybeSingle();

    const isAdmin = ['admin', 'super_admin'].includes(auth.profile.role) && auth.profile.account_status === 'approved';
    const isAuthorized = isAdmin || lecture.is_free_preview || (enrollment?.status === 'active' && auth.profile.account_status === 'approved');

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message_ar: 'يجب الاشتراك في الكورس وتفعيل حسابك لمشاهدة هذا الدرس.',
        message_en: 'Active enrollment is required to watch this protected lesson.',
      });
    }

    const { data: video } = await admin
      .from('video_lessons')
      .select('*')
      .eq('lecture_id', lecture.id)
      .maybeSingle();

    if (!video) {
      return res.status(404).json({ error: 'VIDEO_NOT_FOUND', message_ar: 'لم يتم ربط فيديو بهذا الدرس بعد.' });
    }

    const sessionTokenId = crypto.randomUUID();
    const { token, expiresAt } = signPlaybackToken(
      {
        sessionId: sessionTokenId,
        studentId: auth.userId,
        courseId: lecture.course_id,
        videoId: video.id,
      },
      VIDEO_TOKEN_SECRET,
      180 // 3 minutes short-lived URL token
    );

    await admin.from('video_playback_logs').insert({
      student_id: auth.userId,
      course_id: lecture.course_id,
      video_id: video.id,
      session_token_id: sessionTokenId,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      status: 'authorized',
    });

    const watermark = video.watermark_enabled
      ? buildWatermarkPayload({
          studentName: auth.profile.full_name,
          phone: auth.profile.phone || '',
          studentId: auth.userId,
          enrollmentId: enrollment?.id,
        })
      : null;

    const { data: progress } = await admin
      .from('lesson_progress')
      .select('last_position_seconds')
      .eq('student_id', auth.userId)
      .eq('lecture_id', lecture.id)
      .maybeSingle();

    return res.json({
      ok: true,
      videoId: video.id,
      title: video.title || lecture.title,
      streamUrl: `/api/video/stream/${encodeURIComponent(token)}`,
      expiresAt,
      availableQualities: video.available_qualities || ['auto', '360p', '480p', '720p', '1080p'],
      captions: video.captions || [],
      resumePositionSeconds: progress?.last_position_seconds || 0,
      watermark,
      drm: {
        enabled: Boolean(video.drm_enabled),
        widevineLicenseUrl: process.env.DRM_WIDEVINE_LICENSE_URL || null,
        fairplayLicenseUrl: process.env.DRM_FAIRPLAY_LICENSE_URL || null,
        playreadyLicenseUrl: process.env.DRM_PLAYREADY_LICENSE_URL || null,
      },
    });
  });

  app.get('/api/video/stream/:token', async (req, res) => {
    const check = verifyPlaybackToken(req.params.token, VIDEO_TOKEN_SECRET);
    if (!check.valid) {
      return res.status(401).json({
        error: check.reason,
        message_ar: 'انتهت صلاحية رابط البث المحمي. يرجى تحديث المشغل.',
      });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED' });
    }

    const { data: logRow } = await admin
      .from('video_playback_logs')
      .select('status')
      .eq('session_token_id', check.payload.sessionId)
      .maybeSingle();

    if (logRow?.status === 'revoked') {
      return res.status(403).json({
        error: 'SESSION_REVOKED',
        message_ar: 'تم إيقاف صلاحية المشاهدة من قبل الإدارة.',
      });
    }

    const { data: video } = await admin
      .from('video_lessons')
      .select('storage_bucket, storage_path, hls_manifest_path')
      .eq('id', check.payload.videoId)
      .maybeSingle();

    const targetPath = video?.hls_manifest_path || video?.storage_path;
    if (!targetPath) {
      return res.status(404).json({ error: 'VIDEO_ASSET_MISSING', message_ar: 'ملف الفيديو غير متاح.' });
    }

    // Generate short-lived signed URL from private Supabase Storage bucket (never permanent public URL)
    const { data: signed, error: signErr } = await admin.storage
      .from(video.storage_bucket || 'private-videos')
      .createSignedUrl(targetPath, 120);

    if (signErr || !signed?.signedUrl) {
      return res.status(500).json({ error: 'SIGN_URL_FAILED', message_en: signErr?.message });
    }

    return res.redirect(302, signed.signedUrl);
  });

  // --------------------------------------------------------------------------
  // 5. Student Dashboard, Progress, Notes, Notifications, Profile
  // --------------------------------------------------------------------------
  app.get('/api/student/dashboard', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;

    const [enrollmentsRes, progressRes, attemptsRes, examsRes, notifRes, walletRes, certsRes] = await Promise.all([
      admin.from('enrollments').select('*, courses(*)').eq('student_id', auth.userId).eq('status', 'active'),
      admin.from('lesson_progress').select('*, lectures(id, title, course_id)').eq('student_id', auth.userId).order('updated_at', { ascending: false }),
      admin.from('exam_attempts').select('*, exams(id, title, course_id, results_published)').eq('student_id', auth.userId).order('started_at', { ascending: false }).limit(10),
      admin.from('exams').select('id, title, course_id, duration_minutes, starts_at, ends_at').eq('is_published', true).limit(6),
      admin.from('notifications').select('*').or(`user_id.eq.${auth.userId},user_id.is.null`).order('created_at', { ascending: false }).limit(15),
      admin.from('wallets').select('*').eq('student_id', auth.userId).maybeSingle(),
      admin.from('certificates').select('*, courses(title)').eq('student_id', auth.userId),
    ]);

    return res.json({
      profile: auth.profile,
      enrollments: enrollmentsRes.data || [],
      progress: progressRes.data || [],
      recentAttempts: attemptsRes.data || [],
      upcomingExams: examsRes.data || [],
      notifications: notifRes.data || [],
      wallet: walletRes.data || { current_balance: 0, available_balance: 0, currency: 'EGP' },
      certificates: certsRes.data || [],
    });
  });

  app.post('/api/lessons/:lectureId/progress', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;

    const lectureId = req.params.lectureId;
    const courseId = String(req.body?.courseId || '');
    const position = Math.max(0, Math.floor(Number(req.body?.positionSeconds) || 0));
    const duration = Math.max(0, Math.floor(Number(req.body?.durationSeconds) || 0));
    const isCompleted = Boolean(req.body?.isCompleted) || (duration > 0 && position / duration >= 0.9);

    const { data, error } = await admin
      .from('lesson_progress')
      .upsert(
        {
          student_id: auth.userId,
          course_id: courseId,
          lecture_id: lectureId,
          last_position_seconds: position,
          duration_seconds: duration,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,lecture_id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'PROGRESS_SAVE_FAILED', message_en: error.message });
    return res.json({ ok: true, progress: data });
  });

  app.get('/api/lessons/:lectureId/notes', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;
    const { data } = await admin
      .from('lesson_notes')
      .select('*')
      .eq('student_id', auth.userId)
      .eq('lecture_id', req.params.lectureId)
      .order('created_at', { ascending: false });
    return res.json({ notes: data || [] });
  });

  app.post('/api/lessons/:lectureId/notes', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'EMPTY_NOTE', message_ar: 'يرجى كتابة الملاحظة.' });

    const { data, error } = await admin
      .from('lesson_notes')
      .insert({
        student_id: auth.userId,
        lecture_id: req.params.lectureId,
        content,
        timestamp_seconds: Math.max(0, Math.floor(Number(req.body?.timestampSeconds) || 0)),
        is_bookmarked: Boolean(req.body?.isBookmarked),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'NOTE_SAVE_FAILED', message_en: error.message });
    return res.status(201).json({ ok: true, note: data });
  });

  app.patch('/api/student/profile', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;
    const safePatch = sanitizeStudentProfilePatch(req.body || {});
    if (Object.keys(safePatch).length === 0) {
      return res.status(400).json({ error: 'NO_VALID_FIELDS', message_ar: 'لا توجد حقول صالحة للتحديث.' });
    }
    safePatch.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from('profiles')
      .update(safePatch)
      .eq('id', auth.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'PROFILE_UPDATE_FAILED', message_en: error.message });
    return res.json({ ok: true, profile: data });
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;
    await admin.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', auth.userId);
    return res.json({ ok: true });
  });

  // --------------------------------------------------------------------------
  // 6. Examination System (Isolated Answer Keys & Server-Side Grading)
  // --------------------------------------------------------------------------
  app.get('/api/exams', async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) return res.json({ exams: [] });

    const { data: exams } = await admin
      .from('exams')
      .select('id, course_id, title, instructions, duration_minutes, pass_score, max_attempts, results_published, is_published, starts_at, ends_at, courses(title)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    return res.json({ exams: exams || [] });
  });

  app.post('/api/exams/:examId/start', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;

    const { data: exam } = await admin.from('exams').select('*').eq('id', req.params.examId).eq('is_published', true).maybeSingle();
    if (!exam) return res.status(404).json({ error: 'EXAM_NOT_FOUND', message_ar: 'الامتحان غير متاح.' });

    const { count: attemptsCount } = await admin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', exam.id)
      .eq('student_id', auth.userId);

    if ((attemptsCount || 0) >= exam.max_attempts) {
      return res.status(403).json({
        error: 'MAX_ATTEMPTS_REACHED',
        message_ar: 'لقد استنفدت الحد الأقصى لعدد المحاولات المسموحة لهذا الامتحان.',
      });
    }

    const { data: attempt, error: attErr } = await admin
      .from('exam_attempts')
      .insert({ exam_id: exam.id, student_id: auth.userId, status: 'in_progress' })
      .select()
      .single();

    if (attErr || !attempt) return res.status(500).json({ error: 'ATTEMPT_CREATE_FAILED' });

    const { data: rawQuestions } = await admin.from('exam_questions').select('*').eq('exam_id', exam.id).order('sort_order');
    const qIds = (rawQuestions || []).map((q) => q.id);
    const { data: rawOptions } = qIds.length
      ? await admin.from('question_options').select('*').in('question_id', qIds).order('sort_order')
      : { data: [] };

    const stripped = stripAnswerKeysForStudent(rawQuestions || [], rawOptions || []);
    const questions = exam.randomize_questions ? shuffleWithSeed(stripped.questions) : stripped.questions;
    const options = exam.randomize_options ? shuffleWithSeed(stripped.options) : stripped.options;

    return res.json({ ok: true, exam, attempt, questions, options });
  });

  app.post('/api/exams/:examId/submit', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;

    const attemptId = String(req.body?.attemptId || '');
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

    const { data: attempt } = await admin
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('student_id', auth.userId)
      .maybeSingle();

    if (!attempt || attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'INVALID_ATTEMPT', message_ar: 'هذه المحاولة مغلقة بالفعل.' });
    }

    const { data: exam } = await admin.from('exams').select('*').eq('id', req.params.examId).single();
    const { data: questions } = await admin.from('exam_questions').select('*').eq('exam_id', exam.id);
    const qIds = (questions || []).map((q) => q.id);
    const { data: options } = qIds.length
      ? await admin.from('question_options').select('*').in('question_id', qIds)
      : { data: [] };

    const summary = gradeExamSubmission(questions || [], options || [], answers, Number(exam.pass_score));

    for (const ans of answers) {
      const graded = summary.gradedAnswers.find((g) => g.question_id === ans.question_id);
      await admin.from('exam_answers').upsert(
        {
          attempt_id: attempt.id,
          question_id: ans.question_id,
          selected_option_id: ans.selected_option_id || null,
          text_answer: ans.text_answer || null,
          is_correct: graded?.is_correct ?? null,
          awarded_points: graded?.awarded_points ?? 0,
        },
        { onConflict: 'attempt_id,question_id' }
      );
    }

    const { data: updatedAttempt } = await admin
      .from('exam_attempts')
      .update({
        status: summary.status,
        score: summary.score,
        max_score: summary.maxScore,
        passed: summary.passed,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)
      .select()
      .single();

    return res.json({
      ok: true,
      attempt: updatedAttempt,
      resultsVisible: Boolean(exam.results_published),
      summary: exam.results_published
        ? summary
        : { status: summary.status, message_ar: 'تم استلام إجاباتك بنجاح وسيتم إعلان النتيجة بعد المراجعة.' },
    });
  });

  // --------------------------------------------------------------------------
  // 7. Student Wallet & Idempotent Server-Validated Webhook
  // --------------------------------------------------------------------------
  app.get('/api/wallet', async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const admin = getSupabaseAdmin()!;

    const [walletRes, txRes] = await Promise.all([
      admin.from('wallets').select('*').eq('student_id', auth.userId).maybeSingle(),
      admin.from('wallet_transactions').select('*').eq('student_id', auth.userId).order('created_at', { ascending: false }).limit(50),
    ]);

    return res.json({
      wallet: walletRes.data || { current_balance: 0, available_balance: 0, currency: 'EGP' },
      transactions: txRes.data || [],
      paymentProviderConfigured: Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_WEBHOOK_SECRET),
    });
  });

  app.post('/api/wallet/payment-webhook', sensitiveLimiter, async (req, res) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(501).json({
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message_ar: 'بوابة الدفع الإلكتروني غير مفعلة حالياً.',
      });
    }

    const signature = String(req.headers['x-eduverse-signature'] || '');
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (!signature || signature !== expected) {
      return res.status(401).json({ error: 'INVALID_WEBHOOK_SIGNATURE' });
    }

    const admin = getSupabaseAdmin()!;
    const referenceCode = String(req.body?.referenceCode || '').trim();
    const studentId = String(req.body?.studentId || '').trim();
    const amount = Number(req.body?.amount);

    if (!referenceCode || !studentId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }

    const { data: dup } = await admin.from('wallet_transactions').select('id').eq('reference_code', referenceCode).maybeSingle();
    if (dup) return res.status(200).json({ ok: true, duplicate: true });

    const { data: wallet } = await admin.from('wallets').select('*').eq('student_id', studentId).single();
    const nextCurrent = Math.round((Number(wallet.current_balance) + amount) * 100) / 100;
    const nextAvail = Math.round((Number(wallet.available_balance) + amount) * 100) / 100;

    await admin.from('wallets').update({ current_balance: nextCurrent, available_balance: nextAvail, updated_at: new Date().toISOString() }).eq('id', wallet.id);
    await admin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      student_id: studentId,
      tx_type: 'deposit',
      amount,
      currency: wallet.currency || 'EGP',
      status: 'completed',
      reference_code: referenceCode,
      provider: process.env.PAYMENT_PROVIDER || 'external',
      description: 'شحن رصيد المحفظة إلكترونياً',
    });

    return res.json({ ok: true });
  });

  // --------------------------------------------------------------------------
  // 8. Student Forum & Community
  // --------------------------------------------------------------------------
  app.get('/api/forum/posts', async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) return res.json({ categories: [], posts: [] });

    const categorySlug = String(req.query.category || '').trim();
    const q = String(req.query.q || '').trim();

    const { data: categories } = await admin.from('forum_categories').select('*').order('sort_order');
    let postQuery = admin
      .from('forum_posts')
      .select('*, profiles(id, full_name, avatar_url, role), forum_categories(slug, name_ar, name_en)')
      .eq('is_hidden', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40);

    if (q) postQuery = postQuery.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
    if (categorySlug && categories) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) postQuery = postQuery.eq('category_id', cat.id);
    }

    const { data: posts } = await postQuery;
    return res.json({ categories: categories || [], posts: posts || [] });
  });

  app.post('/api/forum/posts', sensitiveLimiter, async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    if (auth.profile.account_status !== 'approved') {
      return res.status(403).json({ error: 'ACCOUNT_NOT_APPROVED', message_ar: 'حسابك قيد المراجعة.' });
    }

    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (title.length < 4 || body.length < 8) {
      return res.status(400).json({ error: 'INVALID_POST', message_ar: 'يرجى كتابة عنوان ومحتوى واضح للمنشور.' });
    }

    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from('forum_posts')
      .insert({
        author_id: auth.userId,
        category_id: req.body?.categoryId || null,
        title,
        body,
      })
      .select('*, profiles(id, full_name, avatar_url, role)')
      .single();

    if (error) return res.status(500).json({ error: 'POST_CREATE_FAILED', message_en: error.message });
    return res.status(201).json({ ok: true, post: data });
  });

  app.get('/api/forum/posts/:id/comments', async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) return res.json({ comments: [] });
    const { data } = await admin
      .from('forum_comments')
      .select('*, profiles(id, full_name, avatar_url, role)')
      .eq('post_id', req.params.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });
    return res.json({ comments: data || [] });
  });

  app.post('/api/forum/posts/:id/comments', sensitiveLimiter, async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'EMPTY_COMMENT', message_ar: 'يرجى كتابة الرد.' });

    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from('forum_comments')
      .insert({
        post_id: req.params.id,
        author_id: auth.userId,
        parent_comment_id: req.body?.parentCommentId || null,
        body,
      })
      .select('*, profiles(id, full_name, avatar_url, role)')
      .single();

    if (error) return res.status(500).json({ error: 'COMMENT_FAILED', message_en: error.message });
    return res.status(201).json({ ok: true, comment: data });
  });

  app.post('/api/forum/report', sensitiveLimiter, async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'MISSING_REASON', message_ar: 'يرجى تحديد سبب البلاغ.' });

    const admin = getSupabaseAdmin()!;
    await admin.from('forum_reports').insert({
      reporter_id: auth.userId,
      post_id: req.body?.postId || null,
      comment_id: req.body?.commentId || null,
      reason,
    });
    return res.json({ ok: true, message_ar: 'تم إرسال البلاغ للمشرفين بنجاح.' });
  });

  // --------------------------------------------------------------------------
  // 9. Authorized Administrator Console Endpoints
  // --------------------------------------------------------------------------
  app.get('/api/admin/overview', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'view_overview');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    const [studentsTotal, studentsActive, studentsPending, coursesPublished, enrollmentsCount, examsCount, playbackLogs, auditLogs, reportsRes] =
      await Promise.all([
        admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('account_status', 'approved'),
        admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('account_status', 'pending'),
        admin.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        admin.from('exam_attempts').select('id', { count: 'exact', head: true }),
        admin.from('video_playback_logs').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(20),
        admin.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(25),
        admin.from('forum_reports').select('*').eq('status', 'open').order('created_at', { ascending: false }),
      ]);

    return res.json({
      stats: {
        studentsTotal: studentsTotal.count ?? 0,
        studentsActive: studentsActive.count ?? 0,
        studentsPending: studentsPending.count ?? 0,
        coursesPublished: coursesPublished.count ?? 0,
        enrollmentsCount: enrollmentsCount.count ?? 0,
        examAttemptsCount: examsCount.count ?? 0,
      },
      playbackLogs: playbackLogs.data || [],
      auditLogs: auditLogs.data || [],
      openReports: reportsRes.data || [],
    });
  });

  app.get('/api/admin/students', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_students');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim();

    let query = admin.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }).limit(100);
    if (status) query = query.eq('account_status', status);
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);

    const { data } = await query;
    return res.json({ students: data || [] });
  });

  app.patch('/api/admin/students/:id/status', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_students');
    if (!adminCtx) return;
    const status = String(req.body?.status || '');
    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS' });
    }

    const admin = getSupabaseAdmin()!;
    const { data, error } = await admin
      .from('profiles')
      .update({ account_status: status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('role', 'student')
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'STATUS_UPDATE_FAILED', message_en: error.message });

    await admin.from('notifications').insert({
      user_id: req.params.id,
      title: status === 'approved' ? 'تم تفعيل حسابك بنجاح' : 'تحديث حالة الحساب',
      body:
        status === 'approved'
          ? 'مرحباً بك في منصة EDUVERSE! تم تفعيل حسابك ويمكنك الآن تصفح الكورسات والدروس.'
          : `تم تحديث حالة حسابك إلى: ${status}`,
      notification_type: 'account',
    });

    await writeAuditLog({
      actorId: adminCtx.userId,
      action: `student_status_${status}`,
      targetTable: 'profiles',
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true, student: data });
  });

  app.post('/api/admin/courses', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_courses');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    const { data, error } = await admin
      .from('courses')
      .insert({
        title: req.body.title,
        title_en: req.body.title_en || null,
        slug: req.body.slug || `course-${Date.now()}`,
        description: req.body.description || '',
        description_en: req.body.description_en || '',
        cover_image_url: req.body.cover_image_url || null,
        teacher_name: req.body.teacher_name || adminCtx.profile.full_name,
        category: req.body.category || 'عام',
        grade_level: req.body.grade_level || 'الكل',
        price: Number(req.body.price) || 0,
        currency: req.body.currency || 'EGP',
        is_published: Boolean(req.body.is_published),
        is_featured: Boolean(req.body.is_featured),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'COURSE_CREATE_FAILED', message_en: error.message });
    await writeAuditLog({ actorId: adminCtx.userId, action: 'course_created', targetTable: 'courses', targetId: data.id, ipAddress: req.ip });
    return res.status(201).json({ ok: true, course: data });
  });

  app.post('/api/admin/wallet/adjust', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_wallet');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    const studentId = String(req.body?.studentId || '');
    const txType = req.body?.txType === 'payment' ? 'payment' : 'adjustment';
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || 'تعديل إداري للرصيد');
    const referenceCode = String(req.body?.referenceCode || `ADM-${Date.now()}`);

    if (!studentId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'INVALID_ADJUSTMENT' });
    }

    const { data: wallet } = await admin.from('wallets').select('*').eq('student_id', studentId).maybeSingle();
    if (!wallet) return res.status(404).json({ error: 'WALLET_NOT_FOUND' });

    const delta = txType === 'payment' ? -amount : amount;
    const nextBalance = Math.round((Number(wallet.current_balance) + delta) * 100) / 100;
    if (nextBalance < 0) return res.status(400).json({ error: 'INSUFFICIENT_BALANCE' });

    await admin
      .from('wallets')
      .update({ current_balance: nextBalance, available_balance: nextBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    const { data: tx } = await admin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        student_id: studentId,
        tx_type: txType,
        amount,
        currency: wallet.currency || 'EGP',
        status: 'completed',
        reference_code: referenceCode,
        description,
        created_by: adminCtx.userId,
      })
      .select()
      .single();

    await writeAuditLog({
      actorId: adminCtx.userId,
      action: 'wallet_admin_adjustment',
      targetTable: 'wallets',
      targetId: wallet.id,
      metadata: { amount, txType, referenceCode },
      ipAddress: req.ip,
    });

    return res.json({ ok: true, balance: nextBalance, transaction: tx });
  });

  app.post('/api/admin/media/asset', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_media');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    const assetKey = String(req.body?.asset_key || '').trim();
    const url = String(req.body?.url || '').trim();
    const title = String(req.body?.title || assetKey).trim();
    if (!assetKey || !url) return res.status(400).json({ error: 'MISSING_ASSET_FIELDS' });

    const { data, error } = await admin
      .from('media_assets')
      .upsert(
        {
          asset_key: assetKey,
          title,
          url,
          category: req.body?.category || 'branding',
          alt_text_ar: req.body?.alt_text_ar || title,
          alt_text_en: req.body?.alt_text_en || title,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'asset_key' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'MEDIA_SAVE_FAILED', message_en: error.message });
    await writeAuditLog({ actorId: adminCtx.userId, action: 'media_asset_updated', targetTable: 'media_assets', targetId: assetKey, ipAddress: req.ip });
    return res.json({ ok: true, asset: data });
  });

  app.post('/api/admin/content', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_content');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    const { page_key, section_key, locale, content } = req.body || {};
    if (!page_key || !section_key || !locale || !content) {
      return res.status(400).json({ error: 'MISSING_CONTENT_FIELDS' });
    }

    const { data, error } = await admin
      .from('page_content')
      .upsert(
        { page_key, section_key, locale, content, updated_by: adminCtx.userId, updated_at: new Date().toISOString() },
        { onConflict: 'page_key,section_key,locale' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'CONTENT_SAVE_FAILED', message_en: error.message });
    await writeAuditLog({ actorId: adminCtx.userId, action: 'page_content_updated', targetTable: 'page_content', targetId: `${page_key}:${section_key}`, ipAddress: req.ip });
    return res.json({ ok: true, content: data });
  });

  app.patch('/api/admin/settings', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_settings');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    if (req.body?.site_settings) {
      await admin.from('site_settings').upsert({ id: true, ...req.body.site_settings, updated_at: new Date().toISOString() });
    }
    if (req.body?.theme_settings) {
      await admin.from('theme_settings').upsert({ id: true, ...req.body.theme_settings, updated_at: new Date().toISOString() });
    }
    await writeAuditLog({ actorId: adminCtx.userId, action: 'settings_updated', targetTable: 'site_settings', ipAddress: req.ip });
    return res.json({ ok: true });
  });

  app.post('/api/admin/video-logs/:id/revoke', async (req, res) => {
    const adminCtx = await requireAuthorizedAdmin(req, res, 'manage_videos');
    if (!adminCtx) return;
    const admin = getSupabaseAdmin()!;

    await admin.from('video_playback_logs').update({ status: 'revoked' }).eq('id', req.params.id);
    await writeAuditLog({ actorId: adminCtx.userId, action: 'video_session_revoked', targetTable: 'video_playback_logs', targetId: req.params.id, ipAddress: req.ip });
    return res.json({ ok: true });
  });

  // --------------------------------------------------------------------------
  // 10. Dynamic SEO robots.txt & sitemap.xml
  // --------------------------------------------------------------------------
  app.get('/robots.txt', async (_req, res) => {
    const base = (process.env.APP_URL || process.env.VITE_CANONICAL_DOMAIN || '').replace(/\/$/, '');
    const lines = [
      'User-agent: *',
      'Allow: /',
      'Allow: /courses',
      'Allow: /abdullah',
      'Disallow: /dashboard',
      'Disallow: /profile',
      'Disallow: /wallet',
      'Disallow: /notifications',
      'Disallow: /admin',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /forgot-password',
      'Disallow: /learn/',
      'Disallow: /exams/',
      ...(base ? [`Sitemap: ${base}/sitemap.xml`] : []),
    ];
    res.type('text/plain').send(lines.join('\n'));
  });

  app.get('/sitemap.xml', async (req, res) => {
    const base = (
      process.env.APP_URL ||
      process.env.VITE_CANONICAL_DOMAIN ||
      `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');

    const admin = getSupabaseAdmin();
    let courseUrls = '';
    if (admin) {
      const { data: courses } = await admin.from('courses').select('id, slug, updated_at').eq('is_published', true);
      courseUrls = (courses || [])
        .map(
          (c) =>
            `<url><loc>${base}/courses/${c.slug || c.id}</loc><lastmod>${(c.updated_at || new Date().toISOString()).slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`
        )
        .join('');
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/courses</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${base}/abdullah</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  ${courseUrls}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // --------------------------------------------------------------------------
  // 11. Vite Dev Middleware / Production Static Serving
  // --------------------------------------------------------------------------
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

if (!process.env.VERCEL) {
  createApp().then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`EDUVERSE server running on http://0.0.0.0:${PORT}`);
    });
  });
}
