import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardData } from '../CardData';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gamecard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './gamecard.component.html',
  styleUrls: ['./gamecard.component.css'],
  animations: [
    trigger('cardFlip', [
      state('default', style({
        transform: 'perspective(1200px) rotateY(0deg)',
        opacity: 1
      })),
      state('flipped', style({
        transform: 'perspective(1200px) rotateY(180deg)',
        opacity: 1
      })),
      state('matched', style({
        transform: 'perspective(1200px) rotateY(180deg) scale(0)',
        opacity: 0,
        pointerEvents: 'none'
      })),

      // Retournement fluide avec rebond
      transition('default <=> flipped', [
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)')
      ]),

      // Animation WAHOU lors d'une paire trouvée
      transition('* => matched', [
        animate('800ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
          style({ transform: 'perspective(1200px) rotateY(180deg) scale(1)', filter: 'brightness(1)', offset: 0 }),
          style({ transform: 'perspective(1200px) rotateY(200deg) scale(1.2)', filter: 'brightness(1.9) drop-shadow(0 0 30px #00f2fe)', offset: 0.4 }),
          style({ transform: 'perspective(1200px) rotateY(280deg) scale(0.95)', filter: 'brightness(1.5)', offset: 0.7 }),
          style({ transform: 'perspective(1200px) rotateY(360deg) scale(0)', opacity: 0, offset: 1 })
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