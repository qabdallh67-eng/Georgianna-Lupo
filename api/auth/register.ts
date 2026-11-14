import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getSupabaseConfigStatus, writeAuditLog } from '../../server/supabaseAdmin';
import { validateRegistrationInput } from '../../src/lib/validation';

export default async function registerHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message_ar: 'طريقة الطلب غير مسموح بها.' });
  }

  const locale = req.body?.locale === 'en' ? 'en' : 'ar';
  const input = {
    fullName: String(req.body?.fullName || ''),
    phone: String(req.body?.phone || ''),
    guardianPhone: String(req.body?.guardianPhone || ''),
    email: String(req.body?.email || ''),
    password: String(req.body?.password || ''),
    confirmPassword: String(req.body?.confirmPassword || ''),
    acceptedTerms: Boolean(req.body?.acceptedTerms),
  };

  const validation = validateRegistrationInput(input, locale);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      errors: validation.errors,
      message_ar: Object.values(validation.errors)[0] || 'يرجى مراجعة البيانات المدخلة.',
      message_en: Object.values(validation.errors)[0] || 'Please review the submitted information.',
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({
      error: 'SUPABASE_NOT_CONFIGURED',
      message_ar: 'خدمة إنشاء الحساب غير مهيأة على الخادم. يرجى مراجعة إعدادات Supabase في Vercel.',
      message_en: 'Registration is not configured on the server. Please check the Supabase environment settings.',
      missing: getSupabaseConfigStatus().missingVariables,
    });
  }

  try {
    const { data: existingPhone, error: phoneLookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', validation.normalizedPhone)
      .maybeSingle();

    if (phoneLookupError) {
      console.error('[register] phone lookup failed:', phoneLookupError.message);
      return res.status(500).json({
        error: 'PROFILE_LOOKUP_FAILED',
        message_ar: 'تعذر التحقق من رقم الهاتف حالياً. حاول مرة أخرى لاحقاً.',
        message_en: 'Unable to verify the phone number. Please try again later.',
      });
    }

    if (existingPhone) {
      return res.status(409).json({
        error: 'DUPLICATE_PHONE',
        message_ar: 'رقم الهاتف الشخصي مسجل بالفعل في المنصة.',
        message_en: 'This personal phone number is already registered.',
      });
    }

    const { data: existingEmail, error: emailLookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', validation.normalizedEmail)
      .maybeSingle();

    if (emailLookupError) {
      console.error('[register] email lookup failed:', emailLookupError.message);
      return res.status(500).json({
        error: 'PROFILE_LOOKUP_FAILED',
        message_ar: 'تعذر التحقق من البريد الإلكتروني حالياً. حاول مرة أخرى لاحقاً.',
        message_en: 'Unable to verify the email address. Please try again later.',
      });
    }

    if (existingEmail) {
      return res.status(409).json({
        error: 'DUPLICATE_EMAIL',
        message_ar: 'البريد الإلكتروني مسجل بالفعل.',
        message_en: 'This email address is already registered.',
      });
    }

    const { data: settings, error: settingsError } = await admin
      .from('site_settings')
      .select('require_student_approval, default_currency')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('[register] settings lookup failed:', settingsError.message);
      return res.status(500).json({
        error: 'REGISTRATION_SETTINGS_FAILED',
        message_ar: 'تعذر تحميل إعدادات التسجيل. يرجى المحاولة لاحقاً.',
        message_en: 'Unable to load registration settings. Please try again later.',
      });
    }

    const initialStatus = (settings?.require_student_approval ?? true) ? 'pending' : 'approved';

    const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
      email: validation.normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName.trim(),
        phone: validation.normalizedPhone,
        role: 'student',
      },
    });

    if (authError || !createdAuth.user) {
      console.error('[register] Supabase Auth createUser failed:', authError?.message || 'No user returned');
      const duplicate = /already|registered|exists/i.test(authError?.message || '');
      return res.status(duplicate ? 409 : 400).json({
        error: duplicate ? 'DUPLICATE_EMAIL' : 'AUTH_CREATE_FAILED',
        message_ar: duplicate
          ? 'البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول أو استخدم بريداً آخر.'
          : 'تعذر إنشاء الحساب عبر خدمة المصادقة. يرجى المحاولة مرة أخرى.',
        message_en: duplicate
          ? 'This email is already registered. Please log in or use another email.'
          : 'The authentication service could not create the account. Please try again.',
      });
    }

    const userId = createdAuth.user.id;
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      full_name: input.fullName.trim(),
      phone: validation.normalizedPhone,
      guardian_phone: validation.normalizedGuardianPhone,
      email: validation.normalizedEmail,
      grade_level: req.body?.gradeLevel ? String(req.body.gradeLevel) : null,
      role: 'student',
      account_status: initialStatus,
      preferred_language: locale,
    });

    if (profileError) {
      console.error('[register] profile insert failed:', profileError.message);
      await admin.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error: 'PROFILE_CREATE_FAILED',
        message_ar: 'تم رفض حفظ بيانات الطالب في قاعدة البيانات. يرجى مراجعة إعدادات قاعدة البيانات.',
        message_en: 'The student profile could not be saved. Please check the database configuration.',
      });
    }

    const { error: walletError } = await admin.from('wallets').upsert({
      student_id: userId,
      current_balance: 0,
      available_balance: 0,
      currency: settings?.default_currency || 'EGP',
    });

    if (walletError) {
      console.error('[register] wallet initialization failed:', walletError.message);
    }

    await writeAuditLog({
      actorId: userId,
      action: 'student_registered',
      targetTable: 'profiles',
      targetId: userId,
      metadata: { status: initialStatus },
      ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim(),
    });

    return res.status(201).json({
      ok: true,
      accountStatus: initialStatus,
      message_ar: initialStatus === 'pending'
        ? 'تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة والموافقة من الإدارة.'
        : 'تم إنشاء حسابك وتفعيله بنجاح! يمكنك تسجيل الدخول الآن.',
      message_en: initialStatus === 'pending'
        ? 'Your account has been created and is pending administrator approval.'
        : 'Your student account is ready. You may log in now.',
    });
  } catch (error) {
    console.error('[register] unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message_ar: 'حدث خطأ غير متوقع أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.',
      message_en: 'An unexpected error occurred while creating the account. Please try again later.',
    });
  }
}
