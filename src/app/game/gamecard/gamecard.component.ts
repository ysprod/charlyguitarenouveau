import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardData } from '../cardgame/CardData';


@Component({
  selector: 'app-gamecard',
     standalone: true,
  templateUrl: './gamecard.component.html',
  styleUrls: ['./gamecard.component.css'],
  animations: [
    trigger('cardFlip', [
      state('default', style({
        transform: 'perspective(1000px) rotateY(0deg)',
        opacity: 1
      })),
      state('flipped', style({
        transform: 'perspective(1000px) rotateY(180deg)',
        opacity: 1
      })),
      state('matched', style({
        transform: 'perspective(1000px) rotateY(180deg) scale(0)',
        opacity: 0,
        pointerEvents: 'none'
      })),

      // Transitions de retournement fluides avec easing personnalisé
      transition('default <=> flipped', [
        animate('450ms cubic-bezier(0.34, 1.56, 0.64, 1)')
      ]),

      // Animation WAHOU lors d'une paire trouvée (Matched)
      transition('* => matched', [
        animate('700ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
          style({ transform: 'perspective(1000px) rotateY(180deg) scale(1)', filter: 'brightness(1)', offset: 0 }),
          style({ transform: 'perspective(1000px) rotateY(180deg) scale(1.15)', filter: 'brightness(1.8) drop-shadow(0 0 25px #00f2fe)', offset: 0.4 }),
          style({ transform: 'perspective(1000px) rotateY(180deg) scale(0.9)', filter: 'brightness(1.5)', offset: 0.7 }),
          style({ transform: 'perspective(1000px) rotateY(360deg) scale(0)', opacity: 0, offset: 1 })
        ]))
      ])
    ])
  ]
})
export class GamecardComponent implements OnInit {

  @Input() data!: CardData;
  @Output() cardClicked = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void { }

  estvisible(): boolean {
    return this.data.state === 'flipped' || this.data.state === 'default';
  }

}