import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone,
  isValidPhone,
  isValidEmail,
  evaluatePasswordStrength,
  validateRegistrationInput,
  sanitizeStudentProfilePatch,
} from './validation';

test('normalizes Egyptian and Arabic-Indic phone numbers accurately', () => {
  assert.equal(normalizePhone('01012345678'), '+201012345678');
  assert.equal(normalizePhone('٠١٠١٢٣٤٥٦٧٨'), '+201012345678');
  assert.equal(normalizePhone('00201122334455'), '+201122334455');
  assert.equal(normalizePhone('+20 12 3456 7890'), '+201234567890');
  assert.equal(isValidPhone('01012345678'), true);
  assert.equal(isValidPhone('12345'), false);
});

test('validates Gmail requirement and password strength', () => {
  assert.equal(isValidEmail('student@gmail.com', true), true);
  assert.equal(isValidEmail('student@yahoo.com', true), false);
  const weak = evaluatePasswordStrength('12345');
  assert.equal(weak.level, 'weak');
  const strong = evaluatePasswordStrength('Eduverse#2026Strong');
  assert.equal(strong.level, 'strong');
});

test('validates Arabic and English registration forms and rejects duplicate guardian phone', () => {
  const validArabic = validateRegistrationInput({
    fullName: 'أحمد محمد علي',
    phone: '01012345678',
    guardianPhone: '01198765432',
    email: 'ahmed.ali@gmail.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    acceptedTerms: true,
  });
  assert.equal(validArabic.valid, true);
  assert.equal(validArabic.normalizedPhone, '+201012345678');

  const sameGuardian = validateRegistrationInput({
    fullName: 'Ahmed Ali',
    phone: '01012345678',
    guardianPhone: '01012345678',
    email: 'ahmed@gmail.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    acceptedTerms: true,
  });
  assert.equal(sameGuardian.valid, false);
  assert.ok(sameGuardian.errors.guardianPhone);
});

test('sanitizes student profile patch to prevent role/balance privilege escalation', () => {
  const patch = sanitizeStudentProfilePatch({
    full_name: '  سارة محمود  ',
    role: 'super_admin',
    account_status: 'approved',
    wallet_balance: 99999,
    preferred_theme: 'dark',
  });
  assert.equal(patch.full_name, 'سارة محمود');
  assert.equal(patch.preferred_theme, 'dark');
  assert.equal('role' in patch, false);
  assert.equal('account_status' in patch, false);
  assert.equal('wallet_balance' in patch, false);
});
