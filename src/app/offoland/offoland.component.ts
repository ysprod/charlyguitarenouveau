import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../shared/reveal.directive';
import { CharlyguitaregameComponent } from '../univers/charlyguitaregame/charlyguitaregame.component';

@Component({
  selector: 'app-offoland',
  standalone: true,
  imports: [
    CommonModule,
    RevealDirective,
    CharlyguitaregameComponent,
    RouterLink
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss']
})
export class OffolandComponent { }