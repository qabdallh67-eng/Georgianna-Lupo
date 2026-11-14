export interface RegistrationInput {
  fullName: string;
  phone: string;
  guardianPhone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalizedPhone: string;
  normalizedGuardianPhone: string;
  normalizedEmail: string;
}

const ARABIC_INDIC_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function toAsciiDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_INDIC_MAP[d] ?? d);
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const ascii = toAsciiDigits(raw).trim();
  const stripped = ascii.replace(/[\s\-().]/g, '');

  if (stripped.startsWith('0020')) {
    return '+20' + stripped.slice(4);
  }
  if (stripped.startsWith('+20')) {
    return stripped;
  }
  if (stripped.startsWith('20') && stripped.length === 12 && stripped[2] === '1') {
    return '+' + stripped;
  }
  if (stripped.startsWith('01') && stripped.length === 11) {
    return '+2' + stripped;
  }
  if (stripped.startsWith('+')) {
    return stripped;
  }
  if (stripped.startsWith('00')) {
    return '+' + stripped.slice(2);
  }
  return stripped;
}

export function isValidPhone(raw: string): boolean {
  const norm = normalizePhone(raw);
  // Egyptian mobile (+2010/011/012/015 + 8 digits = 13 chars) or standard E.164 (10-15 digits)
  if (/^\+201[0125][0-9]{8}$/.test(norm)) return true;
  if (/^\+[1-9][0-9]{8,14}$/.test(norm)) return true;
  return false;
}

export function isValidEmail(raw: string, requireGmail = false): boolean {
  const clean = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return false;
  if (requireGmail) {
    return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
  }
  return true;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  level: 'weak' | 'fair' | 'good' | 'strong';
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSymbolOrCase: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(password);
  const hasNumber = /[0-9٠-٩]/.test(password);
  const hasSymbolOrCase =
    (/[A-Z]/.test(password) && /[a-z]/.test(password)) ||
    /[^a-zA-Z0-9\s]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter && hasNumber) score++;
  if (hasSymbolOrCase) score++;
  if (password.length >= 12) score++;

  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const level =
    clamped <= 1 ? 'weak' : clamped === 2 ? 'fair' : clamped === 3 ? 'good' : 'strong';

  return { score: clamped, level, hasMinLength, hasLetter, hasNumber, hasSymbolOrCase };
}

export function validateRegistrationInput(
  input: RegistrationInput,
  locale: 'ar' | 'en' = 'ar'
): ValidationResult {
  const errors: Record<string, string> = {};
  const fullName = (input.fullName || '').trim();
  const normalizedPhone = normalizePhone(input.phone || '');
  const normalizedGuardianPhone = normalizePhone(input.guardianPhone || '');
  const normalizedEmail = (input.email || '').trim().toLowerCase();

  // Support Arabic and English names (at least 2 words or >= 4 chars)
  if (fullName.length < 4 || !/^[\u0600-\u06FFa-zA-Z\s'.-]+$/.test(fullName)) {
    errors.fullName =
      locale === 'ar'
        ? 'يرجى إدخال الاسم الكامل بشكل صحيح (بالعربية أو الإنجليزية، 4 أحرف على الأقل).'
        : 'Please enter a valid full name (Arabic or English, at least 4 characters).';
  }

  if (!isValidPhone(input.phone)) {
    errors.phone =
      locale === 'ar'
        ? 'يرجى إدخال رقم هاتف شخصي صحيح (مثل 01012345678 أو رقم دولي بصيغة +).'
        : 'Please enter a valid personal phone number (e.g., 01012345678 or +country format).';
  }

  if (!isValidPhone(input.guardianPhone)) {
    errors.guardianPhone =
      locale === 'ar'
        ? 'يرجى إدخال رقم هاتف ولي الأمر (الأب) بشكل صحيح.'
        : 'Please enter a valid father or guardian phone number.';
  } else if (normalizedPhone && normalizedGuardianPhone === normalizedPhone) {
    errors.guardianPhone =
      locale === 'ar'
        ? 'رقم هاتف ولي الأمر يجب أن يكون مختلفاً عن رقم الطالب الشخصي.'
        : 'Guardian phone number must be different from your personal phone number.';
  }

  if (!isValidEmail(normalizedEmail, true)) {
    errors.email =
      locale === 'ar'
        ? 'يرجى إدخال بريد Gmail صحيح (ينتهي بـ @gmail.com).'
        : 'Please enter a valid Gmail address (@gmail.com).';
  }

  const strength = evaluatePasswordStrength(input.password || '');
  if (!strength.hasMinLength || !strength.hasLetter || !strength.hasNumber) {
    errors.password =
      locale === 'ar'
        ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام.'
        : 'Password must be at least 8 characters and include both letters and numbers.';
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword =
      locale === 'ar'
        ? 'كلمتا المرور غير متطابقتين.'
        : 'Passwords do not match.';
  }

  if (!input.acceptedTerms) {
    errors.acceptedTerms =
      locale === 'ar'
        ? 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية.'
        : 'You must accept the terms of service and privacy policy.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
    normalizedGuardianPhone,
    normalizedEmail,
  };
}

export function sanitizeStudentProfilePatch(payload: Record<string, unknown>): Record<string, unknown> {
  const ALLOWED_FIELDS = ['full_name', 'bio', 'avatar_url', 'preferred_language', 'preferred_theme', 'grade_level'];
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in payload && payload[key] !== undefined) {
      safe[key] = typeof payload[key] === 'string' ? (payload[key] as string).trim() : payload[key];
    }
  }
  return safe;
}
