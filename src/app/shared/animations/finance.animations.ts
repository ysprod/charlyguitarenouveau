import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger,
  keyframes,
  state
} from '@angular/animations';

export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(40px)' }),
    animate('700ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const staggerCards = trigger('staggerCards', [
  transition(':enter', [
    query('.finance-card', [
      style({ opacity: 0, transform: 'translateY(60px) scale(0.95)' }),
      stagger(120, [
        animate('800ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ], { optional: true })
  ])
]);

export const pulseGlow = trigger('pulseGlow', [
  state('idle', style({ boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.4)' })),
  state('active', style({ boxShadow: '0 0 40px 10px rgba(255, 215, 0, 0.6)' })),
  transition('idle <=> active', animate('1200ms ease-in-out'))
]);

export const floatingCoin = trigger('floatingCoin', [
  transition(':enter', [
    animate('3000ms ease-in-out', keyframes([
      style({ transform: 'translateY(0) rotate(0deg)', offset: 0 }),
      style({ transform: 'translateY(-20px) rotate(180deg)', offset: 0.5 }),
      style({ transform: 'translateY(0) rotate(360deg)', offset: 1 })
    ]))
  ])
]);

export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-60px)' }),
    animate('700ms 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'translateX(0)' }))
  ])
]);

export const rotateIn = trigger('rotateIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'rotate(-15deg) scale(0.8)' }),
    animate('900ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'rotate(0) scale(1)' }))
  ])
]);