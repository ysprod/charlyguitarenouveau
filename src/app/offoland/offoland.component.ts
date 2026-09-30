import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RevealDirective } from '../shared/reveal.directive';
import { CharlyguitaregameComponent } from '../univers/charlyguitaregame/charlyguitaregame.component';
import { PlayComponent } from '../game/play/play.component';
 
@Component({
  selector: 'app-offoland',
  standalone: true,
  imports: [
    CommonModule,
    RevealDirective,
    CharlyguitaregameComponent,
    PlayComponent
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss']
})
export class OffolandComponent {
  readonly particles = Array.from({ length: 24 }, (_, i) => i + 1);
}