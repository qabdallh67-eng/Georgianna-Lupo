export interface WatermarkIdentity {
  studentName: string;
  phone: string;
  studentId: string;
  enrollmentId?: string;
}

export interface WatermarkRenderPayload {
  primaryText: string;
  secondaryText: string;
  timestamp: string;
}

export type WatermarkZone =
  | 'top-left'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-right';

const WATERMARK_ZONES: WatermarkZone[] = [
  'top-right',
  'bottom-left',
  'center-right',
  'top-left',
  'bottom-right',
  'center-left',
];

export function maskPhoneForDisplay(rawPhone?: string | null): string {
  if (!rawPhone) return '****';
  const clean = rawPhone.trim();
  if (clean.length <= 5) return '****';
  const start = clean.slice(0, Math.min(4, clean.length - 4));
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

export function buildWatermarkPayload(
  identity: WatermarkIdentity,
  now: Date = new Date()
): WatermarkRenderPayload {
  const shortId = identity.enrollmentId
    ? identity.enrollmentId.slice(0, 8).toUpperCase()
    : identity.studentId.slice(0, 8).toUpperCase();
  const masked = maskPhoneForDisplay(identity.phone);
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 16);

  return {
    primaryText: `${identity.studentName} · ${masked}`,
    secondaryText: `ID:${shortId} · ${timestamp}`,
    timestamp,
  };
}

export function getWatermarkZone(stepIndex: number): WatermarkZone {
  const idx = Math.abs(stepIndex) % WATERMARK_ZONES.length;
  return WATERMARK_ZONES[idx];
}

export function hasAdminPermission(
  role: string | undefined | null,
  accountStatus: string | undefined | null,
  permissionKey: string,
  rolePermissions: Array<{ role: string; permission_key: string }> = []
): boolean {
  if (accountStatus !== 'approved') return false;
  if (role === 'super_admin') return true;
  if (role !== 'admin' && role !== 'moderator' && role !== 'instructor') return false;

  if (rolePermissions.length === 0) {
    return role === 'admin';
  }
  return rolePermissions.some(
    (rp) => rp.role === role && (rp.permission_key === permissionKey || rp.permission_key === '*')
  );
}

export interface ProgressCalculationInput {
  totalLessons: number;
  completedLessons: number;
  bestExamScore?: number | null;
  minProgressForCert?: number;
  minExamScoreForCert?: number;
}

export function calculateCourseCompletion(input: ProgressCalculationInput): {
  progressPercent: number;
  certificateEligible: boolean;
} {
  if (input.totalLessons <= 0) {
    return { progressPercent: 0, certificateEligible: false };
  }
  const clampedCompleted = Math.max(0, Math.min(input.totalLessons, input.completedLessons));
  const progressPercent = Math.round((clampedCompleted / input.totalLessons) * 100);
  const minProgress = input.minProgressForCert ?? 80;
  const minExam = input.minExamScoreForCert ?? 60;

  const progressOk = progressPercent >= minProgress;
  const examOk =
    input.bestExamScore === undefined || input.bestExamScore === null
      ? true
      : input.bestExamScore >= minExam;

  return {
    progressPercent,
    certificateEligible: progressOk && examOk,
  };
}
