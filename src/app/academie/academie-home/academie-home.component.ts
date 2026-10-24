// src/app/academie/academie-home/academie-home.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ImmersiveCarouselComponent } from '../../shared/immersive-carousel/immersive-carousel.component';
import { ChordOfTheDayComponent } from '../components/chord-of-the-day.component';
 
@Component({
  selector: 'app-academie-home',
  imports: [RouterLink, ImmersiveCarouselComponent, ChordOfTheDayComponent],
  templateUrl: './academie-home.component.html',
  styleUrls: ['./academie-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademieHomeComponent {}