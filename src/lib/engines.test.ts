import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maskPhoneForDisplay,
  buildWatermarkPayload,
  getWatermarkZone,
  hasAdminPermission,
  calculateCourseCompletion,
} from './securityEngine';
import {
  stripAnswerKeysForStudent,
  gradeExamSubmission,
  getRemainingExamSeconds,
} from './examEngine';
import { processWalletTransaction, formatCurrencyAmount } from './walletEngine';
import { signPlaybackToken, verifyPlaybackToken } from '../../server/securityToken';

test('masks phone and builds dynamic watermark payload safely', () => {
  assert.equal(maskPhoneForDisplay('+201012345678'), '+201****678');
  const payload = buildWatermarkPayload(
    {
      studentName: 'عمر حسن',
      phone: '+201012345678',
      studentId: '12345678-aaaa-bbbb-cccc-1234567890ab',
      enrollmentId: 'abcd9999-1111',
    },
    new Date('2026-11-14T12:30:00Z')
  );
  assert.equal(payload.primaryText, 'عمر حسن · +201****678');
  assert.equal(payload.secondaryText, 'ID:ABCD9999 · 2026-11-14 12:30');
  assert.notEqual(getWatermarkZone(0), getWatermarkZone(1));
});

test('enforces RBAC admin permissions and course certificate rules', () => {
  assert.equal(hasAdminPermission('student', 'approved', 'manage_courses'), false);
  assert.equal(hasAdminPermission('admin', 'pending', 'manage_courses'), false);
  assert.equal(hasAdminPermission('super_admin', 'approved', 'manage_courses'), true);
  assert.equal(
    hasAdminPermission('moderator', 'approved', 'moderate_forum', [
      { role: 'moderator', permission_key: 'moderate_forum' },
    ]),
    true
  );

  const eligible = calculateCourseCompletion({
    totalLessons: 10,
    completedLessons: 9,
    bestExamScore: 85,
    minProgressForCert: 80,
    minExamScoreForCert: 60,
  });
  assert.equal(eligible.progressPercent, 90);
  assert.equal(eligible.certificateEligible, true);

  const notEligible = calculateCourseCompletion({
    totalLessons: 10,
    completedLessons: 7,
    bestExamScore: 95,
    minProgressForCert: 80,
  });
  assert.equal(notEligible.certificateEligible, false);
});

test('strips answer keys, auto-grades MCQ/TF/short-answer, and flags essays', () => {
  const questions = [
    { id: 'q1', question_type: 'mcq' as const, prompt: '2+2?', points: 5, sort_order: 1 },
    {
      id: 'q2',
      question_type: 'short_answer' as const,
      prompt: 'Keyword?',
      points: 5,
      correct_text_answer: 'React',
      sort_order: 2,
    },
    { id: 'q3', question_type: 'essay' as const, prompt: 'Explain closures', points: 10, sort_order: 3 },
  ];
  const options = [
    { id: 'o1', question_id: 'q1', option_text: '3', is_correct: false, sort_order: 1 },
    { id: 'o2', question_id: 'q1', option_text: '4', is_correct: true, sort_order: 2 },
  ];

  const stripped = stripAnswerKeysForStudent(questions, options);
  assert.equal('is_correct' in stripped.options[1], false);
  assert.equal('correct_text_answer' in stripped.questions[1], false);

  const graded = gradeExamSubmission(
    questions,
    options,
    [
      { question_id: 'q1', selected_option_id: 'o2' },
      { question_id: 'q2', text_answer: ' react ' },
      { question_id: 'q3', text_answer: 'A closure captures lexical scope.' },
    ],
    60
  );
  assert.equal(graded.score, 10);
  assert.equal(graded.maxScore, 20);
  assert.equal(graded.status, 'pending_manual_grading');

  const rem = getRemainingExamSeconds('2026-11-14T12:00:00Z', 30, new Date('2026-11-14T12:10:00Z').getTime());
  assert.equal(rem, 1200);
});

test('enforces wallet idempotency, balance checks, and signed playback token expiry', () => {
  let state = {
    currentBalance: 100,
    availableBalance: 100,
    processedReferences: new Set<string>(),
  };

  const dep = processWalletTransaction(state, {
    txType: 'deposit',
    amount: 250,
    referenceCode: 'DEP-001',
    status: 'completed',
  });
  assert.equal(dep.ok, true);
  assert.equal(dep.nextState.currentBalance, 350);
  state = dep.nextState;

  const dup = processWalletTransaction(state, {
    txType: 'deposit',
    amount: 250,
    referenceCode: 'DEP-001',
    status: 'completed',
  });
  assert.equal(dup.ok, false);
  assert.equal(dup.errorCode, 'DUPLICATE_REFERENCE');

  const overdraw = processWalletTransaction(state, {
    txType: 'payment',
    amount: 500,
    referenceCode: 'PAY-001',
    status: 'completed',
  });
  assert.equal(overdraw.ok, false);
  assert.equal(overdraw.errorCode, 'INSUFFICIENT_BALANCE');

  assert.ok(formatCurrencyAmount(350, 'EGP', 'en').includes('EGP'));

  const secret = 'test-signing-secret-eduverse-2026';
  const signed = signPlaybackToken(
    { sessionId: 's1', studentId: 'u1', courseId: 'c1', videoId: 'v1' },
    secret,
    60
  );
  const verifiedNow = verifyPlaybackToken(signed.token, secret, Date.now() + 10_000);
  assert.equal(verifiedNow.valid, true);
  const expired = verifyPlaybackToken(signed.token, secret, Date.now() + 90_000);
  assert.equal(expired.valid, false);
  if (!expired.valid) assert.equal(expired.reason, 'EXPIRED');
});
