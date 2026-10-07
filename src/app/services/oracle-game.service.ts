import {
  Injectable, signal, computed, inject, effect, DestroyRef,
} from '@angular/core';
import { AudioFxService } from './audio-fx.service';
import { ParticleService } from './particle.service';
import { VoiceService } from './voice.service';
import { STORAGE } from './storage.token';

import {
  DIMENSIONS,
  QUESTS,
  HINT_COST,
  XP_PER_LEVEL,
  MAX_ATTEMPTS_BEFORE_HINT,
  STORAGE_KEY_XP,
  STORAGE_KEY_QUEST_INDEX,
  STORAGE_KEY_COMPLETED,
  STORAGE_KEY_SOUND,
  STORAGE_KEY_ACHIEVEMENTS,
} from '../data/oracle-game.data';

import type {
  Dimension,
  Quest,
  Achievement,
  RecognitionError,
} from '../data/oracle-game.data';

export type {
  Dimension,
  Quest,
  Achievement,
  RecognitionError,
} from '../data/oracle-game.data';


@Injectable({ providedIn: 'root' })
export class OracleGameService {
  private readonly voice = inject(VoiceService);
  private readonly storage = inject(STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audio = inject(AudioFxService);
  readonly particles = inject(ParticleService);

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES
     ═══════════════════════════════════════════════════════ */
  readonly dimensions: readonly Dimension[] = DIMENSIONS;
  readonly quests: readonly Quest[] = QUESTS;
  readonly totalQuests = QUESTS.length;

  /* ═══════════════════════════════════════════════════════
     ÉTAT DU JEU
     ═══════════════════════════════════════════════════════ */
  readonly xp = signal<number>(0);
  readonly level = computed(() => Math.floor(this.xp() / XP_PER_LEVEL) + 1);
  readonly xpInLevel = computed(() => this.xp() % XP_PER_LEVEL);
  readonly xpProgress = computed(() => (this.xpInLevel() / XP_PER_LEVEL) * 100);

  readonly rankTitle = computed(() => {
    const lvl = this.level();
    if (lvl === 1) return 'Novice du Médiator';
    if (lvl === 2) return 'Apprenti Gratteur';
    if (lvl === 3) return 'Virtuose des Accordages';
    if (lvl === 4) return 'Maître des Arpèges';
    return 'Légende de la Six-Cordes';
  });

  readonly rankEmoji = computed(() => {
    const lvl = this.level();
    return ['🥉', '🥈', '🥇', '💎', '👑'][Math.min(lvl - 1, 4)];
  });

  readonly gameCompleted = signal<boolean>(false);
  readonly showSuccessFx = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly attempts = signal<number>(0);
  readonly streak = signal<number>(0);
  readonly totalCorrect = signal<number>(0);
  readonly showLevelUp = signal<boolean>(false);

  readonly oracleSpeech = signal<string>(
    "Salut ! Je suis Offowa, Gardienne des Sept Portails."
  );

  readonly currentQuestIndex = signal<number>(0);
  readonly unlockedAchievements = signal<string[]>([]);

  /* Ré-exposition des signaux vocaux (utilisés dans les templates) */
  readonly isSpeaking = this.voice.isSpeaking;
  readonly isListening = this.voice.isListening;
  readonly isSupported = this.voice.isSupported;
  readonly lastError = this.voice.lastError;

  readonly currentQuest = computed<Quest | null>(
    () => QUESTS[this.currentQuestIndex()] ?? null
  );

  readonly currentDimension = computed<Dimension | null>(() => {
    const quest = this.currentQuest();
    if (!quest) return null;
    return DIMENSIONS.find(d => d.id === quest.dimensionId) ?? null;
  });

  readonly completionPercent = computed(
    () => ((this.currentQuestIndex() + (this.gameCompleted() ? 1 : 0)) / this.totalQuests) * 100
  );

  /* ═══════════════════════════════════════════════════════
     SUCCÈS DÉBLOQUABLES
     ═══════════════════════════════════════════════════════ */
  readonly achievements = computed<Achievement[]>(() => {
    const unlocked = this.unlockedAchievements();
    return [
      { id: 'first_step', title: 'Premier Pas', description: 'Franchir le Premier Portail', icon: '🚪', unlocked: unlocked.includes('first_step') },
      { id: 'streak_3', title: 'Série Ardente', description: '3 bonnes réponses consécutives', icon: '🔥', unlocked: unlocked.includes('streak_3') },
      { id: 'streak_5', title: 'Feu Sacré', description: '5 bonnes réponses consécutives', icon: '⚡', unlocked: unlocked.includes('streak_5') },
      { id: 'no_hint', title: 'Sans Aide', description: 'Terminer sans utiliser d\'indice', icon: '🎯', unlocked: unlocked.includes('no_hint') },
      { id: 'half_way', title: 'Mi-Chemin', description: 'Atteindre la 4ème Dimension', icon: '🌗', unlocked: unlocked.includes('half_way') },
      { id: 'level_3', title: 'Virtuose', description: 'Atteindre le niveau 3', icon: '🎸', unlocked: unlocked.includes('level_3') },
      { id: 'offolomou', title: 'Offolomou', description: 'Traverser les 7 Dimensions', icon: '💎', unlocked: unlocked.includes('offolomou') }
    ];
  });

  readonly unlockedCount = computed(() => this.achievements().filter(a => a.unlocked).length);

  private lastAnnouncedQuestIndex = -1;

  constructor() {
    this.restoreFromStorage();
    this.registerPersistence();
    this.registerQuestAnnouncer();
  }

  /* ═══════════════════════════════════════════════════════
     ANNONCE VOCALE DE LA QUESTION
     ═══════════════════════════════════════════════════════ */
  private registerQuestAnnouncer(): void {
    effect(() => {
      const quest = this.currentQuest();
      const dimension = this.currentDimension();
      const completed = this.gameCompleted();
      const index = this.currentQuestIndex();

      if (completed || !quest || !dimension) return;
      if (index === this.lastAnnouncedQuestIndex) return;

      this.lastAnnouncedQuestIndex = index;

      setTimeout(async () => {
        if (this.voice.isSpeaking()) return;
        const intro =
          `Quête ${index + 1} sur ${this.totalQuests}. ` +
          `${dimension.name}, gardée par ${dimension.sage}, ${dimension.sageTitle}. ` +
          `${quest.description}`;
        await this.speak(intro);
      }, 500);
    });
  }

  /* ═══════════════════════════════════════════════════════
     AUDIO HELPERS
     ═══════════════════════════════════════════════════════ */
  playClick(): void { this.audio.play('click'); }
  playHover(): void { this.audio.play('hover'); }
  playTyping(): void { this.audio.play('typing'); }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    this.audio.setEnabled(next);
    if (this.storage) {
      try { this.storage.setItem(STORAGE_KEY_SOUND, String(next)); } catch {}
    }
    if (next) this.audio.play('click');
  }

  /* ═══════════════════════════════════════════════════════
     PERSISTANCE
     ═══════════════════════════════════════════════════════ */
  private restoreFromStorage(): void {
    if (!this.storage) return;
    try {
      const xpRaw = this.storage.getItem(STORAGE_KEY_XP);
      const idxRaw = this.storage.getItem(STORAGE_KEY_QUEST_INDEX);
      const doneRaw = this.storage.getItem(STORAGE_KEY_COMPLETED);
      const soundRaw = this.storage.getItem(STORAGE_KEY_SOUND);
      const achRaw = this.storage.getItem(STORAGE_KEY_ACHIEVEMENTS);

      if (xpRaw !== null) {
        const parsed = Number(xpRaw);
        if (Number.isFinite(parsed) && parsed >= 0) this.xp.set(parsed);
      }
      if (idxRaw !== null) {
        const idx = Number(idxRaw);
        if (Number.isInteger(idx) && idx >= 0 && idx < QUESTS.length) {
          this.currentQuestIndex.set(idx);
        }
      }
      if (doneRaw === 'true') this.gameCompleted.set(true);
      if (soundRaw === 'false') {
        this.soundEnabled.set(false);
        this.audio.setEnabled(false);
      }
      if (achRaw) {
        try {
          const arr = JSON.parse(achRaw);
          if (Array.isArray(arr)) this.unlockedAchievements.set(arr);
        } catch {}
      }
    } catch {}
  }

  private registerPersistence(): void {
    effect(() => {
      if (!this.storage) return;
      try {
        this.storage.setItem(STORAGE_KEY_XP, String(this.xp()));
        this.storage.setItem(STORAGE_KEY_QUEST_INDEX, String(this.currentQuestIndex()));
        this.storage.setItem(STORAGE_KEY_COMPLETED, String(this.gameCompleted()));
        this.storage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(this.unlockedAchievements()));
      } catch {}
    });
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTIONS
     ═══════════════════════════════════════════════════════ */
  startListening(): void {
    this.voice.listen({
      lang: 'fr-FR',
      onResult: (transcript) => this.processInput(transcript),
      onError: (error) => {
        const msg = this.voice.getErrorMessage(error);
        if (msg) this.speak(msg);
      },
    });
  }

  stopListening(): void {
    this.voice.stopListening();
  }

  repeatQuest(): void {
    const q = this.currentQuest();
    const d = this.currentDimension();
    if (q && d) {
      this.playClick();
      this.speak(`${d.sage}, ${d.sageTitle}, te dit : ${q.description}`);
    }
  }

  giveHint(): void {
    const q = this.currentQuest();
    if (!q || this.gameCompleted()) return;
    this.audio.play('hint');
    this.xp.update(v => Math.max(0, v - HINT_COST));
    this.speak(`Voici ton indice, offolandais : ${q.hint}`);
  }

  restartGame(): void {
    this.audio.play('start');
    this.xp.set(0);
    this.currentQuestIndex.set(0);
    this.gameCompleted.set(false);
    this.attempts.set(0);
    this.streak.set(0);
    this.totalCorrect.set(0);
    this.lastAnnouncedQuestIndex = -1;
    this.particles.clear();
    this.speak("Que l'aventure recommence ! Les Sept Portails s'ouvrent à nouveau devant toi.");
  }

  submitTextAnswer(text: string): void {
    if (!text.trim()) return;
    this.processInput(text);
  }

  private processInput(message: string): void {
    const normalized = this.normalize(message);

    if (/\b(recommencer|reset|rejouer)\b/.test(normalized)) {
      this.restartGame();
      return;
    }
    if (/\b(repete|repeter|encore)\b/.test(normalized)) {
      this.repeatQuest();
      return;
    }
    if (/\b(indice|aide)\b/.test(normalized)) {
      this.giveHint();
      return;
    }

    if (this.gameCompleted()) {
      this.speak("Tu as déjà traversé les Sept Dimensions ! Dis 'recommencer' pour revivre l'aventure.");
      return;
    }

    const quest = this.currentQuest();
    if (!quest) return;

    if (this.matchesAnswer(normalized, quest.acceptedAnswers)) {
      this.handleSuccess(quest);
    } else {
      this.handleFailure(message);
    }
  }

  /* ═══════════════════════════════════════════════════════
     GESTION DU SUCCÈS
     ═══════════════════════════════════════════════════════ */
  private handleSuccess(quest: Quest): void {
    const prevLevel = this.level();
    const dimension = DIMENSIONS.find(d => d.id === quest.dimensionId);

    this.showSuccessFx.set(true);
    this.audio.play('success');
    this.totalCorrect.update(v => v + 1);
    this.streak.update(v => v + 1);
    this.attempts.set(0);

    this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, {
      count: 50,
      emojis: dimension
        ? [dimension.totemEmoji, dimension.instrumentEmoji, '✨', '⭐', '🎵']
        : ['⭐', '✨', '🎵', '🎶', '💫'],
    });

    setTimeout(() => this.showSuccessFx.set(false), 1400);

    this.checkAchievements();

    const streakBonus = this.streak() >= 3 ? 20 : 0;
    const totalGain = quest.xpReward + streakBonus;

    this.xp.update(v => v + totalGain);

    const newLevel = this.level();
    if (newLevel > prevLevel) {
      setTimeout(() => {
        this.audio.play('levelUp');
        this.showLevelUp.set(true);
        this.particles.burst(window.innerWidth / 2, window.innerHeight / 3, {
          count: 80,
          emojis: ['🎉', '🏆', '👑', '💎', '🐉'],
        });
        setTimeout(() => this.showLevelUp.set(false), 2500);
      }, 800);
    }

    const isLast = this.currentQuestIndex() >= QUESTS.length - 1;

    if (isLast) {
      setTimeout(() => this.audio.play('victory'), 400);
      this.gameCompleted.set(true);
      this.unlockAchievement('offolomou');
      this.speak(
        `Extraordinaire, offolandais ! Tu as traversé les Sept Dimensions et découvert Offolomou, le Don de Dieu. +${totalGain} XP ! La musique unit les notes, l'amour unit les êtres, le Don de Dieu unit les dimensions.`
      );
    } else {
      this.currentQuestIndex.update(i => i + 1);
      const next = this.currentQuest();
      const nextDim = next ? DIMENSIONS.find(d => d.id === next.dimensionId) : null;
      const bonusTxt = streakBonus ? ` Bonus de série : +${streakBonus} XP !` : '';
      const dimensionTxt = dimension ? `${dimension.sage} hoche la tête. ` : '';
      const nextTxt =
        next && nextDim
          ? ` Nouvelle quête : ${nextDim.name}, gardée par ${nextDim.sage}, ${nextDim.sageTitle}. ${next.description}`
          : '';
      this.speak(
        `Excellente réponse ! ${dimensionTxt}Tu gagnes ${quest.xpReward} points d'expérience.${bonusTxt}${nextTxt}`
      );
    }
  }

  private checkAchievements(): void {
    if (this.currentQuestIndex() === 0 && !this.unlockedAchievements().includes('first_step')) {
      this.unlockAchievement('first_step');
    }
    if (this.streak() >= 3) this.unlockAchievement('streak_3');
    if (this.streak() >= 5) this.unlockAchievement('streak_5');
    if (this.currentQuestIndex() >= 3) this.unlockAchievement('half_way');
    if (this.level() >= 3) this.unlockAchievement('level_3');
  }

  private unlockAchievement(id: string): void {
    if (this.unlockedAchievements().includes(id)) return;
    this.unlockedAchievements.update(arr => [...arr, id]);
    this.audio.play('levelUp');
    const ach = this.achievements().find(a => a.id === id);
    if (ach) {
      this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, {
        count: 30,
        emojis: ['🏆', '⭐', '✨'],
      });
    }
  }

  private handleFailure(message: string): void {
    this.audio.play('error');
    this.streak.set(0);
    this.attempts.update(v => v + 1);

    const safe = message.length > 50 ? message.slice(0, 50) + '…' : message;
    let hint = '';
    if (this.attempts() >= MAX_ATTEMPTS_BEFORE_HINT) {
      hint = ' Besoin d\'un coup de pouce ? Dis "indice" !';
    }
    this.speak(
      `J'ai entendu "${safe}". Ce n'est pas encore la bonne vibration, offolandais. Tente à nouveau.${hint}`
    );
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private matchesAnswer(normalizedMessage: string, accepted: string[]): boolean {
    return accepted.some(ans => {
      const norm = this.normalize(ans);
      if (!norm) return false;
      const pattern = `(^|\\s)${this.escapeRegex(norm)}(\\s|$)`;
      return new RegExp(pattern).test(normalizedMessage);
    });
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ═══════════════════════════════════════════════════════
     API VOCALE (déléguée au VoiceService)
     ═══════════════════════════════════════════════════════ */
  async speak(text: string): Promise<void> {
    this.oracleSpeech.set(text);
    await this.voice.speak(text);
  }
}