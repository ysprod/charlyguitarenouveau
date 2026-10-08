import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizQuestion, QuizState, Difficulty } from '../../models/acoustic-quiz.model';
import { ACOUSTIC_QUESTIONS } from 'src/app/data/acoustic-questions';
 
/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
type DifficultyFilter = Difficulty | 'Toutes';

const LETTERS = ['A', 'B', 'C', 'D'];

@Component({
  selector: 'app-acoustic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acoustic.component.html',
  styleUrls: ['./acoustic.component.scss']
})
export class AcousticComponent implements OnInit {

  private readonly router = inject(Router);

  /* ─── Données (importées depuis le fichier séparé) ─── */
  readonly questions: QuizQuestion[] = ACOUSTIC_QUESTIONS;

  /* ─── Filtres ─── */
  readonly difficulties: DifficultyFilter[] = ['Toutes', 'Facile', 'Intermédiaire', 'Expert'];
  readonly selectedDifficulty = signal<DifficultyFilter>('Toutes');

  /* ─── État du quiz (signals) ─── */
  readonly currentQuestionIndex = signal(0);
  readonly score = signal(0);
  readonly selectedOptionIndex = signal<number | null>(null);
  readonly isAnswerSubmitted = signal(false);
  readonly isCompleted = signal(false);
  readonly streak = signal(0);
  readonly bestStreak = signal(0);

  /* ─── Computed ─── */
  readonly filteredQuestions = computed(() => {
    const filter = this.selectedDifficulty();
    return filter === 'Toutes'
      ? this.questions
      : this.questions.filter(q => q.difficulty === filter);
  });

  readonly totalQuestions = computed(() => this.filteredQuestions().length);

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

  readonly canSubmit = computed(() =>
    this.selectedOptionIndex() !== null && !this.isAnswerSubmitted()
  );

  readonly isLastQuestion = computed(() =>
    this.currentQuestionIndex() >= this.totalQuestions() - 1
  );

  readonly scorePercentage = computed(() => {
    const total = this.totalQuestions();
    return total === 0 ? 0 : Math.round((this.score() / total) * 100);
  });

  readonly scoreLabel = computed(() => {
    const p = this.scorePercentage();
    if (p >= 80) return '🔥 Excellent ! Vous avez des bases solides en acoustique et lutherie !';
    if (p >= 50) return '👍 Bon travail ! Quelques notions à revoir pour devenir un expert.';
    return '🌱 Continuez d\'apprendre ! L\'acoustique est un domaine passionnant.';
  });

  readonly gradeEmoji = computed(() => {
    const p = this.scorePercentage();
    if (p === 100) return '🏆';
    if (p >= 80)  return '🎓';
    if (p >= 50)  return '🎸';
    return '📚';
  });

  /* ─── Helpers exposés au template ─── */
  readonly letters = LETTERS;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.resetQuiz();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */
  filterByDifficulty(d: DifficultyFilter): void {
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
      this.score.update(s => s + 1);
      this.streak.update(s => s + 1);
      this.bestStreak.update(b => Math.max(b, this.streak()));
    } else {
      this.streak.set(0);
    }
  }

  nextQuestion(): void {
    if (!this.isLastQuestion()) {
      this.currentQuestionIndex.update(i => i + 1);
      this.selectedOptionIndex.set(null);
      this.isAnswerSubmitted.set(false);
    } else {
      this.isCompleted.set(true);
    }
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

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */
  goToPlay(): void {
    this.router.navigate(['/play']);
  }
}