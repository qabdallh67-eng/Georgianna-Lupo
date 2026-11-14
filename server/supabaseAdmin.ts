import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { hasAdminPermission } from '../src/lib/securityEngine';

const DEFAULT_SUPABASE_URL = 'https://suldaiuxaxremmfxodak.supabase.co';

export function getSupabaseConfigStatus() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    url,
    hasAnonKey: Boolean(anonKey && !anonKey.startsWith('YOUR_')),
    hasServiceRoleKey: Boolean(serviceRoleKey && !serviceRoleKey.startsWith('YOUR_')),
    configured: Boolean(
      url &&
        anonKey &&
        !anonKey.startsWith('YOUR_') &&
        serviceRoleKey &&
        !serviceRoleKey.startsWith('YOUR_')
    ),
    missingVariables: [
      ...(!anonKey || anonKey.startsWith('YOUR_') ? ['VITE_SUPABASE_ANON_KEY'] : []),
      ...(!serviceRoleKey || serviceRoleKey.startsWith('YOUR_') ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ],
  };
}

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const status = getSupabaseConfigStatus();
  if (!status.hasServiceRoleKey) return null;
  if (!cachedAdmin) {
    cachedAdmin = createClient(status.url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedAdmin;
}

export function createSupabaseAnonClient(): SupabaseClient | null {
  const status = getSupabaseConfigStatus();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!status.hasAnonKey) return null;
  return createClient(status.url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AuthContext {
  userId: string;
  email: string;
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    guardian_phone: string | null;
    email: string | null;
    avatar_url: string | null;
    grade_level: string | null;
    group_name: string | null;
    role: string;
    account_status: string;
    bio: string | null;
    preferred_language: string;
    preferred_theme: string;
  };
}

export async function authenticateRequest(req: Request, res: Response): Promise<AuthContext | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'SUPABASE_NOT_CONFIGURED',
      message_ar: 'إعدادات قاعدة البيانات غير مكتملة على الخادم.',
      message_en: 'Server database configuration is incomplete.',
      missing: getSupabaseConfigStatus().missingVariables,
    });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message_ar: 'يرجى تسجيل الدخول أولاً.',
      message_en: 'Authentication required.',
    });
    return null;
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({
      error: 'INVALID_SESSION',
      message_ar: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.',
      message_en: 'Session expired or invalid.',
    });
    return null;
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    res.status(403).json({
      error: 'PROFILE_NOT_FOUND',
      message_ar: 'لم يتم العثور على ملف المستخدم.',
      message_en: 'User profile not found.',
    });
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email || profile.email || '',
    profile,
  };
}

export async function requireAuthorizedAdmin(
  req: Request,
  res: Response,
  permissionKey?: string
): Promise<AuthContext | null> {
  const ctx = await authenticateRequest(req, res);
  if (!ctx) return null;

  const admin = getSupabaseAdmin()!;
  const { data: rolePerms } = await admin
    .from('admin_role_permissions')
    .select('role, permission_key')
    .eq('role', ctx.profile.role);

  const allowed = hasAdminPermission(
    ctx.profile.role,
    ctx.profile.account_status,
    permissionKey || 'admin_access',
    rolePerms || []
  );

  if (!allowed) {
    res.status(403).json({
      error: 'FORBIDDEN_ADMIN_ONLY',
      message_ar: 'غير مصرح لك بالوصول إلى لوحة الإدارة.',
      message_en: 'Administrator privileges required.',
    });
    return null;
  }

  return ctx;
}

export async function writeAuditLog(params: {
  actorId: string | null;
  action: string;
  targetTable?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin.from('audit_logs').insert({
      actor_id: params.actorId,
      action: params.action,
      target_table: params.targetTable || null,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    });
  } catch {
    // Audit logging should never crash primary request if table not yet migrated
  }
}
