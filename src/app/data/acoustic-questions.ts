import { QuizQuestion } from "../models/acoustic-quiz.model";

 
/**
 * Catalogue complet des questions du Quiz Acoustique & Lutherie.
 * Regroupe : physique des cordes, lutherie, résonance, psychoacoustique.
 */
export const ACOUSTIC_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    category: 'Physique des cordes',
    difficulty: 'Facile',
    title: 'Longueur de corde & Hauteur de note',
    question:
      'Que se passe-t-il pour la fréquence de vibration lorsqu’on divise par deux la longueur vibrante d’une corde (ex : fret à la 12ème case) ?',
    options: [
      {
        label: 'Elle est divisée par deux (note une octave plus basse)',
        isCorrect: false,
        explanation: 'Réduire la longueur augmente la fréquence, elle ne peut pas diminuer.'
      },
      {
        label: 'Elle reste identique',
        isCorrect: false,
        explanation: 'La longueur influe directement sur la fréquence de vibration.'
      },
      {
        label: 'Elle est doublée (note une octave plus haute)',
        isCorrect: true,
        explanation: 'Exact ! Selon la loi de Mersenne, la fréquence est inversement proportionnelle à la longueur vibrante.'
      },
      {
        label: 'Elle augmente d’une quinte exacte',
        isCorrect: false,
        explanation: 'Une quinte correspond à un rapport de 2/3, pas de 1/2.'
      }
    ],
    funFact: 'La 12ème frette marque exactement la moitié de la longueur du diapason : c’est pourquoi elle sonne une octave au-dessus de la corde à vide.'
  },
  {
    id: 2,
    category: 'Bois & Lutherie',
    difficulty: 'Facile',
    title: 'Table d’harmonie',
    question:
      'Quel bois est le plus fréquemment utilisé pour la table d’harmonie des guitares acoustiques en raison de son rapport rigidité/poids optimal ?',
    options: [
      {
        label: 'Le Palissandre (Rosewood)',
        isCorrect: false,
        explanation: 'Le palissandre est dense, très utilisé pour le dos, les éclisses et la touche.'
      },
      {
        label: 'L’Épicéa (Spruce)',
        isCorrect: true,
        explanation: 'Bravo ! L’épicéa offre une excellente résonance dynamique grâce à sa légèreté et sa rigidité axiale.'
      },
      {
        label: 'L’Ébène (Ebony)',
        isCorrect: false,
        explanation: 'L’ébène est un bois très lourd, réservé aux touches et chevalets.'
      },
      {
        label: 'L’Érable (Maple)',
        isCorrect: false,
        explanation: 'L’érable est dense et réfléchissant, souvent réservé au manche ou au dos/éclisses.'
      }
    ],
    funFact: 'Les tables en épicéa de Sitka ou d’Engelmann sont prisées pour leur "ouverture" sonore qui s’améliore avec les années de jeu.'
  },
  {
    id: 3,
    category: 'Résonance',
    difficulty: 'Intermédiaire',
    title: 'Fréquence de Helmholtz',
    question:
      'Comment appelle-t-on le phénomène acoustique de résonance de l’air à l’intérieur de la caisse d’une guitare à travers la rosace ?',
    options: [
      {
        label: 'Effet Larsen',
        isCorrect: false,
        explanation: 'Le Larsen est une boucle de rétroaction entre un micro et un haut-parleur.'
      },
      {
        label: 'Résonance de Helmholtz',
        isCorrect: true,
        explanation: 'Exact ! C’est le même principe acoustique que lorsqu’on souffle sur le goulot d’une bouteille.'
      },
      {
        label: 'Effet Doppler',
        isCorrect: false,
        explanation: 'L’effet Doppler concerne le décalage de fréquence lié au mouvement de la source.'
      },
      {
        label: 'Onde stationnaire transversale',
        isCorrect: false,
        explanation: 'Ce terme s’applique à la corde en vibration, pas au volume d’air interne.'
      }
    ],
    funFact: 'Sur une guitare acoustique typique, la résonance de Helmholtz se situe autour de 100–110 Hz (proche d’un La grave).'
  },
  {
    id: 4,
    category: 'Électro-acoustique',
    difficulty: 'Intermédiaire',
    title: 'Capteur Piézoélectrique',
    question:
      'Comment un capteur piézoélectrique placé sous le sillet de chevalet capte-t-il le son de la guitare ?',
    options: [
      {
        label: 'Par variation d’un champ magnétique',
        isCorrect: false,
        explanation: 'C’est le principe des micros magnétiques pour guitare électrique.'
      },
      {
        label: 'Par détection optique de la vibration',
        isCorrect: false,
        explanation: 'Les capteurs optiques sont rares et fonctionnent avec de la lumière infrarouge.'
      },
      {
        label: 'Par conversion des variations de pression mécanique en signal électrique',
        isCorrect: true,
        explanation: 'Parfait ! Le cristal piézoélectrique génère une tension lorsqu’il subit une contrainte mécanique.'
      },
      {
        label: 'En captant les ondes sonores dans l’air intérieur',
        isCorrect: false,
        explanation: 'C’est le rôle d’un micro aérien (condensateur), pas d’un piezo.'
      }
    ],
    funFact: 'Les capteurs piézo sont aussi utilisés dans les allume-gaz, les montres à quartz… et certains micros de contact.'
  },
  {
    id: 5,
    category: 'Harmoniques',
    difficulty: 'Intermédiaire',
    title: 'Harmoniques naturelles',
    question:
      'À quelle position doit-on effleurer une corde pour obtenir l’harmonique naturelle une octave au-dessus de la fondamentale ?',
    options: [
      {
        label: 'À la 5ème frette',
        isCorrect: false,
        explanation: 'La 5ème frette donne une harmonique à la quarte (2 octaves + quinte).'
      },
      {
        label: 'À la 7ème frette',
        isCorrect: false,
        explanation: 'La 7ème frette donne une harmonique à la quinte (1 octave + quinte).'
      },
      {
        label: 'À la 12ème frette',
        isCorrect: true,
        explanation: 'Exact ! Au nœud de vibration à mi-corde, la fréquence double : c’est l’octave.'
      },
      {
        label: 'À la 19ème frette',
        isCorrect: false,
        explanation: 'La 19ème frette donne une harmonique à la douzième (2 octaves + quinte).'
      }
    ],
    funFact: 'Les harmoniques naturelles suivent la série harmonique : octave (12), quinte (7), double octave (5), tierce majeure (4/9)...'
  },
  {
    id: 6,
    category: 'Psychoacoustique',
    difficulty: 'Expert',
    title: 'Timbre & Formants',
    question:
      'Qu’est-ce qui distingue principalement le timbre d’une guitare classique de celui d’une guitare folk, à note égale ?',
    options: [
      {
        label: 'La hauteur fondamentale de la note',
        isCorrect: false,
        explanation: 'La hauteur dépend de la fréquence fondamentale, identique si la note est la même.'
      },
      {
        label: 'La répartition et l’amplitude des harmoniques (formants)',
        isCorrect: true,
        explanation: 'Exact ! Le timbre est déterminé par le contenu harmonique et les résonances propres de l’instrument.'
      },
      {
        label: 'Le volume sonore uniquement',
        isCorrect: false,
        explanation: 'Le volume est une intensité perçue, pas le timbre.'
      },
      {
        label: 'La durée de la note',
        isCorrect: false,
        explanation: 'La durée est une enveloppe temporelle, pas le timbre.'
      }
    ],
    funFact: 'Les cordes en nylon et la caisse plus petite de la classique favorisent des harmoniques plus douces que l’acier d’une folk.'
  },
  {
    id: 7,
    category: 'Lutherie',
    difficulty: 'Expert',
    title: 'Barrage en X',
    question:
      'Quel est le rôle principal du barrage en X sur la table d’harmonie d’une guitare acoustique ?',
    options: [
      {
        label: 'Amplifier les basses fréquences',
        isCorrect: false,
        explanation: 'Le barrage ne génère pas de son : il structure la table.'
      },
      {
        label: 'Renforcer la table tout en répartissant les vibrations',
        isCorrect: true,
        explanation: 'Bravo ! Le barrage en X rigidifie la table et guide la propagation des ondes pour équilibrer les graves et les aigus.'
      },
      {
        label: 'Empêcher le chevalet de se décoller',
        isCorrect: false,
        explanation: 'Le chevalet est collé et maintenu par la pression des cordes, pas par le barrage.'
      },
      {
        label: 'Servir de guide pour les cordes',
        isCorrect: false,
        explanation: 'Les cordes passent sur le sillet et le chevalet, pas sur le barrage.'
      }
    ],
    funFact: 'Le barrage en X a été popularisé par Martin au XIXᵉ siècle et reste la référence sur la majorité des acoustiques.'
  },
  {
    id: 8,
    category: 'Physique',
    difficulty: 'Expert',
    title: 'Inharmonicité des cordes',
    question:
      'Pourquoi les harmoniques d’une corde réelle sont-elles légèrement plus aiguës que les multiples exacts de la fondamentale ?',
    options: [
      {
        label: 'À cause de la tension qui varie avec l’amplitude',
        isCorrect: false,
        explanation: 'La tension variable joue un rôle, mais l’inharmonicité vient surtout de la raideur.'
      },
      {
        label: 'À cause de la raideur de la corde (inharmonicité)',
        isCorrect: true,
        explanation: 'Exact ! La raideur de la corde ajoute une composante élastique qui décale les harmoniques vers le haut.'
      },
      {
        label: 'À cause de la rosace',
        isCorrect: false,
        explanation: 'La rosace influence la résonance de la caisse, pas les harmoniques de la corde.'
      },
      {
        label: 'À cause de la température ambiante',
        isCorrect: false,
        explanation: 'La température modifie légèrement la tension, mais pas l’inharmonicité.'
      }
    ],
    funFact: 'C’est cette inharmonicité qui donne aux pianos leur accord "stretched" : on accorde les octaves légèrement plus larges.'
  }
];