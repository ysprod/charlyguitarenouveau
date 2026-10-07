import {
  Injectable, signal, inject, InjectionToken, DestroyRef,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */
export type RecognitionError =
  | 'not-allowed' | 'service-not-allowed' | 'no-speech'
  | 'audio-capture' | 'network' | 'aborted' | 'unknown';

export type MicrophonePermission =
  | 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MicrophoneDiagnostic {
  /** Le contexte est-il sécurisé (HTTPS ou localhost) ? */
  secureContext: boolean;
  /** API `navigator.mediaDevices.getUserMedia` disponible ? */
  hasMediaDevices: boolean;
  /** `SpeechRecognition` / `webkitSpeechRecognition` disponible ? */
  hasRecognitionApi: boolean;
  /** État de la permission micro. */
  permission: MicrophonePermission;
  /** Le micro est-il utilisable dans l'état actuel ? */
  usable: boolean;
  /** Message pédagogique à afficher à l'utilisateur. */
  userMessage: string;
}

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
  onResult: (transcript: string) => void;
  onError?: (error: RecognitionError) => void;
  onStart?: () => void;
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
   MESSAGES PAR DÉFAUT
   ═══════════════════════════════════════════════════════ */
const DEFAULT_ERROR_MESSAGES: Record<RecognitionError, string> = {
  'not-allowed': 'Autorise l\'accès au micro dans ton navigateur.',
  'service-not-allowed': 'Service vocal bloqué par le navigateur.',
  'no-speech': 'Je n\'ai rien entendu ! Parle un peu plus fort.',
  'audio-capture': 'Aucun micro n\'est détecté.',
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
     SYNTHÈSE VOCALE
     ═══════════════════════════════════════════════════════ */

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
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

  stopSpeaking(): void {
    try { this.synth?.cancel(); } catch {}
    this.isSpeaking.set(false);
  }

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
     RECONNAISSANCE VOCALE
     ═══════════════════════════════════════════════════════ */

  listen(options: ListenOptions): boolean {
    if (!this.recognition || this.isListening()) return false;

    this.stopSpeaking();
    this.lastError.set(null);
    this.currentOptions = options;

    if (options.lang) this.recognition.lang = options.lang;

    try {
      this.recognition.start();
      this.clearStartTimeout();

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

  stopListening(): void {
    try { this.recognition?.stop(); } catch {}
  }

  abortListening(): void {
    try { this.recognition?.abort(); } catch {}
  }

  getErrorMessage(error: RecognitionError): string {
    return DEFAULT_ERROR_MESSAGES[error] ?? '';
  }

  /* ═══════════════════════════════════════════════════════
     PERMISSION & DIAGNOSTIC MICRO
     ═══════════════════════════════════════════════════════ */

  async checkMicrophonePermission(): Promise<MicrophonePermission> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return 'unsupported';
    }

    try {
      const status = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return status.state as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'prompt';
    }
  }

  /**
   * Diagnostic complet du micro avec message pédagogique.
   */
  async diagnoseMicrophone(): Promise<MicrophoneDiagnostic> {
    const secureContext =
      typeof window !== 'undefined' && window.isSecureContext;

    const hasMediaDevices =
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

    const hasRecognitionApi = !!this.SpeechRecognitionCtor;

    const permission = await this.checkMicrophonePermission();

    const usable =
      secureContext &&
      hasMediaDevices &&
      hasRecognitionApi &&
      permission !== 'denied' &&
      permission !== 'unsupported';

    let userMessage = '';

    if (!secureContext) {
      userMessage =
        'Le micro nécessite une connexion sécurisée (HTTPS). ' +
        'Ouvre cette page en HTTPS pour utiliser la voix.';
    } else if (!hasRecognitionApi) {
      userMessage =
        'Ton navigateur ne supporte pas la reconnaissance vocale. ' +
        'Utilise la saisie texte ou change de navigateur (Chrome, Edge).';
    } else if (!hasMediaDevices) {
      userMessage =
        'L\'accès au micro est indisponible sur cet appareil. ' +
        'Utilise la saisie texte.';
    } else if (permission === 'denied') {
      userMessage =
        'Ton micro est bloqué. Autorise le micro pour ce site dans les ' +
        'réglages de ton navigateur (icône 🔒 dans la barre d\'adresse), ' +
        'puis recharge la page.';
    } else if (permission === 'prompt') {
      userMessage =
        'Appuie sur le bouton micro pour autoriser l\'accès. ' +
        'Une popup te demandera la permission.';
    } else {
      userMessage = 'Micro prêt — tu peux parler à Offowa.';
    }

    return {
      secureContext,
      hasMediaDevices,
      hasRecognitionApi,
      permission,
      usable,
      userMessage,
    };
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