import {
  Injectable, signal, computed, inject, effect, InjectionToken, DestroyRef,
} from '@angular/core';
import { AudioFxService } from './audio-fx.service';
import { ParticleService } from './particle.service';

export interface Dimension {
  id: number;
  name: string;
  color: string;
  colorHex: string;
  note: string;
  sage: string;
  sageTitle: string;
  totem: string;
  totemEmoji: string;
  instrument: string;
  instrumentEmoji: string;
  spirit: string;
  spiritTitle: string;
  spiritEmoji: string;
  gift: string;
  trial: string;
  question: string;
}

export interface Quest {
  id: string;
  dimensionId: number;
  title: string;
  description: string;
  acceptedAnswers: string[];
  xpReward: number;
  hint: string;
  icon: string;
  difficulty: 'facile' | 'moyen' | 'expert';
  lore: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export type RecognitionError =
  | 'not-allowed' | 'service-not-allowed' | 'no-speech'
  | 'audio-capture' | 'network' | 'aborted' | 'unknown';

export const SPEECH_SYNTHESIS = new InjectionToken<SpeechSynthesis | null>(
  'SPEECH_SYNTHESIS',
  { factory: () => (typeof window !== 'undefined' ? window.speechSynthesis : null) }
);

export const SPEECH_RECOGNITION_CTOR = new InjectionToken<any>(
  'SPEECH_RECOGNITION_CTOR',
  {
    factory: () => {
      if (typeof window === 'undefined') return null;
      return (window as any).SpeechRecognition
        || (window as any).webkitSpeechRecognition || null;
    },
  }
);

export const STORAGE = new InjectionToken<Storage | null>('STORAGE', {
  factory: () => (typeof window !== 'undefined' ? window.localStorage : null),
});

const STORAGE_KEY_XP = 'oracle_xp_v2';
const STORAGE_KEY_QUEST_INDEX = 'oracle_quest_index_v2';
const STORAGE_KEY_COMPLETED = 'oracle_completed_v2';
const STORAGE_KEY_SOUND = 'oracle_sound_v2';
const STORAGE_KEY_ACHIEVEMENTS = 'oracle_achievements_v2';
const HINT_COST = 10;
const XP_PER_LEVEL = 100;
const MAX_ATTEMPTS_BEFORE_HINT = 3;

@Injectable({ providedIn: 'root' })
export class OracleGameService {
  private readonly synth = inject(SPEECH_SYNTHESIS);
  private readonly SpeechRecognitionCtor = inject(SPEECH_RECOGNITION_CTOR);
  private readonly storage = inject(STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audio = inject(AudioFxService);
  readonly particles = inject(ParticleService);

  /* ═══════════════════════════════════════════════════════
     LES 7 DIMENSIONS D'OFFOLAND
     ═══════════════════════════════════════════════════════ */
  readonly dimensions: readonly Dimension[] = [
    {
      id: 1,
      name: 'Dimension Blanche',
      color: 'Blanc',
      colorHex: '#FFFFFF',
      note: 'Do',
      sage: 'Offodo',
      sageTitle: 'Gardien du Commencement',
      totem: 'Éléphant Blanc',
      totemEmoji: '🐘',
      instrument: 'Tambour sacré',
      instrumentEmoji: '🥁',
      spirit: 'Leustanné',
      spiritTitle: 'Gardien du Voile Blanc',
      spiritEmoji: '👻',
      gift: 'La mémoire et l\'origine',
      trial: 'Qui es-tu vraiment ?',
      question: 'Accepter de se présenter sans masque'
    },
    {
      id: 2,
      name: 'Dimension Rouge',
      color: 'Rouge',
      colorHex: '#DC2626',
      note: 'Ré',
      sage: 'Offoré',
      sageTitle: 'Gardien du Courage',
      totem: 'Lion Rouge',
      totemEmoji: '🦁',
      instrument: 'Djembé',
      instrumentEmoji: '🪘',
      spirit: 'Houssou',
      spiritTitle: 'Dévoreur Rouge',
      spiritEmoji: '👹',
      gift: 'Le courage et la maîtrise',
      trial: 'Que fais-tu de ta force ?',
      question: 'Transformer la force en protection'
    },
    {
      id: 3,
      name: 'Dimension Verte',
      color: 'Vert',
      colorHex: '#10B981',
      note: 'Mi',
      sage: 'Offomi',
      sageTitle: 'Gardien de la Vie',
      totem: 'Gazelle Verte',
      totemEmoji: '🦌',
      instrument: 'Balafon',
      instrumentEmoji: '🎵',
      spirit: 'Klin',
      spiritTitle: 'La Dame aux Mille Voix',
      spiritEmoji: '🧜‍♀️',
      gift: 'L\'amour et la compassion',
      trial: 'Qu\'aimes-tu au point de le protéger ?',
      question: 'Choisir la fidélité et la responsabilité'
    },
    {
      id: 4,
      name: 'Dimension Bleue',
      color: 'Bleu',
      colorHex: '#3B82F6',
      note: 'Fa',
      sage: 'Offofa',
      sageTitle: 'Gardien de la Connaissance',
      totem: 'Aigle Bleu',
      totemEmoji: '🦅',
      instrument: 'Flûte sacrée',
      instrumentEmoji: '🪈',
      spirit: 'Yayus',
      spiritTitle: 'Maître des Énigmes',
      spiritEmoji: '🌀',
      gift: 'La connaissance et l\'écoute',
      trial: 'Que cherches-tu à comprendre ?',
      question: 'Écouter avant de parler'
    },
    {
      id: 5,
      name: 'Dimension Noire',
      color: 'Noir',
      colorHex: '#1F2937',
      note: 'Sol',
      sage: 'Offosol',
      sageTitle: 'Gardien de l\'Épreuve',
      totem: 'Panthère Noire',
      totemEmoji: '🐆',
      instrument: 'Guitare sacrée',
      instrumentEmoji: '🎸',
      spirit: 'Skardah',
      spiritTitle: 'Serpent des Abîmes',
      spiritEmoji: '🐍',
      gift: 'La persévérance',
      trial: 'Que fais-tu quand tout semble perdu ?',
      question: 'Avancer malgré les ténèbres'
    },
    {
      id: 6,
      name: 'Dimension Pourpre',
      color: 'Pourpre',
      colorHex: '#9333EA',
      note: 'La',
      sage: 'Offola',
      sageTitle: 'Gardien de la Vision',
      totem: 'Caméléon Pourpre',
      totemEmoji: '🦎',
      instrument: 'Kora',
      instrumentEmoji: '🎼',
      spirit: 'Le Caméléon du Néant',
      spiritTitle: 'Le Caméléon du Néant',
      spiritEmoji: '🌫️',
      gift: 'La vision et le discernement',
      trial: 'Sais-tu reconnaître l\'illusion ?',
      question: 'Distinguer la vérité des apparences'
    },
    {
      id: 7,
      name: 'Dimension Violette',
      color: 'Violet',
      colorHex: '#7C3AED',
      note: 'Si',
      sage: 'Offosi',
      sageTitle: 'Gardien de la Destinée',
      totem: 'Dragon Violet',
      totemEmoji: '🐉',
      instrument: 'Harpe sacrée',
      instrumentEmoji: '🎻',
      spirit: 'L\'Hologramme Organique',
      spiritTitle: 'Dévoreur des Destinées',
      spiritEmoji: '💠',
      gift: 'L\'accomplissement',
      trial: 'Es-tu prêt à accepter ta destinée ?',
      question: 'Embrasser pleinement son don'
    }
  ];

  /* ═══════════════════════════════════════════════════════
     LES 7 QUÊTES (une par dimension)
     ═══════════════════════════════════════════════════════ */
  private readonly _quests: readonly Quest[] = [
    {
      id: 'quest_1',
      dimensionId: 1,
      title: 'Le Premier Battement',
      description: 'Avant toute musique, il y eut un rythme. Quelle est la première note de la Création, celle qui ouvre le Premier Temple ?',
      acceptedAnswers: ['do', 'la note do', 'c', 'le do'],
      xpReward: 50,
      hint: 'C\'est la note qui commence la gamme, celle de l\'aube et de la mémoire.',
      icon: '🥁',
      difficulty: 'facile',
      lore: '« Celui qui cherche le pouvoir se perdra. Celui qui cherche la vérité avancera. »'
    },
    {
      id: 'quest_2',
      dimensionId: 2,
      title: 'Le Cercle de Flammes',
      description: 'Pour franchir le Portail du Courage, tu dois traverser un cercle de flammes. Quelle est la quinte juste de Do, qui donne la force d\'avancer ?',
      acceptedAnswers: ['sol', 'g', 'la quinte de do', 'sol juste'],
      xpReward: 60,
      hint: 'Compte 7 demi-tons depuis Do : Do → Do# → Ré → Ré# → Mi → Fa → Fa# → Sol.',
      icon: '🔥',
      difficulty: 'moyen',
      lore: '« Le courage consiste d\'abord à vaincre ses propres peurs. » — Offoré'
    },
    {
      id: 'quest_3',
      dimensionId: 3,
      title: 'Le Chant de la Vie',
      description: 'Offomi joue du balafon pour apaiser les conflits. Quelle note représente la Vie dans la Dimension Verte ?',
      acceptedAnswers: ['mi', 'e', 'la note mi', 'mi naturel'],
      xpReward: 60,
      hint: 'C\'est la troisième note de la gamme, celle de l\'amour et de la compassion.',
      icon: '💚',
      difficulty: 'facile',
      lore: '« L\'amour véritable est un choix quotidien. » — Offomi'
    },
    {
      id: 'quest_4',
      dimensionId: 4,
      title: 'Le Silence de la Flûte',
      description: 'Dans la Dimension Bleue, le silence enseigne autant que les paroles. Quelle note porte la Connaissance ?',
      acceptedAnswers: ['fa', 'f', 'la note fa'],
      xpReward: 70,
      hint: 'C\'est la quarte juste de Do, la note qui invite à écouter avant de parler.',
      icon: '💙',
      difficulty: 'moyen',
      lore: '« La parole juste naît du silence écouté. » — Offofa'
    },
    {
      id: 'quest_5',
      dimensionId: 5,
      title: 'La Nuit Sans Étoiles',
      description: 'Offosol joue de la guitare sacrée dans les ténèbres. Quelle note soutient le voyageur dans l\'Épreuve ?',
      acceptedAnswers: ['sol', 'g', 'la note sol'],
      xpReward: 80,
      hint: 'C\'est la même note que la quinte juste de Do — celle de la Dimension Noire.',
      icon: '🖤',
      difficulty: 'moyen',
      lore: '« Les plus grandes victoires naissent des plus grandes difficultés. » — Offosol'
    },
    {
      id: 'quest_6',
      dimensionId: 6,
      title: 'Le Miroir des Illusions',
      description: 'Le Caméléon du Néant prend toutes les formes. Quelle note aide à discerner la vérité de l\'illusion ?',
      acceptedAnswers: ['la', 'a', 'la note la'],
      xpReward: 80,
      hint: 'C\'est la sixième note de la gamme, celle de la Vision et de la kora.',
      icon: '💜',
      difficulty: 'expert',
      lore: '« Seule demeure la vérité. » — Offola'
    },
    {
      id: 'quest_7',
      dimensionId: 7,
      title: 'Le Don Révélé',
      description: 'Devant le dernier portail, Offosi pose une seule question. Quelle est la septième note, celle de l\'Accomplissement ?',
      acceptedAnswers: ['si', 'b', 'la note si'],
      xpReward: 100,
      hint: 'C\'est la note qui mène à Offolomou, le Don de Dieu révélé.',
      icon: '💎',
      difficulty: 'expert',
      lore: '« La destinée ne se reçoit pas ; elle se construit pas à pas. » — Offosi'
    }
  ];

  readonly quests: readonly Quest[] = this._quests;
  readonly totalQuests = this._quests.length;

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

  readonly isListening = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly gameCompleted = signal<boolean>(false);
  readonly isSupported = signal<boolean>(true);
  readonly lastError = signal<RecognitionError | null>(null);
  readonly showSuccessFx = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly attempts = signal<number>(0);
  readonly streak = signal<number>(0);
  readonly totalCorrect = signal<number>(0);
  readonly showLevelUp = signal<boolean>(false);

  readonly oracleSpeech = signal<string>(
    "Salutations, voyageur. Je suis Offowa, Gardienne des Sept Portails. Sept Temples t'attendent, sept notes à découvrir. Chaque épreuve révèlera une partie de toi-même. Es-tu prêt à entendre la Mélodie des Origines ?"
  );

  readonly currentQuestIndex = signal<number>(0);
  readonly unlockedAchievements = signal<string[]>([]);

  readonly currentQuest = computed<Quest | null>(
    () => this._quests[this.currentQuestIndex()] ?? null
  );

  readonly currentDimension = computed<Dimension | null>(() => {
    const quest = this.currentQuest();
    if (!quest) return null;
    return this.dimensions.find(d => d.id === quest.dimensionId) ?? null;
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

  private recognition: any = null;
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restoreFromStorage();
    this.initSpeechRecognition();
    this.registerPersistence();
    this.registerCleanup();
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
        if (Number.isInteger(idx) && idx >= 0 && idx < this._quests.length) {
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
     SPEECH RECOGNITION
     ═══════════════════════════════════════════════════════ */
  private initSpeechRecognition(): void {
    if (!this.SpeechRecognitionCtor) {
      this.isSupported.set(false);
      return;
    }
    this.recognition = new this.SpeechRecognitionCtor();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening.set(true);
      this.lastError.set(null);
      this.audio.play('micOn');
    };
    this.recognition.onend = () => {
      this.isListening.set(false);
      this.audio.play('micOff');
      this.clearStartTimeout();
    };
    this.recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      this.processInput(transcript);
    };
    this.recognition.onerror = (event: any) => {
      this.isListening.set(false);
      const error: RecognitionError = event?.error ?? 'unknown';
      this.lastError.set(error);
      const msg = this.getErrorMessage(error);
      if (msg) this.speak(msg);
    };
  }

  private getErrorMessage(error: RecognitionError): string {
    const messages: Record<RecognitionError, string> = {
      'not-allowed': "Autorise l'accès au micro dans ton navigateur.",
      'service-not-allowed': 'Service vocal bloqué par le navigateur.',
      'no-speech': "Je n'ai rien entendu ! Parle un peu plus fort.",
      'audio-capture': "Aucun micro n'est détecté.",
      network: 'Problème de connexion au service vocal.',
      aborted: '',
      unknown: 'Une erreur vocale est survenue.',
    };
    return messages[error];
  }

  private registerCleanup(): void {
    this.destroyRef.onDestroy(() => {
      this.clearStartTimeout();
      try { this.recognition?.abort?.(); } catch {}
      try { this.synth?.cancel(); } catch {}
    });
  }

  private clearStartTimeout(): void {
    if (this.startTimeoutId !== null) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTIONS
     ═══════════════════════════════════════════════════════ */
  startListening(): void {
    if (!this.recognition || this.isListening()) return;
    this.synth?.cancel();
    this.isSpeaking.set(false);
    this.lastError.set(null);
    try {
      this.recognition.start();
      this.clearStartTimeout();
      this.startTimeoutId = setTimeout(() => {
        if (!this.isListening()) {
          try { this.recognition.abort(); } catch {}
          this.lastError.set('unknown');
        }
      }, 3000);
    } catch {
      this.isListening.set(false);
    }
  }

  stopListening(): void {
    try { this.recognition?.stop(); } catch {}
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
    this.unlockedAchievements.update(arr =>
      arr.includes('no_hint') ? arr : arr  // pas de blocage, juste un flag
    );
    this.speak(`Voici ton indice, voyageur : ${q.hint}`);
  }

  restartGame(): void {
    this.audio.play('start');
    this.xp.set(0);
    this.currentQuestIndex.set(0);
    this.gameCompleted.set(false);
    this.lastError.set(null);
    this.attempts.set(0);
    this.streak.set(0);
    this.totalCorrect.set(0);
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
    const dimension = this.dimensions.find(d => d.id === quest.dimensionId);

    this.showSuccessFx.set(true);
    this.audio.play('success');
    this.totalCorrect.update(v => v + 1);
    this.streak.update(v => v + 1);
    this.attempts.set(0);

    // Particules avec emojis de la dimension
    this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, {
      count: 50,
      emojis: dimension
        ? [dimension.totemEmoji, dimension.instrumentEmoji, '✨', '⭐', '🎵']
        : ['⭐', '✨', '🎵', '🎶', '💫'],
    });

    setTimeout(() => this.showSuccessFx.set(false), 1400);

    // Débloquer succès
    this.checkAchievements();

    // Bonus de streak
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

    const isLast = this.currentQuestIndex() >= this._quests.length - 1;

    if (isLast) {
      setTimeout(() => this.audio.play('victory'), 400);
      this.gameCompleted.set(true);
      this.unlockAchievement('offolomou');
      this.speak(
        `Extraordinaire, voyageur ! Tu as traversé les Sept Dimensions et découvert Offolomou, le Don de Dieu. +${totalGain} XP ! La musique unit les notes, l'amour unit les êtres, le Don de Dieu unit les dimensions.`
      );
    } else {
      this.currentQuestIndex.update(i => i + 1);
      const next = this.currentQuest();
      const nextDim = next ? this.dimensions.find(d => d.id === next.dimensionId) : null;
      const bonusTxt = streakBonus ? ` Bonus de série : +${streakBonus} XP !` : '';
      const dimensionTxt = dimension ? `${dimension.sage} hoche la tête. ` : '';
      const nextTxt = nextDim ? `Prochain portail : ${nextDim.name}, gardé par ${nextDim.sage}.` : '';
      this.speak(
        `Excellente réponse ! ${dimensionTxt}Tu gagnes ${quest.xpReward} points d'expérience.${bonusTxt} ${nextTxt}`
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
      `J'ai entendu "${safe}". Ce n'est pas encore la bonne vibration, voyageur. Tente à nouveau.${hint}`
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

  speak(text: string): void {
    this.oracleSpeech.set(text);
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    try { this.synth.cancel(); } catch {}
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);
    try { this.synth.speak(utterance); } catch { this.isSpeaking.set(false); }
  }
}