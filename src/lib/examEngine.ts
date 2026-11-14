export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay';

export interface ExamQuestionRecord {
  id: string;
  question_type: QuestionType;
  prompt: string;
  image_url?: string | null;
  attachment_url?: string | null;
  points: number;
  correct_text_answer?: string | null;
  explanation?: string | null;
  sort_order: number;
}

export interface QuestionOptionRecord {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface StudentAnswerInput {
  question_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
}

export interface GradedAnswerResult {
  question_id: string;
  is_correct: boolean | null;
  awarded_points: number;
  requires_manual_grading: boolean;
}

export interface ExamGradeSummary {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  hasManualQuestions: boolean;
  status: 'graded' | 'pending_manual_grading';
  gradedAnswers: GradedAnswerResult[];
}

export function shuffleWithSeed<T>(items: T[], seed?: number): T[] {
  const copy = [...items];
  let s = seed ?? Math.floor(Math.random() * 1000000);
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function stripAnswerKeysForStudent(
  questions: ExamQuestionRecord[],
  options: QuestionOptionRecord[]
) {
  const sanitizedQuestions = questions.map((q) => ({
    id: q.id,
    question_type: q.question_type,
    prompt: q.prompt,
    image_url: q.image_url ?? null,
    attachment_url: q.attachment_url ?? null,
    points: Number(q.points),
    sort_order: q.sort_order,
  }));

  const sanitizedOptions = options.map((o) => ({
    id: o.id,
    question_id: o.question_id,
    option_text: o.option_text,
    sort_order: o.sort_order,
  }));

  return { questions: sanitizedQuestions, options: sanitizedOptions };
}

export function gradeExamSubmission(
  questions: ExamQuestionRecord[],
  options: QuestionOptionRecord[],
  answers: StudentAnswerInput[],
  passScorePercent: number
): ExamGradeSummary {
  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  let score = 0;
  let maxScore = 0;
  let hasManualQuestions = false;
  const gradedAnswers: GradedAnswerResult[] = [];

  for (const q of questions) {
    const pts = Number(q.points) || 0;
    maxScore += pts;
    const studentAns = answerMap.get(q.id);

    if (q.question_type === 'essay') {
      hasManualQuestions = true;
      gradedAnswers.push({
        question_id: q.id,
        is_correct: null,
        awarded_points: 0,
        requires_manual_grading: true,
      });
      continue;
    }

    if (q.question_type === 'mcq' || q.question_type === 'true_false') {
      const correctOption = options.find((o) => o.question_id === q.id && o.is_correct);
      const isCorrect = Boolean(
        correctOption && studentAns?.selected_option_id === correctOption.id
      );
      const awarded = isCorrect ? pts : 0;
      score += awarded;
      gradedAnswers.push({
        question_id: q.id,
        is_correct: isCorrect,
        awarded_points: awarded,
        requires_manual_grading: false,
      });
      continue;
    }

    if (q.question_type === 'short_answer') {
      const expected = (q.correct_text_answer || '').trim().toLowerCase();
      const actual = (studentAns?.text_answer || '').trim().toLowerCase();
      const isCorrect = expected.length > 0 && actual === expected;
      const awarded = isCorrect ? pts : 0;
      score += awarded;
      gradedAnswers.push({
        question_id: q.id,
        is_correct: isCorrect,
        awarded_points: awarded,
        requires_manual_grading: false,
      });
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  const status = hasManualQuestions ? 'pending_manual_grading' : 'graded';
  const passed = !hasManualQuestions && percentage >= passScorePercent;

  return {
    score,
    maxScore,
    percentage,
    passed,
    hasManualQuestions,
    status,
    gradedAnswers,
  };
}

export function getRemainingExamSeconds(
  startedAtIso: string,
  durationMinutes: number,
  nowMs: number = Date.now()
): number {
  const startMs = new Date(startedAtIso).getTime();
  if (Number.isNaN(startMs)) return 0;
  const endMs = startMs + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - nowMs) / 1000));
}
