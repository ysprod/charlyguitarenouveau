import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal
} from '@angular/core';
import {
  DifficultyFilter,
  QuizQuestion
} from '../models/acoustic-quiz.model';
import { ACOUSTIC_QUESTIONS } from 'src/app/game/data/acoustic-questions';
import { DIFFICULTIES, LETTERS, } from '../constants/acoustic.constants';
import { getDifficultyClass } from '../utils/difficulty.util';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-acoustic',
  imports: [],
  templateUrl: './acoustic.component.html',
  styleUrls: ['./acoustic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcousticComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES
     ═══════════════════════════════════════════════════════ */

  readonly questions: readonly QuizQuestion[] = ACOUSTIC_QUESTIONS;

  /* ═══════════════════════════════════════════════════════
     FILTRES
     ═══════════════════════════════════════════════════════ */

  readonly difficulties: readonly DifficultyFilter[] = DIFFICULTIES;
  readonly selectedDifficulty = signal<DifficultyFilter>('Toutes');

  /* ═══════════════════════════════════════════════════════
     ÉTAT DU QUIZ
     ═══════════════════════════════════════════════════════ */

  readonly currentQuestionIndex = signal(0);
  readonly score = signal(0);
  readonly selectedOptionIndex = signal<number | null>(null);
  readonly isAnswerSubmitted = signal(false);
  readonly isCompleted = signal(false);
  readonly streak = signal(0);
  readonly bestStreak = signal(0);

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly filteredQuestions = computed(() => {
    const filter = this.selectedDifficulty();
    return filter === 'Toutes'
      ? this.questions
      : this.questions.filter((q) => q.difficulty === filter);
  });

  readonly totalQuestions = computed(() => this.filteredQuestions().length);

  readonly hasQuestions = computed(() => this.totalQuestions() > 0);

  readonly currentQuestion = computed<QuizQuestion | null>(() => {
    const list = this.filteredQuestions();
    const idx = this.currentQuestionIndex();
    return list[idx] ?? null;
  });

  readonly progressPercent = computed(() => {
    const total = this.totalQuestions();
    if (total === 0) return 0;
    return ((this.currentQuestionIndex() + 1) / total) * 100;
  });

  readonly canSubmit = computed(
    () => this.selectedOptionIndex() !== null && !this.isAnswerSubmitted()
  );

  readonly isLastQuestion = computed(
    () => this.currentQuestionIndex() >= this.totalQuestions() - 1
  );

  readonly scorePercentage = computed(() => {
    const total = this.totalQuestions();
    return total === 0 ? 0 : Math.round((this.score() / total) * 100);
  });

  readonly scoreLabel = computed(() => {
    const p = this.scorePercentage();
    if (p >= 80) {
      return '🔥 Excellent ! Vous avez des bases solides en acoustique et lutherie !';
    }
    if (p >= 50) {
      return '👍 Bon travail ! Quelques notions à revoir pour devenir un expert.';
    }
    return "🌱 Continuez d'apprendre ! L'acoustique est un domaine passionnant.";
  });

  readonly gradeEmoji = computed(() => {
    const p = this.scorePercentage();
    if (p === 100) return '🏆';
    if (p >= 80) return '🎓';
    if (p >= 50) return '🎸';
    return '📚';
  });

  /* ═══════════════════════════════════════════════════════
     HELPERS EXPOSÉS AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly letters = LETTERS;
  readonly getDifficultyClass = getDifficultyClass;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    this.resetQuiz();
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  filterByDifficulty(d: DifficultyFilter): void {
    if (this.selectedDifficulty() === d) return;
    this.selectedDifficulty.set(d);
    this.resetQuiz();
  }

  selectOption(index: number): void {
    if (this.isAnswerSubmitted()) return;
    this.selectedOptionIndex.set(index);
  }

  submitAnswer(): void {
    if (!this.canSubmit()) return;

    const question = this.currentQuestion();
    const selected = this.selectedOptionIndex();
    if (!question || selected === null) return;

    this.isAnswerSubmitted.set(true);

    const isCorrect = question.options[selected].isCorrect;

    if (isCorrect) {
      this.score.update((s) => s + 1);
      this.streak.update((s) => s + 1);
      this.bestStreak.update((b) => Math.max(b, this.streak()));
    } else {
      this.streak.set(0);
    }
  }

  nextQuestion(): void {
    if (!this.isLastQuestion()) {
      this.currentQuestionIndex.update((i) => i + 1);
      this.selectedOptionIndex.set(null);
      this.isAnswerSubmitted.set(false);
      return;
    }
    this.isCompleted.set(true);
  }

  resetQuiz(): void {
    this.currentQuestionIndex.set(0);
    this.score.set(0);
    this.selectedOptionIndex.set(null);
    this.isAnswerSubmitted.set(false);
    this.isCompleted.set(false);
    this.streak.set(0);
    this.bestStreak.set(0);
  }

}