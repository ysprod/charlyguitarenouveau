import {
  Injectable, signal, inject, InjectionToken, DestroyRef,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */
export type RecognitionError =
  | 'not-allowed' | 'service-not-allowed' | 'no-speech'
  | 'audio-capture' | 'network' | 'aborted' | 'unknown';

export interface SpeakOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  /** Interrompt la lecture en cours. true par défaut. */
  interrupt?: boolean;
}

export interface ListenOptions {
  lang?: string;
  /** Callback unique pour le résultat (transcript). */
  onResult: (transcript: string) => void;
  /** Callback en cas d'erreur de reconnaissance. */
  onError?: (error: RecognitionError) => void;
  /** Callback quand l'écoute démarre. */
  onStart?: () => void;
  /** Callback quand l'écoute se termine. */
  onEnd?: () => void;
}

/* ═══════════════════════════════════════════════════════
   TOKENS D'INJECTION
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   MESSAGES D'ERREUR PAR DÉFAUT
   ═══════════════════════════════════════════════════════ */
const DEFAULT_ERROR_MESSAGES: Record<RecognitionError, string> = {
  'not-allowed': "Autorise l'accès au micro dans ton navigateur.",
  'service-not-allowed': 'Service vocal bloqué par le navigateur.',
  'no-speech': "Je n'ai rien entendu ! Parle un peu plus fort.",
  'audio-capture': "Aucun micro n'est détecté.",
  network: 'Problème de connexion au service vocal.',
  aborted: '',
  unknown: 'Une erreur vocale est survenue.',
};

/* ═══════════════════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════════════════ */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly synth = inject(SPEECH_SYNTHESIS);
  private readonly SpeechRecognitionCtor = inject(SPEECH_RECOGNITION_CTOR);
  private readonly destroyRef = inject(DestroyRef);

  /* État observable — utilisable dans les templates */
  readonly isSpeaking = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly isSupported = signal<boolean>(true);
  readonly lastError = signal<RecognitionError | null>(null);

  private recognition: any = null;
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentOptions: ListenOptions | null = null;

  constructor() {
    this.initRecognition();
    this.registerCleanup();
  }

  /* ═══════════════════════════════════════════════════════
     SYNTHÈSE VOCALE (parler)
     ═══════════════════════════════════════════════════════ */

  /**
   * Prononce un texte avec la voix de synthèse.
   * @param text Texte à prononcer
   * @param options Options de voix (lang, pitch, rate, volume, interrupt)
   * @returns Promise résolue à la fin de la lecture
   */
  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    // Capture locale : garantit le narrowing à travers la closure async
    const synth = this.synth;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.resolve();
    }

    const {
      lang = 'fr-FR',
      pitch = 1.0,
      rate = 1.0,
      volume = 1.0,
      interrupt = true,
    } = options;

    if (interrupt) {
      try { synth.cancel(); } catch {}
    }

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;

      utterance.onstart = () => this.isSpeaking.set(true);
      utterance.onend = () => {
        this.isSpeaking.set(false);
        resolve();
      };
      utterance.onerror = () => {
        this.isSpeaking.set(false);
        resolve();
      };

      try {
        synth.speak(utterance);
      } catch {
        this.isSpeaking.set(false);
        resolve();
      }
    });
  }

  /** Coupe immédiatement toute lecture en cours. */
  stopSpeaking(): void {
    try { this.synth?.cancel(); } catch {}
    this.isSpeaking.set(false);
  }

  /**
   * Retourne une promesse qui se résout dès que la voix a fini de parler
   * (ou immédiatement si elle ne parle pas).
   */
  waitForSpeechEnd(): Promise<void> {
    if (!this.isSpeaking()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const check = () => {
        if (!this.isSpeaking()) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  /* ═══════════════════════════════════════════════════════
     RECONNAISSANCE VOCALE (écouter)
     ═══════════════════════════════════════════════════════ */

  /**
   * Démarre l'écoute du micro.
   * @returns true si l'écoute a démarré, false sinon.
   */
  listen(options: ListenOptions): boolean {
    if (!this.recognition || this.isListening()) return false;

    this.stopSpeaking();
    this.lastError.set(null);
    this.currentOptions = options;

    // Config langue
    if (options.lang) this.recognition.lang = options.lang;

    try {
      this.recognition.start();
      this.clearStartTimeout();

      // Timeout de démarrage : si onStart n'est pas appelé en 3 s, on abort.
      this.startTimeoutId = setTimeout(() => {
        if (!this.isListening()) {
          try { this.recognition?.abort(); } catch {}
          this.lastError.set('unknown');
        }
      }, 3000);

      return true;
    } catch {
      this.isListening.set(false);
      return false;
    }
  }

  /** Arrête l'écoute en cours. */
  stopListening(): void {
    try { this.recognition?.stop(); } catch {}
  }

  /** Abandonne l'écoute en cours. */
  abortListening(): void {
    try { this.recognition?.abort(); } catch {}
  }

  /** Message par défaut associé à un code d'erreur. */
  getErrorMessage(error: RecognitionError): string {
    return DEFAULT_ERROR_MESSAGES[error] ?? '';
  }

  /* ═══════════════════════════════════════════════════════
     INTERNE
     ═══════════════════════════════════════════════════════ */
  private initRecognition(): void {
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
      this.currentOptions?.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
      this.clearStartTimeout();
      this.currentOptions?.onEnd?.();
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      this.currentOptions?.onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening.set(false);
      const error: RecognitionError = event?.error ?? 'unknown';
      this.lastError.set(error);
      this.currentOptions?.onError?.(error);
    };
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
}